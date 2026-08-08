import type { Platform } from '@stream/core'
import type { EventBus } from '@stream/events'

export interface AnalyticsSnapshot {
  messageCount: number
  donationTotal: number
  donationCount: number
  subscriptionCount: number
  activeUsers: number
  chatPerMinute: number
  keywordHits: Record<string, number>
  byPlatform: Partial<Record<Platform, { messages: number; donations: number }>>
}

export interface AnalyticsOptions {
  keywords?: string[]
  /** chatPerMinute 계산 창(ms). 기본 60s */
  windowMs?: number
  now?: () => number
}

/**
 * 이벤트 스트림 집계기. 대시보드/OBS 숫자 위젯용 스냅샷을 제공합니다.
 * 영속화는 @stream/session 등에 위임하세요.
 */
export class AnalyticsAggregator {
  private readonly keywords: string[]
  private readonly windowMs: number
  private readonly now: () => number
  private readonly messageTimes: number[] = []
  private readonly users = new Set<string>()
  private readonly keywordHits: Record<string, number> = {}
  private readonly byPlatform: AnalyticsSnapshot['byPlatform'] = {}
  private messageCount = 0
  private donationTotal = 0
  private donationCount = 0
  private subscriptionCount = 0
  private detach: (() => void) | undefined

  constructor(options: AnalyticsOptions = {}) {
    this.keywords = (options.keywords ?? []).map((k) => k.toLowerCase())
    this.windowMs = options.windowMs ?? 60_000
    this.now = options.now ?? Date.now
    for (const key of this.keywords) this.keywordHits[key] = 0
  }

  attachEventBus(bus: EventBus): () => void {
    this.detach?.()
    this.detach = bus.subscribe((event) => {
      if (event.type === 'message') {
        this.messageCount += 1
        this.messageTimes.push(event.at)
        this.users.add(`${event.platform}:${event.user.id}`)
        const bucket = this.platformBucket(event.platform)
        bucket.messages += 1
        const lower = event.text.toLowerCase()
        for (const key of this.keywords) {
          if (lower.includes(key)) this.keywordHits[key] = (this.keywordHits[key] ?? 0) + 1
        }
      } else if (event.type === 'donation') {
        this.donationCount += 1
        this.donationTotal += event.amount
        this.users.add(`${event.platform}:${event.user.id}`)
        this.platformBucket(event.platform).donations += event.amount
      } else if (event.type === 'subscription') {
        this.subscriptionCount += 1
        this.users.add(`${event.platform}:${event.user.id}`)
      }
    })
    return () => {
      this.detach?.()
      this.detach = undefined
    }
  }

  snapshot(): AnalyticsSnapshot {
    const now = this.now()
    while (this.messageTimes.length > 0 && now - (this.messageTimes[0] ?? 0) > this.windowMs) {
      this.messageTimes.shift()
    }
    const chatPerMinute = (this.messageTimes.length / this.windowMs) * 60_000
    return {
      messageCount: this.messageCount,
      donationTotal: this.donationTotal,
      donationCount: this.donationCount,
      subscriptionCount: this.subscriptionCount,
      activeUsers: this.users.size,
      chatPerMinute,
      keywordHits: { ...this.keywordHits },
      byPlatform: structuredClone(this.byPlatform),
    }
  }

  reset(): void {
    this.messageCount = 0
    this.donationTotal = 0
    this.donationCount = 0
    this.subscriptionCount = 0
    this.messageTimes.length = 0
    this.users.clear()
    for (const key of Object.keys(this.keywordHits)) this.keywordHits[key] = 0
    for (const key of Object.keys(this.byPlatform)) delete this.byPlatform[key as Platform]
  }

  dispose(): void {
    this.detach?.()
  }

  private platformBucket(platform: Platform): { messages: number; donations: number } {
    const existing = this.byPlatform[platform]
    if (existing) return existing
    const created = { messages: 0, donations: 0 }
    this.byPlatform[platform] = created
    return created
  }
}

export function createAnalyticsAggregator(options?: AnalyticsOptions): AnalyticsAggregator {
  return new AnalyticsAggregator(options)
}
