import type { ChatMessageEvent } from '@stream/chat'
import type { EventBus } from '@stream/events'

export interface PollOption {
  id: string
  label: string
  /** `!vote a` 에서 a */
  aliases: string[]
}

export interface PollConfig {
  id: string
  title: string
  options: PollOption[]
  /** 기본 true — 유저당 1표 */
  uniqueVoters?: boolean
  /** 후원 금액으로 가중치. (amount) => weight */
  donationWeight?: (amount: number) => number
}

export interface PollResult {
  id: string
  title: string
  open: boolean
  totals: Array<{ id: string; label: string; votes: number }>
  winnerIds: string[]
}

/**
 * 채팅 투표 엔진 (`!vote a`).
 */
export class PollEngine {
  private config: PollConfig | null = null
  private open = false
  private readonly votes = new Map<string, { optionId: string; weight: number }>()
  private readonly donationBonus = new Map<string, number>()
  private detach: (() => void) | undefined

  start(config: PollConfig): void {
    this.config = config
    this.open = true
    this.votes.clear()
    this.donationBonus.clear()
  }

  close(): PollResult {
    this.open = false
    return this.getResult()
  }

  isOpen(): boolean {
    return this.open && this.config != null
  }

  attachEventBus(bus: EventBus, votePrefix = '!vote'): () => void {
    this.detach?.()
    this.detach = bus.subscribe((event) => {
      if (event.type === 'donation') {
        const bonus = this.config?.donationWeight?.(event.amount) ?? 0
        if (bonus > 0) {
          const prev = this.donationBonus.get(event.user.id) ?? 0
          this.donationBonus.set(event.user.id, prev + bonus)
        }
        return
      }
      if (event.type === 'message') {
        this.handleVoteMessage(event, votePrefix)
      }
    })
    return () => {
      this.detach?.()
      this.detach = undefined
    }
  }

  handleVoteMessage(event: ChatMessageEvent, votePrefix = '!vote'): boolean {
    if (!this.open || !this.config) return false
    const text = event.text.trim()
    if (!text.toLowerCase().startsWith(votePrefix.toLowerCase())) return false
    const token = text.slice(votePrefix.length).trim().split(/\s+/)[0]?.toLowerCase()
    if (!token) return false

    const option = this.config.options.find((o) => o.aliases.some((a) => a.toLowerCase() === token))
    if (!option) return false

    const unique = this.config.uniqueVoters ?? true
    if (unique && this.votes.has(event.user.id)) return false

    const weight = 1 + (this.donationBonus.get(event.user.id) ?? 0)
    this.votes.set(event.user.id, { optionId: option.id, weight })
    return true
  }

  getResult(): PollResult {
    const config = this.config
    if (!config) {
      return { id: '', title: '', open: false, totals: [], winnerIds: [] }
    }

    const totals = config.options.map((option) => {
      let votes = 0
      for (const vote of this.votes.values()) {
        if (vote.optionId === option.id) votes += vote.weight
      }
      return { id: option.id, label: option.label, votes }
    })

    const max = Math.max(0, ...totals.map((t) => t.votes))
    const winnerIds = max > 0 ? totals.filter((t) => t.votes === max).map((t) => t.id) : []

    return {
      id: config.id,
      title: config.title,
      open: this.open,
      totals,
      winnerIds,
    }
  }

  dispose(): void {
    this.detach?.()
    this.open = false
  }
}

/**
 * 단순 추첨. userId 목록에서 가중 랜덤 1명.
 */
export function pickGiveawayWinner(
  entries: Array<{ userId: string; nickname: string; weight?: number }>,
  random: () => number = Math.random,
): { userId: string; nickname: string } | undefined {
  if (entries.length === 0) return undefined
  const total = entries.reduce((sum, e) => sum + (e.weight ?? 1), 0)
  let cursor = random() * total
  for (const entry of entries) {
    cursor -= entry.weight ?? 1
    if (cursor <= 0) return { userId: entry.userId, nickname: entry.nickname }
  }
  return entries[entries.length - 1]
}

export function createPollEngine(): PollEngine {
  return new PollEngine()
}
