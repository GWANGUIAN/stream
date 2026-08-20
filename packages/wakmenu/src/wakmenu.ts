import type { ChatMessageEvent } from '@stream/chat'

export type WakmenuPhase = 'idle' | 'running' | 'closed' | 'revealed'

export interface MenuAnswer {
  id: string
  label: string
  aliases: string[]
  imageUrl?: string
  sourceUrl?: string
  license?: string
}

export interface Winner { viewerId: string; nickname: string; at: number; sequence: number }
export interface SubmissionFeedEntry { id: string; nickname: string; menuLabel: string; at: number }
export interface MenuResult { menu: MenuAnswer; winners: Winner[]; fastest: Winner[] }
export interface WakmenuHistory { id: string; startedAt: number; endedAt: number; results: MenuResult[] }
export interface WakmenuSnapshot {
  phase: WakmenuPhase; answers: MenuAnswer[]; durationSec: number; startedAt: number | null; endsAt: number | null
  allowMultipleAnswers: boolean; results: MenuResult[]; history: WakmenuHistory[]; acceptedMessages: number; feed: SubmissionFeedEntry[]
}

export interface WakmenuOptions { now?: () => number; idFactory?: () => string; historyLimit?: number }
export type WakmenuListener = (snapshot: WakmenuSnapshot) => void

function normalize(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, '') }
function makeId(): string { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }

/** Chat answer engine. It retains only valid participant records, never the room chat firehose. */
export class WakmenuEngine {
  private phase: WakmenuPhase = 'idle'
  private answers: MenuAnswer[] = []
  private durationSec = 30
  private startedAt: number | null = null
  private endsAt: number | null = null
  private allowMultipleAnswers = false
  private winners = new Map<string, Map<string, Winner>>()
  private history: WakmenuHistory[] = []
  private acceptedMessages = 0
  private feed: SubmissionFeedEntry[] = []
  private sequence = 0
  private readonly listeners = new Set<WakmenuListener>()
  private readonly now: () => number
  private readonly idFactory: () => string
  private readonly historyLimit: number

  constructor(options: WakmenuOptions = {}) { this.now = options.now ?? Date.now; this.idFactory = options.idFactory ?? makeId; this.historyLimit = options.historyLimit ?? 50 }
  setAnswers(answers: MenuAnswer[]): void { if (this.phase !== 'idle') return; this.answers = answers.map((a) => ({ ...a, aliases: [...a.aliases] })); this.notify() }
  setDurationSec(seconds: number): void { if (this.phase !== 'idle') return; this.durationSec = Math.max(5, Math.round(seconds) || 30); this.notify() }
  setAllowMultipleAnswers(value: boolean): void { if (this.phase !== 'idle') return; this.allowMultipleAnswers = value; this.notify() }
  start(): boolean { if (!this.answers.length) return false; this.phase = 'running'; this.startedAt = this.now(); this.endsAt = this.startedAt + this.durationSec * 1000; this.winners.clear(); this.acceptedMessages = 0; this.feed = []; this.sequence = 0; this.notify(); return true }
  close(): void { if (this.phase !== 'running') return; this.phase = 'closed'; this.endsAt = null; this.notify() }
  reveal(): void { if (this.phase === 'running') this.close(); if (this.phase !== 'closed') return; this.phase = 'revealed'; const results = this.results(); this.history = [...this.history.slice(-(this.historyLimit - 1)), { id: this.idFactory(), startedAt: this.startedAt ?? this.now(), endedAt: this.now(), results }]; this.notify() }
  reset(): void { this.phase = 'idle'; this.startedAt = null; this.endsAt = null; this.winners.clear(); this.acceptedMessages = 0; this.feed = []; this.notify() }
  clearHistory(): void { this.history = []; this.notify() }
  getRemainingMs(): number | null { if (this.phase === 'running' && this.endsAt != null && this.now() >= this.endsAt) this.close(); return this.endsAt == null ? null : Math.max(0, this.endsAt - this.now()) }
  handleMessage(event: ChatMessageEvent): boolean {
    this.getRemainingMs(); if (this.phase !== 'running') return false
    const match = event.text.trim().match(/^!밥\s+(.+)$/i); if (!match) return false
    const token = normalize(match[1] ?? ''); const menu = this.answers.find((answer) => [answer.label, ...answer.aliases].some((name) => normalize(name) === token)); if (!menu) return false
    const viewerId = event.user.id || event.user.nickname; const nickname = event.user.nickname.trim(); if (!viewerId || !nickname) return false
    if (!this.allowMultipleAnswers) for (const list of this.winners.values()) list.delete(viewerId)
    const list = this.winners.get(menu.id) ?? new Map<string, Winner>(); if (!list.has(viewerId)) { this.sequence += 1; list.set(viewerId, { viewerId, nickname, at: event.at, sequence: this.sequence }); this.winners.set(menu.id, list) }
    this.acceptedMessages += 1; this.feed = [...this.feed.slice(-9), { id: this.idFactory(), nickname, menuLabel: menu.label, at: event.at }]; this.notify(); return true
  }
  private results(): MenuResult[] { return this.answers.map((menu) => { const winners = [...(this.winners.get(menu.id)?.values() ?? [])].sort((a,b) => a.at - b.at || a.sequence - b.sequence); return { menu, winners, fastest: winners.slice(0, 5) } }) }
  getSnapshot(): WakmenuSnapshot { return { phase: this.phase, answers: this.answers.map((a) => ({ ...a, aliases: [...a.aliases] })), durationSec: this.durationSec, startedAt: this.startedAt, endsAt: this.endsAt, allowMultipleAnswers: this.allowMultipleAnswers, results: this.results(), history: this.history.map((entry) => ({ ...entry, results: entry.results.map((result) => ({ ...result, winners: [...result.winners], fastest: [...result.fastest] })) })), acceptedMessages: this.acceptedMessages, feed: [...this.feed] } }
  loadSnapshot(snapshot: Partial<WakmenuSnapshot>): void { if (snapshot.answers) this.answers = snapshot.answers; if (snapshot.durationSec) this.durationSec = snapshot.durationSec; if (snapshot.allowMultipleAnswers != null) this.allowMultipleAnswers = snapshot.allowMultipleAnswers; if (snapshot.history) this.history = snapshot.history; this.notify() }
  onChange(listener: WakmenuListener): () => void { this.listeners.add(listener); listener(this.getSnapshot()); return () => this.listeners.delete(listener) }
  private notify(): void { const snapshot = this.getSnapshot(); for (const listener of this.listeners) listener(snapshot) }
}
