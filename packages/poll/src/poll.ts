import type { ChatMessageEvent } from '@stream/chat'
import type { EventBus } from '@stream/events'

export type PollPhase = 'idle' | 'running' | 'closed' | 'revealed'

/** 투표 항목 하나. `aliases`의 첫 값은 항상 1부터 시작하는 번호이며 목록 순서가 바뀌면 자동 갱신됩니다. */
export interface PollOption {
  id: string
  label: string
  aliases: string[]
}

export interface PollSettings {
  /** 채팅 커맨드 접두사. 기본 `!투표`. */
  votePrefix: string
  /** 시청자에게 실시간 집계를 보여줄지(오버레이 기준). 기본 false — 결과 공개 전까지 비공개. */
  showLiveResults: boolean
  /** 닉네임당 중복 투표 허용 여부. 기본 false — 재투표 시 마지막 값으로 덮어씀. */
  allowMultipleVotes: boolean
}

interface VoteRecord {
  optionId: string
  nickname: string
  at: number
}

export interface PollOptionResult {
  id: string
  label: string
  votes: number
  percentage: number
  /** 동률이면 같은 순위를 공유합니다(1, 1, 3 방식). */
  rank: number
}

export interface PollFeedEntry {
  id: string
  nickname: string
  optionLabel: string
  at: number
}

export interface PollHistoryEntry {
  id: string
  title: string
  results: PollOptionResult[]
  totalVotes: number
  startedAt: number
  endedAt: number
}

export interface PollSnapshot {
  phase: PollPhase
  title: string
  options: PollOption[]
  settings: PollSettings
  durationSec: number
  startedAt: number | null
  endsAt: number | null
  totals: PollOptionResult[]
  totalVotes: number
  winnerIds: string[]
  feed: PollFeedEntry[]
  votes: Record<string, VoteRecord[]>
  history: PollHistoryEntry[]
  updatedAt: number
}

export interface PollEngineOptions {
  title?: string
  optionLabels?: string[]
  settings?: Partial<PollSettings>
  durationSec?: number
  feedLimit?: number
  historyLimit?: number
  now?: () => number
  idFactory?: () => string
}

export const MAX_POLL_OPTIONS = 100
export const DEFAULT_VOTE_PREFIX = '!투표'

const DEFAULT_SETTINGS: PollSettings = {
  votePrefix: DEFAULT_VOTE_PREFIX,
  showLiveResults: false,
  allowMultipleVotes: false,
}

export type PollListener = (snapshot: PollSnapshot) => void

let seq = 0
function defaultId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

/**
 * 방송용 채팅 투표 엔진 (`!투표 1`).
 *
 * 조작 페이지가 소유하고, `onChange`로 스냅샷을 구독합니다.
 * 진행 상태는 idle → running → closed → revealed 순서로 흐릅니다.
 */
export class PollEngine {
  private title: string
  private options: PollOption[]
  private settings: PollSettings
  private durationSec: number
  private phase: PollPhase = 'idle'
  private startedAt: number | null = null
  private endsAt: number | null = null
  private votesByVoter = new Map<string, VoteRecord[]>()
  /** Running per-option vote counts; kept in sync with `votesByVoter`. */
  private countsByOption = new Map<string, number>()
  private totalVoteCount = 0
  private feed: PollFeedEntry[] = []
  private history: PollHistoryEntry[] = []

  private readonly feedLimit: number
  private readonly historyLimit: number
  private readonly now: () => number
  private readonly idFactory: () => string
  private readonly listeners = new Set<PollListener>()
  private detachBus: (() => void) | undefined

  constructor(options: PollEngineOptions = {}) {
    this.title = options.title?.trim() || '실시간 투표'
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings }
    this.durationSec = options.durationSec ?? 60
    this.feedLimit = options.feedLimit ?? 8
    this.historyLimit = options.historyLimit ?? 50
    this.now = options.now ?? Date.now
    this.idFactory = options.idFactory ?? (() => defaultId('id'))
    this.options = this.buildOptions(options.optionLabels ?? ['찬성', '반대'])
  }

  // ---------------------------------------------------------------- config

  setTitle(title: string): void {
    const next = title.trim()
    if (!next || next === this.title) return
    this.title = next
    this.notify()
  }

  setVotePrefix(prefix: string): void {
    const next = prefix.trim()
    if (!next) return
    this.settings = { ...this.settings, votePrefix: next }
    this.notify()
  }

  setShowLiveResults(value: boolean): void {
    this.settings = { ...this.settings, showLiveResults: value }
    this.notify()
  }

  setAllowMultipleVotes(value: boolean): void {
    this.settings = { ...this.settings, allowMultipleVotes: value }
    this.notify()
  }

  setDurationSec(sec: number): void {
    this.durationSec = Math.max(0, Math.round(sec))
    this.notify()
  }

  // ---------------------------------------------------------------- options

  private buildOptions(labels: string[]): PollOption[] {
    return labels
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, MAX_POLL_OPTIONS)
      .map((label, index) => ({ id: this.idFactory(), label, aliases: [String(index + 1)] }))
  }

  private recomputeAliases(): void {
    this.options = this.options.map((option, index) => ({
      ...option,
      aliases: [String(index + 1)],
    }))
  }

  /** 템플릿/일괄 붙여넣기 등으로 옵션 전체를 새 라벨 목록으로 교체합니다. */
  setOptionsFromLabels(labels: string[]): void {
    this.options = this.buildOptions(labels)
    this.notify()
  }

  addOption(label: string): boolean {
    const trimmed = label.trim()
    if (!trimmed || this.options.length >= MAX_POLL_OPTIONS) return false
    this.options = [...this.options, { id: this.idFactory(), label: trimmed, aliases: [] }]
    this.recomputeAliases()
    this.notify()
    return true
  }

  removeOption(id: string): void {
    if (this.options.length <= 2) return
    this.options = this.options.filter((option) => option.id !== id)
    this.recomputeAliases()
    this.notify()
  }

  renameOption(id: string, label: string): void {
    const option = this.options.find((o) => o.id === id)
    if (!option) return
    const next = label.trim()
    if (!next || next === option.label) return
    option.label = next
    this.notify()
  }

  moveOption(id: string, direction: -1 | 1): void {
    const index = this.options.findIndex((o) => o.id === id)
    const target = index + direction
    if (index === -1 || target < 0 || target >= this.options.length) return
    const next = [...this.options]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    this.options = next
    this.recomputeAliases()
    this.notify()
  }

  // ---------------------------------------------------------------- flow

  /** 투표를 시작합니다. 옵션이 2개 미만이면 무시하고 false를 반환합니다. */
  start(durationSec?: number): boolean {
    const validOptions = this.options.filter((o) => o.label.trim())
    if (validOptions.length < 2) return false

    if (durationSec != null) this.durationSec = Math.max(0, Math.round(durationSec))
    this.phase = 'running'
    this.startedAt = this.now()
    this.endsAt = this.durationSec > 0 ? this.startedAt + this.durationSec * 1000 : null
    this.clearVotes()
    this.feed = []
    this.notify()
    return true
  }

  extend(sec: number): void {
    if (this.phase !== 'running') return
    const base = this.endsAt ?? this.now()
    this.endsAt = base + sec * 1000
    this.notify()
  }

  /** 접수를 마감합니다(아직 결과는 비공개). */
  close(): void {
    if (this.phase !== 'running') return
    if (this.syncTimer()) return
    this.phase = 'closed'
    this.endsAt = null
    this.notify()
  }

  /** 결과를 공개합니다. running 상태에서 바로 불러도 먼저 마감 처리합니다. */
  reveal(): void {
    this.syncTimer()
    if (this.phase === 'running') {
      this.phase = 'closed'
      this.endsAt = null
    }
    if (this.phase !== 'closed') return

    this.phase = 'revealed'
    const results = this.computeResults()
    this.history = [
      ...this.history.slice(-(this.historyLimit - 1)),
      {
        id: this.idFactory(),
        title: this.title,
        results,
        totalVotes: results.reduce((sum, r) => sum + r.votes, 0),
        startedAt: this.startedAt ?? this.now(),
        endedAt: this.now(),
      },
    ]
    this.notify()
  }

  /** 다음 투표를 위해 진행 상태만 초기화합니다(제목/옵션/설정은 유지). */
  reset(): void {
    this.phase = 'idle'
    this.startedAt = null
    this.endsAt = null
    this.clearVotes()
    this.feed = []
    this.notify()
  }

  clearHistory(): void {
    if (this.history.length === 0) return
    this.history = []
    this.notify()
  }

  getRemainingMs(): number | null {
    if (this.syncTimer()) this.notify()
    if (this.endsAt == null) return null
    return Math.max(0, this.endsAt - this.now())
  }

  /** 타이머가 만료되었으면 마감으로 전환합니다. 상태가 바뀌었으면 true. */
  private syncTimer(): boolean {
    if (this.phase === 'running' && this.endsAt != null && this.now() >= this.endsAt) {
      this.phase = 'closed'
      this.endsAt = null
      return true
    }
    return false
  }

  // ---------------------------------------------------------------- voting

  attachEventBus(bus: EventBus): () => void {
    this.detachBus?.()
    this.detachBus = bus.subscribe(
      (event) => {
        if (event.type === 'message') this.handleVoteMessage(event)
      },
      { types: ['message'] },
    )
    return () => {
      this.detachBus?.()
      this.detachBus = undefined
    }
  }

  /** `!투표 1` 형식의 채팅을 파싱합니다. 유효한 투표였으면 true. */
  handleVoteMessage(event: ChatMessageEvent): boolean {
    if (this.syncTimer()) this.notify()
    if (this.phase !== 'running') return false

    const prefix = this.settings.votePrefix.trim()
    if (!prefix) return false
    const text = event.text.trim()
    if (!text.toLowerCase().startsWith(prefix.toLowerCase())) return false

    const token = text.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase()
    if (!token) return false

    const option = this.options.find((o) =>
      o.aliases.some((alias) => alias.toLowerCase() === token),
    )
    if (!option) return false

    const nickname = event.user.nickname.trim()
    if (!nickname) return false

    const record: VoteRecord = { optionId: option.id, nickname, at: event.at }
    if (this.settings.allowMultipleVotes) {
      const list = this.votesByVoter.get(nickname) ?? []
      this.votesByVoter.set(nickname, [...list, record])
      this.adjustCount(option.id, 1)
    } else {
      const previous = this.votesByVoter.get(nickname)
      if (previous) {
        for (const old of previous) this.adjustCount(old.optionId, -1)
      }
      this.votesByVoter.set(nickname, [record])
      this.adjustCount(option.id, 1)
    }

    this.pushFeed(nickname, option.label)
    this.notify()
    return true
  }

  /** 리허설/테스트용: 실제 채팅 이벤트 없이 투표를 주입합니다. */
  injectRehearsalVote(nickname: string, optionId: string): boolean {
    return this.handleVoteMessage({
      type: 'message',
      platform: 'soop',
      user: {
        platform: 'soop',
        id: `rehearsal-${nickname}`,
        nickname,
        role: 'viewer',
        badges: [],
      },
      text: `${this.settings.votePrefix} ${this.options.find((o) => o.id === optionId)?.aliases[0] ?? ''}`,
      emojis: {},
      at: this.now(),
    })
  }

  private pushFeed(nickname: string, optionLabel: string): void {
    const entry: PollFeedEntry = { id: this.idFactory(), nickname, optionLabel, at: this.now() }
    this.feed = [...this.feed.slice(-(this.feedLimit - 1)), entry]
  }

  // ---------------------------------------------------------------- results

  private clearVotes(): void {
    this.votesByVoter.clear()
    this.countsByOption.clear()
    this.totalVoteCount = 0
  }

  private adjustCount(optionId: string, delta: number): void {
    if (delta === 0) return
    const current = this.countsByOption.get(optionId) ?? 0
    const next = Math.max(0, current + delta)
    const applied = next - current
    if (applied === 0) return
    if (next === 0) this.countsByOption.delete(optionId)
    else this.countsByOption.set(optionId, next)
    this.totalVoteCount = Math.max(0, this.totalVoteCount + applied)
  }

  private rebuildCountsFromVotes(): void {
    this.countsByOption.clear()
    this.totalVoteCount = 0
    for (const records of this.votesByVoter.values()) {
      for (const record of records) {
        this.adjustCount(record.optionId, 1)
      }
    }
  }

  private computeResults(): PollOptionResult[] {
    const rawTotals = this.options.map((option) => ({
      id: option.id,
      label: option.label,
      votes: this.countsByOption.get(option.id) ?? 0,
    }))

    const totalVotes = this.totalVoteCount
    const sorted = [...rawTotals].sort((a, b) => b.votes - a.votes)

    let rank = 0
    let lastVotes = -1
    const ranked = new Map<string, number>()
    sorted.forEach((entry, index) => {
      if (entry.votes !== lastVotes) {
        rank = index + 1
        lastVotes = entry.votes
      }
      ranked.set(entry.id, entry.votes > 0 ? rank : rawTotals.length)
    })

    return rawTotals.map((entry) => ({
      ...entry,
      percentage: totalVotes > 0 ? Math.round((entry.votes / totalVotes) * 1000) / 10 : 0,
      rank: ranked.get(entry.id) ?? rawTotals.length,
    }))
  }

  // ---------------------------------------------------------------- snapshot

  getSnapshot(): PollSnapshot {
    const totals = this.computeResults()
    const maxVotes = Math.max(0, ...totals.map((t) => t.votes))
    const winnerIds =
      maxVotes > 0 ? totals.filter((t) => t.votes === maxVotes).map((t) => t.id) : []

    return {
      phase: this.phase,
      title: this.title,
      options: this.options.map((option) => ({ ...option, aliases: [...option.aliases] })),
      settings: { ...this.settings },
      durationSec: this.durationSec,
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      totals,
      totalVotes: this.totalVoteCount,
      winnerIds,
      feed: [...this.feed],
      votes: Object.fromEntries(
        Array.from(this.votesByVoter.entries()).map(([nickname, records]) => [
          nickname,
          [...records],
        ]),
      ),
      history: [...this.history],
      updatedAt: this.now(),
    }
  }

  /** localStorage 등에서 복원한 스냅샷을 적용합니다. */
  loadSnapshot(snapshot: Partial<PollSnapshot>): void {
    if (snapshot.title) this.title = snapshot.title
    if (snapshot.options)
      this.options = snapshot.options.map((o) => ({ ...o, aliases: [...o.aliases] }))
    if (snapshot.settings) this.settings = { ...DEFAULT_SETTINGS, ...snapshot.settings }
    if (snapshot.durationSec != null) this.durationSec = snapshot.durationSec
    if (snapshot.phase) this.phase = snapshot.phase
    if (snapshot.startedAt !== undefined) this.startedAt = snapshot.startedAt
    if (snapshot.endsAt !== undefined) this.endsAt = snapshot.endsAt
    if (snapshot.feed) this.feed = [...snapshot.feed]
    if (snapshot.votes) {
      this.votesByVoter = new Map(Object.entries(snapshot.votes).map(([k, v]) => [k, [...v]]))
      this.rebuildCountsFromVotes()
    }
    if (snapshot.history) this.history = [...snapshot.history]
    this.notify()
  }

  onChange(listener: PollListener): () => void {
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

export function createPollEngine(options?: PollEngineOptions): PollEngine {
  return new PollEngine(options)
}

/**
 * 투표 참여자 중 가중 랜덤 추첨(예: 참여 시청자 대상 경품 추첨).
 */
export function pickGiveawayWinner(
  entries: Array<{ nickname: string; weight?: number }>,
  random: () => number = Math.random,
): { nickname: string } | undefined {
  if (entries.length === 0) return undefined
  const total = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0)
  let cursor = random() * total
  for (const entry of entries) {
    cursor -= entry.weight ?? 1
    if (cursor <= 0) return { nickname: entry.nickname }
  }
  return entries[entries.length - 1]
}
