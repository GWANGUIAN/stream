import type { ChatDonationEvent } from '@stream/chat'
import type { Platform } from '@stream/core'
import type { EventBus } from '@stream/events'
import {
  DEFAULT_DONATION_RULE,
  type DonationRule,
  REJECT_REASON_LABELS,
  resolveDonation,
} from './rules'
import { buildSegments, pickWeightedIndex, targetRotation } from './spin'
import { termsFor } from './terms'
import type {
  ItemSource,
  LogEntry,
  LogKind,
  RehearsalDonationInput,
  RouletteItem,
  RouletteSnapshot,
  SpinResult,
  TimerState,
  WeightMode,
  WinnerAction,
} from './types'

export type RouletteListener = (snapshot: RouletteSnapshot) => void

export interface RouletteEngineOptions {
  title?: string
  platform?: Platform
  streamerId?: string
  rule?: Partial<DonationRule>
  weightMode?: WeightMode
  winnerAction?: WinnerAction
  /** 로그 링버퍼 크기(떴다 사라지는 최근 로그). 기본 50. */
  logLimit?: number
  /** 전체 히스토리 보관 개수. 기본 500. */
  historyLimit?: number
  now?: () => number
  idFactory?: () => string
}

let seq = 0
function defaultId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

/**
 * 후원 랜덤 룰렛의 헤드리스 엔진.
 *
 * `EventBus`의 donation 이벤트를 구독해 아이템을 자동 등록하고,
 * 수동 편집/타이머/스핀/히스토리를 모두 관리합니다.
 * React 등 UI 레이어는 `onChange`로 스냅샷만 구독하면 됩니다.
 */
export class RouletteEngine {
  private title: string
  private platform: Platform
  private streamerId: string
  private items: RouletteItem[] = []
  private rule: DonationRule
  private timer: TimerState = { isOpen: false, openUntil: null }
  private weightMode: WeightMode
  private winnerAction: WinnerAction
  private log: LogEntry[] = []
  private history: LogEntry[] = []
  private lastResult: SpinResult | null = null

  private readonly logLimit: number
  private readonly historyLimit: number
  private readonly now: () => number
  private readonly idFactory: () => string
  private readonly listeners = new Set<RouletteListener>()
  private detachBus: (() => void) | undefined
  private undoStack: Array<() => void> = []

  constructor(options: RouletteEngineOptions = {}) {
    this.title = options.title ?? '오늘의 랜덤 룰렛'
    this.platform = options.platform ?? 'soop'
    this.streamerId = options.streamerId ?? ''
    this.rule = { ...DEFAULT_DONATION_RULE, ...options.rule }
    this.weightMode = options.weightMode ?? 'proportional'
    this.winnerAction = options.winnerAction ?? 'keep'
    this.logLimit = options.logLimit ?? 8
    this.historyLimit = options.historyLimit ?? 500
    this.now = options.now ?? Date.now
    this.idFactory = options.idFactory ?? (() => defaultId('id'))
  }

  // ---------------------------------------------------------------- config

  setTitle(title: string): void {
    const next = title.trim()
    if (!next || next === this.title) return
    this.title = next
    this.pushLog('system', `제목이 "${this.title}"로 변경되었습니다.`)
    this.notify()
  }

  setSource(platform: Platform, streamerId: string): void {
    this.platform = platform
    this.streamerId = streamerId.trim()
    this.notify()
  }

  setRule(patch: Partial<DonationRule>): void {
    this.rule = { ...this.rule, ...patch }
    this.notify()
  }

  setWeightMode(mode: WeightMode): void {
    this.weightMode = mode
    this.notify()
  }

  setWinnerAction(action: WinnerAction): void {
    this.winnerAction = action
    this.notify()
  }

  // ---------------------------------------------------------------- timer

  /** 접수를 시작합니다. durationMs가 없으면 수동 마감 전까지 무제한. */
  openRegistration(durationMs?: number): void {
    this.timer = {
      isOpen: true,
      openUntil: durationMs != null && durationMs > 0 ? this.now() + durationMs : null,
    }
    this.pushLog(
      'system',
      durationMs != null && durationMs > 0
        ? `접수를 시작했습니다 (${Math.round(durationMs / 1000)}초)`
        : '접수를 시작했습니다 (무제한)',
    )
    this.notify()
  }

  extendRegistration(ms: number): void {
    const base = this.timer.openUntil ?? this.now()
    this.timer = { isOpen: true, openUntil: base + ms }
    this.pushLog('system', `접수 시간이 ${Math.round(ms / 1000)}초 연장되었습니다.`)
    this.notify()
  }

  closeRegistration(): void {
    if (!this.timer.isOpen) return
    this.timer = { isOpen: false, openUntil: null }
    this.pushLog('system', '접수를 마감했습니다.')
    this.notify()
  }

  isRegistrationOpen(): boolean {
    if (this.syncTimer()) this.notify()
    return this.timer.isOpen
  }

  getRemainingMs(): number | null {
    if (this.syncTimer()) this.notify()
    if (this.timer.openUntil == null) return null
    return Math.max(0, this.timer.openUntil - this.now())
  }

  /** 타이머가 만료되었으면 접수를 마감합니다. 상태가 바뀌었으면 true를 반환합니다. */
  private syncTimer(): boolean {
    if (this.timer.isOpen && this.timer.openUntil != null && this.now() >= this.timer.openUntil) {
      this.timer = { isOpen: false, openUntil: null }
      this.pushLog('system', '접수 시간이 종료되어 마감되었습니다.')
      return true
    }
    return false
  }

  // ---------------------------------------------------------------- items

  addItem(label: string, count = 1): RouletteItem {
    const { item, isNew } = this.upsertItem(label, count, 'manual')
    if (isNew) {
      this.pushUndo(() => this.removeItemSilently(item.id))
    } else {
      this.pushUndo(() => this.adjustCountSilently(item.id, -count))
    }
    this.pushLog('manual', `"${item.label}" ${count}개를 수동으로 추가했습니다.`)
    this.pushHistory('manual', `수동 추가: ${item.label} +${count}`)
    this.notify()
    return item
  }

  /** 줄바꿈으로 구분된 텍스트를 한꺼번에 등록합니다. "라벨 x3" 형태로 개수 지정 가능. */
  addItemsFromText(bulkText: string): number {
    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const changes: Array<{ id: string; isNew: boolean; count: number }> = []

    for (const line of lines) {
      const match = line.match(/^(.*?)(?:\s*[xX*]\s*(\d+))?$/)
      const label = (match?.[1] ?? line).trim()
      const rawCount = match?.[2] ? Number(match[2]) : 1
      if (!label) continue
      const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 1
      const { item, isNew } = this.upsertItem(label, count, 'manual')
      changes.push({ id: item.id, isNew, count })
    }

    if (changes.length > 0) {
      this.pushUndo(() => {
        for (const change of [...changes].reverse()) {
          if (change.isNew) this.removeItemSilently(change.id)
          else this.adjustCountSilently(change.id, -change.count)
        }
      })
      this.pushLog('manual', `${lines.length}줄을 일괄 등록했습니다.`)
      this.pushHistory('manual', `일괄 등록: ${lines.length}줄`)
      this.notify()
    }
    return lines.length
  }

  renameItem(id: string, label: string): void {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    const next = label.trim()
    if (!next || next === item.label) return
    const prev = item.label
    item.label = next
    item.updatedAt = this.now()
    this.pushLog('manual', `"${prev}"를 "${item.label}"로 수정했습니다.`)
    this.notify()
  }

  setItemCount(id: string, count: number): void {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    item.count = Math.max(0, Math.round(count))
    item.updatedAt = this.now()
    this.notify()
  }

  removeItem(id: string): void {
    const index = this.items.findIndex((i) => i.id === id)
    if (index === -1) return
    const removed = this.items[index]
    if (!removed) return
    this.items = this.items.filter((i) => i.id !== id)
    this.pushUndo(() => {
      this.items = [...this.items.slice(0, index), removed, ...this.items.slice(index)]
      this.notify()
    })
    this.pushLog('manual', `"${removed.label}"를 삭제했습니다.`)
    this.pushHistory('manual', `삭제: ${removed.label}`)
    this.notify()
  }

  clearItems(): void {
    if (this.items.length === 0) return
    this.items = []
    this.undoStack = []
    this.pushLog('system', '아이템 목록을 초기화했습니다.')
    this.pushHistory('system', '아이템 전체 초기화')
    this.notify()
  }

  /** 아이템·접수 상태·직전 결과를 모두 초기화합니다(설정/룰은 유지). */
  resetAll(): void {
    this.items = []
    this.undoStack = []
    this.timer = { isOpen: false, openUntil: null }
    this.lastResult = null
    this.log = []
    this.pushHistory('system', '전체 리셋(아이템/접수/결과)')
    this.notify()
  }

  /** 마지막 수동 추가/삭제/도네 등록을 취소합니다. */
  undo(): boolean {
    const action = this.undoStack.pop()
    if (!action) return false
    action()
    this.pushLog('system', '마지막 작업을 취소했습니다.')
    this.notify()
    return true
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  private pushUndo(action: () => void): void {
    this.undoStack.push(action)
    if (this.undoStack.length > 20) this.undoStack.shift()
  }

  private removeItemSilently(id: string): void {
    this.items = this.items.filter((i) => i.id !== id)
  }

  private adjustCountSilently(id: string, delta: number): void {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    item.count = Math.max(0, item.count + delta)
    item.updatedAt = this.now()
  }

  private upsertItem(
    label: string,
    count: number,
    source: ItemSource,
    contributor?: string,
  ): { item: RouletteItem; isNew: boolean } {
    const trimmed = label.trim()
    const key = this.rule.normalize ? trimmed.toLowerCase() : trimmed
    const existing = this.items.find(
      (item) => (this.rule.normalize ? item.label.toLowerCase() : item.label) === key,
    )

    if (existing) {
      existing.count += count
      existing.updatedAt = this.now()
      if (contributor && !existing.contributors.includes(contributor)) {
        existing.contributors.push(contributor)
      }
      return { item: existing, isNew: false }
    }

    const item: RouletteItem = {
      id: this.idFactory(),
      label: trimmed,
      count,
      source,
      contributors: contributor ? [contributor] : [],
      createdAt: this.now(),
      updatedAt: this.now(),
    }
    this.items.push(item)
    return { item, isNew: true }
  }

  // ---------------------------------------------------------------- donation ingestion

  /** EventBus의 donation 이벤트를 구독해 자동 등록합니다. */
  attachEventBus(bus: EventBus): () => void {
    this.detachBus?.()
    this.detachBus = bus.subscribe(
      (event) => {
        if (event.type === 'donation') this.registerDonation(event)
      },
      { types: ['donation'] },
    )
    return () => {
      this.detachBus?.()
      this.detachBus = undefined
    }
  }

  registerDonation(event: ChatDonationEvent): void {
    this.syncTimer()
    const outcome = resolveDonation(event, this.rule, this.timer.isOpen)
    const terms = termsFor(event.platform)

    if (!outcome.ok) {
      const reasonText = REJECT_REASON_LABELS[outcome.reason]
      this.pushLog(
        'rejected',
        `${event.user.nickname}님의 ${terms.currency} ${event.amount}${terms.unit} 후원이 반영되지 않았습니다. (${reasonText})`,
        event.platform,
        event.user.nickname,
      )
      this.pushHistory(
        'rejected',
        `${event.user.nickname} ${terms.currency} ${event.amount} → 거절(${reasonText})`,
        event.platform,
        event.user.nickname,
      )
      this.notify()
      return
    }

    const { item, isNew } = this.upsertItem(
      outcome.label,
      outcome.count,
      'donation',
      event.user.nickname,
    )
    if (isNew) {
      this.pushUndo(() => this.removeItemSilently(item.id))
    } else {
      this.pushUndo(() => this.adjustCountSilently(item.id, -outcome.count))
    }
    const remainderText = outcome.remainder > 0 ? ` (잔여 ${outcome.remainder}${terms.unit})` : ''
    const message = `${event.user.nickname}님이 ${terms.currency} ${event.amount}${terms.unit} 쏴서 "${item.label}" ${outcome.count}개 등록${remainderText}`

    this.pushLog('registered', message, event.platform, event.user.nickname)
    this.pushHistory('registered', message, event.platform, event.user.nickname)
    this.notify()
  }

  /** 방송 전 리허설용 가짜 도네 주입. 실제 이벤트와 동일한 경로(rule 검증 포함)를 탑니다. */
  injectRehearsalDonation(input: RehearsalDonationInput): void {
    const fake: ChatDonationEvent = {
      type: 'donation',
      platform: this.platform,
      user: {
        platform: this.platform,
        id: `rehearsal-${input.nickname}`,
        nickname: input.nickname,
        role: 'viewer',
        badges: [],
      },
      amount: input.amount,
      currency: this.platform === 'soop' ? 'balloon' : 'cheese',
      text: input.text,
      at: this.now(),
    }
    this.registerDonation(fake)
  }

  // ---------------------------------------------------------------- spin

  spin(random: () => number = Math.random): SpinResult | undefined {
    if (this.items.length === 0) return undefined

    const segments = buildSegments(this.items, this.weightMode)
    const weights = segments.map((segment) => segment.weight)
    const index = pickWeightedIndex(weights, random)
    const winnerSegment = segments[index]
    if (!winnerSegment) return undefined

    const rotation = targetRotation(segments, winnerSegment.itemId, {
      random,
      currentRotation: this.lastResult?.rotation ?? 0,
    })

    const result: SpinResult = {
      itemId: winnerSegment.itemId,
      label: winnerSegment.label,
      rotation,
      segments,
      at: this.now(),
    }

    this.lastResult = result
    // 당첨 결과는 스핀 애니메이션이 끝나기 전에 토스트로 노출되면 스포일러가 되므로
    // 실시간 로그에는 남기지 않습니다. 히스토리·결과 배너로만 확인합니다.
    this.pushHistory('spin', `당첨: ${winnerSegment.label}`)
    this.applyWinnerAction(winnerSegment.itemId)
    this.notify()
    return result
  }

  private applyWinnerAction(itemId: string): void {
    if (this.winnerAction === 'keep') return

    if (this.winnerAction === 'remove') {
      this.items = this.items.filter((item) => item.id !== itemId)
      return
    }

    const item = this.items.find((i) => i.id === itemId)
    if (!item) return
    item.count = Math.max(0, item.count - 1)
    if (item.count === 0) {
      this.items = this.items.filter((i) => i.id !== itemId)
    }
  }

  // ---------------------------------------------------------------- log / history

  private pushLog(kind: LogKind, message: string, platform?: Platform, nickname?: string): void {
    const entry: LogEntry = {
      id: this.idFactory(),
      kind,
      message,
      platform,
      nickname,
      at: this.now(),
    }
    this.log = [...this.log.slice(-(this.logLimit - 1)), entry]
  }

  private pushHistory(
    kind: LogKind,
    message: string,
    platform?: Platform,
    nickname?: string,
  ): void {
    const entry: LogEntry = {
      id: this.idFactory(),
      kind,
      message,
      platform,
      nickname,
      at: this.now(),
    }
    this.history = [...this.history.slice(-(this.historyLimit - 1)), entry]
  }

  clearHistory(): void {
    if (this.history.length === 0) return
    this.history = []
    this.notify()
  }

  // ---------------------------------------------------------------- snapshot / listeners

  getSnapshot(): RouletteSnapshot {
    return {
      title: this.title,
      platform: this.platform,
      streamerId: this.streamerId,
      items: this.items.map((item) => ({ ...item, contributors: [...item.contributors] })),
      rule: { ...this.rule },
      timer: { ...this.timer },
      weightMode: this.weightMode,
      winnerAction: this.winnerAction,
      log: [...this.log],
      history: [...this.history],
      lastResult: this.lastResult,
      updatedAt: this.now(),
    }
  }

  /** localStorage 등에서 복원한 스냅샷을 적용합니다. */
  loadSnapshot(snapshot: Partial<RouletteSnapshot>): void {
    if (snapshot.title) this.title = snapshot.title
    if (snapshot.platform) this.platform = snapshot.platform
    if (snapshot.streamerId != null) this.streamerId = snapshot.streamerId
    if (snapshot.items) {
      this.items = snapshot.items.map((item) => ({ ...item, contributors: [...item.contributors] }))
    }
    if (snapshot.rule) this.rule = { ...DEFAULT_DONATION_RULE, ...snapshot.rule }
    if (snapshot.timer) this.timer = { ...snapshot.timer }
    if (snapshot.weightMode) this.weightMode = snapshot.weightMode
    if (snapshot.winnerAction) this.winnerAction = snapshot.winnerAction
    if (snapshot.log) this.log = [...snapshot.log]
    if (snapshot.history) this.history = [...snapshot.history]
    if (snapshot.lastResult !== undefined) this.lastResult = snapshot.lastResult
    this.notify()
  }

  onChange(listener: RouletteListener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  dispose(): void {
    this.detachBus?.()
    this.listeners.clear()
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch {
        // 구독자 에러가 엔진을 죽이지 않게 합니다.
      }
    }
  }
}

export function createRouletteEngine(options?: RouletteEngineOptions): RouletteEngine {
  return new RouletteEngine(options)
}
