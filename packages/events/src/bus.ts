import type { ChatClient, ChatEvent } from '@stream/chat'
import { buildFilter, defaultDedupeKey } from './filter'
import type { EventBusOptions, StreamEvent, StreamEventHandler, SubscribeOptions } from './types'

interface Subscription {
  handler: StreamEventHandler
  filter: (event: StreamEvent) => boolean
  debounceMs: number
  timer?: ReturnType<typeof setTimeout>
  pending?: StreamEvent
}

/**
 * 채팅·라이브 등 정규화 이벤트를 여러 소비자에게 팬아웃합니다.
 *
 * overlay / bot / alerts / analytics가 같은 버스를 구독합니다.
 */
export class EventBus {
  private readonly subs = new Set<Subscription>()
  private readonly dedupeWindowMs: number
  private readonly dedupeKey: (event: StreamEvent) => string | undefined
  private readonly recent = new Map<string, number>()
  private readonly sources = new Set<() => void>()

  constructor(options: EventBusOptions = {}) {
    this.dedupeWindowMs = options.dedupeWindowMs ?? 0
    this.dedupeKey = options.dedupeKey ?? defaultDedupeKey
  }

  /** 이벤트를 발행합니다. dedupe 창에 걸리면 무시됩니다. */
  emit(event: StreamEvent): void {
    if (this.dedupeWindowMs > 0) {
      const key = this.dedupeKey(event)
      if (key) {
        const now = Date.now()
        const prev = this.recent.get(key)
        if (prev != null && now - prev < this.dedupeWindowMs) return
        this.recent.set(key, now)
        this.pruneRecent(now)
      }
    }

    for (const sub of this.subs) {
      if (!sub.filter(event)) continue
      if (sub.debounceMs > 0) {
        sub.pending = event
        if (sub.timer) clearTimeout(sub.timer)
        sub.timer = setTimeout(() => {
          const pending = sub.pending
          sub.pending = undefined
          sub.timer = undefined
          if (pending) this.safeCall(sub.handler, pending)
        }, sub.debounceMs)
        continue
      }
      this.safeCall(sub.handler, event)
    }
  }

  subscribe(handler: StreamEventHandler, options: SubscribeOptions = {}): () => void {
    const sub: Subscription = {
      handler,
      filter: buildFilter(options),
      debounceMs: options.debounceMs ?? 0,
    }
    this.subs.add(sub)
    return () => {
      if (sub.timer) clearTimeout(sub.timer)
      this.subs.delete(sub)
    }
  }

  /** ChatClient의 이벤트를 버스에 연결합니다. */
  attachChatClient(client: ChatClient): () => void {
    const off = client.on((event: ChatEvent) => this.emit(event))
    this.sources.add(off)
    return () => {
      off()
      this.sources.delete(off)
    }
  }

  /** 모든 구독·소스를 정리합니다. */
  clear(): void {
    for (const off of this.sources) off()
    this.sources.clear()
    for (const sub of this.subs) {
      if (sub.timer) clearTimeout(sub.timer)
    }
    this.subs.clear()
    this.recent.clear()
  }

  get subscriberCount(): number {
    return this.subs.size
  }

  private safeCall(handler: StreamEventHandler, event: StreamEvent): void {
    try {
      handler(event)
    } catch {
      // 구독자 에러가 버스를 죽이지 않게 합니다.
    }
  }

  private pruneRecent(now: number): void {
    if (this.recent.size < 256) return
    for (const [key, at] of this.recent) {
      if (now - at >= this.dedupeWindowMs) this.recent.delete(key)
    }
  }
}

export function createEventBus(options?: EventBusOptions): EventBus {
  return new EventBus(options)
}
