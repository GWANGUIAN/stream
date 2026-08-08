import type { ChatMessageEvent } from '@stream/chat'
import type { EventBus } from '@stream/events'

export type SentencePhase = 'idle' | 'collecting' | 'closed' | 'spinning' | 'revealed'

export type SectionId = 'who' | 'where' | 'how' | 'what' | 'why'

export interface SectionDef {
  id: SectionId
  label: string
  /** 채팅 커맨드 접두사. 기본 `!누가` 등. */
  prefix: string
}

export interface SentenceSettings {
  /** 닉네임당 같은 섹션에 여러 텍스트를 넣을 수 있는지. 기본 true. */
  allowMultiplePerSection: boolean
  /** 동일 문구 횟수로 가중 추첨할지. 기본 true. */
  weightByCount: boolean
  /** 텍스트 최대 글자 수. */
  maxTextLength: number
}

export interface EntryContributor {
  nickname: string
  at: number
}

/** 섹션 안 후보 하나. 동일 정규화 텍스트는 count로 합칩니다. */
export interface SentenceEntry {
  id: string
  text: string
  /** trim + lowercase 정규화 키. */
  key: string
  count: number
  contributors: EntryContributor[]
}

export interface SectionState {
  id: SectionId
  label: string
  prefix: string
  enabled: boolean
  entries: SentenceEntry[]
}

export interface SentenceFeedEntry {
  id: string
  sectionId: SectionId
  sectionLabel: string
  nickname: string
  text: string
  at: number
}

export interface SectionPick {
  sectionId: SectionId
  sectionLabel: string
  entryId: string
  text: string
}

export interface SentenceResult {
  picks: SectionPick[]
  sentence: string
  at: number
}

export interface SentenceHistoryEntry {
  id: string
  sentence: string
  picks: SectionPick[]
  at: number
}

export interface SentenceSnapshot {
  phase: SentencePhase
  title: string
  sections: SectionState[]
  settings: SentenceSettings
  durationSec: number
  startedAt: number | null
  endsAt: number | null
  /** 섹션별 현재 추첨 결과(진행 중이면 일부만 채워질 수 있음). */
  picks: Partial<Record<SectionId, SectionPick>>
  result: SentenceResult | null
  feed: SentenceFeedEntry[]
  history: SentenceHistoryEntry[]
  totalEntries: number
  updatedAt: number
}

export interface SentenceEngineOptions {
  title?: string
  settings?: Partial<SentenceSettings>
  durationSec?: number
  feedLimit?: number
  historyLimit?: number
  now?: () => number
  idFactory?: () => string
  random?: () => number
}

export const SECTION_ORDER: SectionId[] = ['who', 'where', 'how', 'what', 'why']

export const DEFAULT_SECTIONS: SectionDef[] = [
  { id: 'who', label: '누가', prefix: '!누가' },
  { id: 'where', label: '어디서', prefix: '!어디서' },
  { id: 'how', label: '어떻게', prefix: '!어떻게' },
  { id: 'what', label: '무엇을', prefix: '!무엇을' },
  { id: 'why', label: '왜', prefix: '!왜' },
]

const DEFAULT_SETTINGS: SentenceSettings = {
  allowMultiplePerSection: true,
  weightByCount: true,
  maxTextLength: 40,
}

export type SentenceListener = (snapshot: SentenceSnapshot) => void

let seq = 0
function defaultId(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

export function normalizeEntryKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * 가중치 배열에서 하나를 고릅니다. weights 합이 0이면 균등 추첨합니다.
 */
export function pickWeightedIndex(weights: number[], random: () => number = Math.random): number {
  if (weights.length === 0) return -1
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0)
  if (total <= 0) {
    return Math.min(weights.length - 1, Math.floor(random() * weights.length))
  }
  let cursor = random() * total
  for (let i = 0; i < weights.length; i += 1) {
    cursor -= Math.max(0, weights[i] ?? 0)
    if (cursor <= 0) return i
  }
  return weights.length - 1
}

/**
 * 방송용 5W 문장 룰렛 엔진 (`!누가 사슴이`).
 *
 * 조작 페이지가 소유하고, `onChange`로 스냅샷을 구독합니다.
 * 진행 상태는 idle → collecting → closed → spinning → revealed 순서로 흐릅니다.
 */
export class SentenceEngine {
  private title: string
  private sections: SectionState[]
  private settings: SentenceSettings
  private durationSec: number
  private phase: SentencePhase = 'idle'
  private startedAt: number | null = null
  private endsAt: number | null = null
  private picks: Partial<Record<SectionId, SectionPick>> = {}
  private result: SentenceResult | null = null
  private feed: SentenceFeedEntry[] = []
  private history: SentenceHistoryEntry[] = []

  /** 섹션별 닉네임 → 기여한 entry id 목록 (중복 투표 제어용). */
  private voterEntries = new Map<SectionId, Map<string, string[]>>()

  private readonly feedLimit: number
  private readonly historyLimit: number
  private readonly now: () => number
  private readonly idFactory: () => string
  private readonly random: () => number
  private readonly listeners = new Set<SentenceListener>()
  private detachBus: (() => void) | undefined

  constructor(options: SentenceEngineOptions = {}) {
    this.title = options.title?.trim() || '5W 문장 룰렛'
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings }
    this.durationSec = options.durationSec ?? 90
    this.feedLimit = options.feedLimit ?? 50
    this.historyLimit = options.historyLimit ?? 50
    this.now = options.now ?? Date.now
    this.idFactory = options.idFactory ?? (() => defaultId('id'))
    this.random = options.random ?? Math.random
    this.sections = DEFAULT_SECTIONS.map((def) => ({
      ...def,
      enabled: true,
      entries: [],
    }))
    for (const id of SECTION_ORDER) {
      this.voterEntries.set(id, new Map())
    }
  }

  // ---------------------------------------------------------------- config

  setTitle(title: string): void {
    const next = title.trim()
    if (!next || next === this.title) return
    this.title = next
    this.notify()
  }

  setDurationSec(sec: number): void {
    this.durationSec = Math.max(0, Math.round(sec))
    this.notify()
  }

  setAllowMultiplePerSection(value: boolean): void {
    this.settings = { ...this.settings, allowMultiplePerSection: value }
    this.notify()
  }

  setWeightByCount(value: boolean): void {
    this.settings = { ...this.settings, weightByCount: value }
    this.notify()
  }

  setMaxTextLength(value: number): void {
    this.settings = { ...this.settings, maxTextLength: Math.max(1, Math.round(value)) }
    this.notify()
  }

  setSectionEnabled(id: SectionId, enabled: boolean): void {
    const section = this.sections.find((s) => s.id === id)
    if (!section || section.enabled === enabled) return
    // 최소 1개 섹션은 켜 둡니다.
    if (!enabled && this.sections.filter((s) => s.enabled).length <= 1) return
    section.enabled = enabled
    if (!enabled) {
      delete this.picks[id]
      this.rebuildResultIfReady()
    }
    this.notify()
  }

  setSectionPrefix(id: SectionId, prefix: string): void {
    const section = this.sections.find((s) => s.id === id)
    if (!section) return
    const next = prefix.trim()
    if (!next || next === section.prefix) return
    section.prefix = next
    this.notify()
  }

  // ---------------------------------------------------------------- flow

  /** 텍스트 수집을 시작합니다. 활성 섹션이 없으면 false. */
  start(durationSec?: number): boolean {
    if (this.enabledSections().length === 0) return false

    if (durationSec != null) this.durationSec = Math.max(0, Math.round(durationSec))
    this.phase = 'collecting'
    this.startedAt = this.now()
    this.endsAt = this.durationSec > 0 ? this.startedAt + this.durationSec * 1000 : null
    this.clearEntries()
    this.picks = {}
    this.result = null
    this.feed = []
    this.notify()
    return true
  }

  extend(sec: number): void {
    if (this.phase !== 'collecting') return
    const base = this.endsAt ?? this.now()
    this.endsAt = base + sec * 1000
    this.notify()
  }

  /** 수집을 마감합니다. */
  close(): void {
    if (this.phase !== 'collecting') return
    if (this.syncTimer()) return
    this.phase = 'closed'
    this.endsAt = null
    this.notify()
  }

  /**
   * 한 섹션을 추첨합니다. collecting이면 먼저 마감합니다.
   * 후보가 없으면 false.
   */
  spinSection(id: SectionId): boolean {
    this.prepareForSpin()
    if (this.phase !== 'closed' && this.phase !== 'spinning' && this.phase !== 'revealed') {
      return false
    }

    const section = this.sections.find((s) => s.id === id)
    if (!section?.enabled || section.entries.length === 0) return false

    this.phase = 'spinning'
    const pick = this.pickFromSection(section)
    if (!pick) return false
    this.picks = { ...this.picks, [id]: pick }
    this.rebuildResultIfReady()
    this.notify()
    return true
  }

  /** 활성·후보 있는 섹션을 모두 추첨하고 revealed로 올립니다. */
  spinAll(): boolean {
    this.prepareForSpin()
    if (this.phase !== 'closed' && this.phase !== 'spinning' && this.phase !== 'revealed') {
      return false
    }

    const targets = this.enabledSections().filter((s) => s.entries.length > 0)
    if (targets.length === 0) return false

    this.phase = 'spinning'
    const nextPicks: Partial<Record<SectionId, SectionPick>> = { ...this.picks }
    for (const section of targets) {
      const pick = this.pickFromSection(section)
      if (pick) nextPicks[section.id] = pick
    }
    this.picks = nextPicks
    this.rebuildResultIfReady()
    this.notify()
    return true
  }

  /** 이미 뽑힌 picks로 문장·히스토리를 확정합니다. */
  reveal(): void {
    this.prepareForSpin()
    if (this.phase === 'idle' || this.phase === 'collecting') return

    const picks = this.orderedPicks()
    if (picks.length === 0) return

    this.commitReveal({ picks, sentence: picks.map((p) => p.text).join(' '), at: this.now() })
    this.notify()
  }

  /** 다음 라운드를 위해 진행 상태만 초기화합니다(섹션 on/off·접두사·설정 유지). */
  reset(): void {
    this.phase = 'idle'
    this.startedAt = null
    this.endsAt = null
    this.clearEntries()
    this.picks = {}
    this.result = null
    this.feed = []
    this.notify()
  }

  clearHistory(): void {
    if (this.history.length === 0) return
    this.history = []
    this.notify()
  }

  clearSection(id: SectionId): void {
    const section = this.sections.find((s) => s.id === id)
    if (!section) return
    section.entries = []
    this.voterEntries.get(id)?.clear()
    delete this.picks[id]
    this.rebuildResultIfReady()
    this.notify()
  }

  removeEntry(sectionId: SectionId, entryId: string): void {
    const section = this.sections.find((s) => s.id === sectionId)
    if (!section) return
    const before = section.entries.length
    section.entries = section.entries.filter((e) => e.id !== entryId)
    if (section.entries.length === before) return

    const voters = this.voterEntries.get(sectionId)
    if (voters) {
      for (const [nick, ids] of voters) {
        const filtered = ids.filter((id) => id !== entryId)
        if (filtered.length === 0) voters.delete(nick)
        else voters.set(nick, filtered)
      }
    }
    if (this.picks[sectionId]?.entryId === entryId) {
      delete this.picks[sectionId]
      this.rebuildResultIfReady()
    }
    this.notify()
  }

  getRemainingMs(): number | null {
    if (this.syncTimer()) this.notify()
    if (this.endsAt == null) return null
    return Math.max(0, this.endsAt - this.now())
  }

  private prepareForSpin(): void {
    this.syncTimer()
    if (this.phase === 'collecting') {
      this.phase = 'closed'
      this.endsAt = null
    }
  }

  private syncTimer(): boolean {
    if (this.phase === 'collecting' && this.endsAt != null && this.now() >= this.endsAt) {
      this.phase = 'closed'
      this.endsAt = null
      return true
    }
    return false
  }

  private clearEntries(): void {
    for (const section of this.sections) {
      section.entries = []
    }
    for (const map of this.voterEntries.values()) {
      map.clear()
    }
  }

  private enabledSections(): SectionState[] {
    return this.sections.filter((s) => s.enabled)
  }

  private pickFromSection(section: SectionState): SectionPick | undefined {
    if (section.entries.length === 0) return undefined
    const weights = section.entries.map((e) =>
      this.settings.weightByCount ? Math.max(1, e.count) : 1,
    )
    const index = pickWeightedIndex(weights, this.random)
    const entry = section.entries[index]
    if (!entry) return undefined
    return {
      sectionId: section.id,
      sectionLabel: section.label,
      entryId: entry.id,
      text: entry.text,
    }
  }

  private orderedPicks(): SectionPick[] {
    return this.enabledSections()
      .map((s) => this.picks[s.id])
      .filter((p): p is SectionPick => Boolean(p))
  }

  private rebuildResultIfReady(): void {
    const withEntries = this.enabledSections().filter((s) => s.entries.length > 0)
    const picks = this.orderedPicks()

    if (picks.length === 0) {
      this.result = null
      if (this.phase === 'revealed' || this.phase === 'spinning') {
        this.phase = 'closed'
      }
      return
    }

    const sentence = picks.map((p) => p.text).join(' ')
    const complete = withEntries.length > 0 && picks.length >= withEntries.length
    this.result = { picks, sentence, at: this.now() }

    if (complete) {
      this.commitReveal(this.result)
    } else if (this.phase !== 'revealed') {
      this.phase = 'spinning'
    }
  }

  private commitReveal(result: SentenceResult): void {
    this.phase = 'revealed'
    this.result = result
    const last = this.history[this.history.length - 1]
    if (last && last.sentence === result.sentence && Math.abs(last.at - result.at) < 2000) {
      return
    }
    this.history = [
      ...this.history.slice(-(this.historyLimit - 1)),
      {
        id: this.idFactory(),
        sentence: result.sentence,
        picks: [...result.picks],
        at: result.at,
      },
    ]
  }

  // ---------------------------------------------------------------- intake

  attachEventBus(bus: EventBus): () => void {
    this.detachBus?.()
    this.detachBus = bus.subscribe(
      (event) => {
        if (event.type === 'message') this.handleChatMessage(event)
      },
      { types: ['message'] },
    )
    return () => {
      this.detachBus?.()
      this.detachBus = undefined
    }
  }

  /** `!누가 사슴이` 형식의 채팅을 파싱합니다. 유효하면 true. */
  handleChatMessage(event: ChatMessageEvent): boolean {
    if (this.syncTimer()) this.notify()
    if (this.phase !== 'collecting') return false

    const text = event.text.trim()
    if (!text) return false

    const matched = this.matchSectionCommand(text)
    if (!matched) return false

    const nickname = event.user.nickname.trim()
    if (!nickname) return false

    return this.addEntry(matched.section.id, matched.body, nickname, event.at)
  }

  /** 수동 입력용. collecting / idle / closed 에서 허용. */
  injectEntry(sectionId: SectionId, text: string, nickname = '운영'): boolean {
    if (this.phase === 'spinning') return false
    const section = this.sections.find((s) => s.id === sectionId)
    if (!section?.enabled) return false
    const nick = nickname.trim() || '운영'
    return this.addEntry(sectionId, text, nick, this.now())
  }

  injectRehearsal(sectionId: SectionId, text: string, nickname: string): boolean {
    const section = this.sections.find((s) => s.id === sectionId)
    if (!section) return false
    return this.handleChatMessage({
      type: 'message',
      platform: 'soop',
      user: {
        platform: 'soop',
        id: `rehearsal-${nickname}`,
        nickname,
        role: 'viewer',
        badges: [],
      },
      text: `${section.prefix} ${text}`,
      emojis: {},
      at: this.now(),
    })
  }

  private matchSectionCommand(text: string): { section: SectionState; body: string } | undefined {
    // 긴 접두사 우선 (예: !어디서 vs !어)
    const enabled = this.enabledSections()
      .slice()
      .sort((a, b) => b.prefix.length - a.prefix.length)
    const lower = text.toLowerCase()
    for (const section of enabled) {
      const prefix = section.prefix.trim()
      if (!prefix) continue
      if (!lower.startsWith(prefix.toLowerCase())) continue
      const body = text.slice(prefix.length).trim()
      if (!body) return undefined
      return { section, body }
    }
    return undefined
  }

  private addEntry(sectionId: SectionId, rawText: string, nickname: string, at: number): boolean {
    const section = this.sections.find((s) => s.id === sectionId)
    if (!section?.enabled) return false

    let text = rawText.trim().replace(/\s+/g, ' ')
    if (!text) return false
    if (text.length > this.settings.maxTextLength) {
      text = text.slice(0, this.settings.maxTextLength)
    }
    const key = normalizeEntryKey(text)
    if (!key) return false

    const voters = this.voterEntries.get(sectionId) ?? new Map<string, string[]>()
    this.voterEntries.set(sectionId, voters)

    if (!this.settings.allowMultiplePerSection) {
      const previousIds = voters.get(nickname) ?? []
      for (const prevId of previousIds) {
        this.decrementOrRemoveEntry(section, prevId, nickname)
      }
      voters.set(nickname, [])
    }

    let entry = section.entries.find((e) => e.key === key)
    if (!entry) {
      entry = {
        id: this.idFactory(),
        text,
        key,
        count: 0,
        contributors: [],
      }
      section.entries = [...section.entries, entry]
    }
    entry.count += 1
    entry.contributors = [...entry.contributors.slice(-19), { nickname, at }]

    const list = voters.get(nickname) ?? []
    voters.set(nickname, [...list, entry.id])

    this.pushFeed(section, nickname, text, at)
    this.notify()
    return true
  }

  private decrementOrRemoveEntry(section: SectionState, entryId: string, nickname: string): void {
    const entry = section.entries.find((e) => e.id === entryId)
    if (!entry) return
    entry.count = Math.max(0, entry.count - 1)
    const idx = entry.contributors.findLastIndex((c) => c.nickname === nickname)
    if (idx >= 0) {
      entry.contributors = [
        ...entry.contributors.slice(0, idx),
        ...entry.contributors.slice(idx + 1),
      ]
    }
    if (entry.count <= 0) {
      section.entries = section.entries.filter((e) => e.id !== entryId)
    }
  }

  private pushFeed(section: SectionState, nickname: string, text: string, at: number): void {
    const entry: SentenceFeedEntry = {
      id: this.idFactory(),
      sectionId: section.id,
      sectionLabel: section.label,
      nickname,
      text,
      at,
    }
    this.feed = [...this.feed.slice(-(this.feedLimit - 1)), entry]
  }

  // ---------------------------------------------------------------- snapshot

  getSnapshot(): SentenceSnapshot {
    const sections = this.sections.map((s) => ({
      ...s,
      entries: s.entries.map((e) => ({
        ...e,
        contributors: [...e.contributors],
      })),
    }))
    const totalEntries = sections.reduce(
      (sum, s) => sum + s.entries.reduce((inner, e) => inner + e.count, 0),
      0,
    )

    return {
      phase: this.phase,
      title: this.title,
      sections,
      settings: { ...this.settings },
      durationSec: this.durationSec,
      startedAt: this.startedAt,
      endsAt: this.endsAt,
      picks: { ...this.picks },
      result: this.result ? { ...this.result, picks: [...this.result.picks] } : null,
      feed: [...this.feed],
      history: this.history.map((h) => ({ ...h, picks: [...h.picks] })),
      totalEntries,
      updatedAt: this.now(),
    }
  }

  loadSnapshot(snapshot: Partial<SentenceSnapshot>): void {
    if (snapshot.title) this.title = snapshot.title
    if (snapshot.settings) this.settings = { ...DEFAULT_SETTINGS, ...snapshot.settings }
    if (snapshot.durationSec != null) this.durationSec = snapshot.durationSec
    if (snapshot.phase) this.phase = snapshot.phase
    if (snapshot.startedAt !== undefined) this.startedAt = snapshot.startedAt
    if (snapshot.endsAt !== undefined) this.endsAt = snapshot.endsAt
    if (snapshot.feed) this.feed = [...snapshot.feed]
    if (snapshot.history) this.history = [...snapshot.history]
    if (snapshot.picks) this.picks = { ...snapshot.picks }
    if (snapshot.result) this.result = { ...snapshot.result, picks: [...snapshot.result.picks] }
    if (snapshot.sections) {
      this.sections = DEFAULT_SECTIONS.map((def) => {
        const saved = snapshot.sections?.find((s) => s.id === def.id)
        return {
          id: def.id,
          label: saved?.label ?? def.label,
          prefix: saved?.prefix ?? def.prefix,
          enabled: saved?.enabled ?? true,
          entries: (saved?.entries ?? []).map((e) => ({
            ...e,
            contributors: [...(e.contributors ?? [])],
          })),
        }
      })
      // voter map 재구성
      for (const id of SECTION_ORDER) {
        const map = new Map<string, string[]>()
        const section = this.sections.find((s) => s.id === id)
        if (section) {
          for (const entry of section.entries) {
            for (const c of entry.contributors) {
              const list = map.get(c.nickname) ?? []
              list.push(entry.id)
              map.set(c.nickname, list)
            }
          }
        }
        this.voterEntries.set(id, map)
      }
    }
    this.notify()
  }

  onChange(listener: SentenceListener): () => void {
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

export function createSentenceEngine(options?: SentenceEngineOptions): SentenceEngine {
  return new SentenceEngine(options)
}
