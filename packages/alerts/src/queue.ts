import type { ChatDonationEvent, ChatSubscriptionEvent } from '@stream/chat'
import type { EventBus } from '@stream/events'
import type { AlertItem, AlertQueueListener, AlertQueueOptions } from './types'

let seq = 0

function defaultId(): string {
  seq += 1
  return `alert-${Date.now()}-${seq}`
}

/**
 * 도네이션/구독 알림 우선순위 큐.
 * 동시 알림을 막고 최소 표시 시간을 보장합니다.
 */
export class AlertQueue {
  private readonly queue: AlertItem[] = []
  private readonly listeners = new Set<AlertQueueListener>()
  private readonly exclusive: boolean
  private readonly defaultDonationDurationMs: number
  private readonly defaultSubscriptionDurationMs: number
  private readonly minDonationAmount: number
  private readonly donationPriority: (event: ChatDonationEvent) => number
  private readonly now: () => number
  private readonly idFactory: () => string
  private current: AlertItem | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private detachBus: (() => void) | undefined

  constructor(options: AlertQueueOptions = {}) {
    this.exclusive = options.exclusive ?? true
    this.defaultDonationDurationMs = options.defaultDonationDurationMs ?? 5000
    this.defaultSubscriptionDurationMs = options.defaultSubscriptionDurationMs ?? 4000
    this.minDonationAmount = options.minDonationAmount ?? 0
    this.donationPriority = options.donationPriority ?? ((e) => e.amount)
    this.now = options.now ?? Date.now
    this.idFactory = options.idFactory ?? defaultId
  }

  get currentAlert(): AlertItem | null {
    return this.current
  }

  get pendingCount(): number {
    return this.queue.length
  }

  onChange(listener: AlertQueueListener): () => void {
    this.listeners.add(listener)
    listener(this.current)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** EventBus의 donation/subscription을 자동 enqueue. */
  attachEventBus(bus: EventBus): () => void {
    this.detachBus?.()
    this.detachBus = bus.subscribe(
      (event) => {
        if (event.type === 'donation') this.enqueueDonation(event)
        else if (event.type === 'subscription') this.enqueueSubscription(event)
      },
      { types: ['donation', 'subscription'] },
    )
    return () => {
      this.detachBus?.()
      this.detachBus = undefined
    }
  }

  enqueueDonation(event: ChatDonationEvent): AlertItem | null {
    if (event.amount < this.minDonationAmount) return null
    const item: AlertItem = {
      id: this.idFactory(),
      kind: 'donation',
      platform: event.platform,
      title: event.user.nickname,
      subtitle: event.text,
      amount: event.amount,
      currency: event.currency,
      priority: this.donationPriority(event),
      durationMs: this.defaultDonationDurationMs,
      createdAt: this.now(),
      speakText: `${event.user.nickname}님 ${event.amount}${event.currency} 후원`,
      raw: event,
    }
    this.enqueue(item)
    return item
  }

  enqueueSubscription(event: ChatSubscriptionEvent): AlertItem {
    const item: AlertItem = {
      id: this.idFactory(),
      kind: 'subscription',
      platform: event.platform,
      title: event.user.nickname,
      subtitle: `${event.months}개월 구독`,
      priority: 50 + event.months,
      durationMs: this.defaultSubscriptionDurationMs,
      createdAt: this.now(),
      speakText: `${event.user.nickname}님 ${event.months}개월 구독`,
      raw: event,
    }
    this.enqueue(item)
    return item
  }

  enqueue(item: AlertItem): void {
    this.queue.push(item)
    this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt)
    this.pump()
  }

  enqueueCustom(
    partial: Omit<AlertItem, 'id' | 'createdAt' | 'kind'> & { kind?: 'custom' },
  ): AlertItem {
    const item: AlertItem = {
      ...partial,
      kind: 'custom',
      id: this.idFactory(),
      createdAt: this.now(),
    }
    this.enqueue(item)
    return item
  }

  clear(): void {
    this.queue.length = 0
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    this.current = null
    this.notify()
  }

  dispose(): void {
    this.detachBus?.()
    this.clear()
    this.listeners.clear()
  }

  private pump(): void {
    if (this.current && this.exclusive) return
    const next = this.queue.shift()
    if (!next) return
    this.current = next
    this.notify()
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.current = null
      this.timer = undefined
      this.notify()
      this.pump()
    }, next.durationMs)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.current)
      } catch {
        // ignore
      }
    }
  }
}

export function createAlertQueue(options?: AlertQueueOptions): AlertQueue {
  return new AlertQueue(options)
}
