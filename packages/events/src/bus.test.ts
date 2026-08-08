import { describe, expect, it, vi } from 'vitest'
import { EventBus } from './bus'
import type { StreamEvent } from './types'

function message(text: string, platform: 'chzzk' | 'soop' = 'chzzk'): StreamEvent {
  return {
    type: 'message',
    platform,
    user: {
      platform,
      id: 'u1',
      nickname: 'nick',
      role: 'viewer',
      badges: [],
    },
    text,
    emojis: {},
    at: Date.now(),
  }
}

function donation(amount: number): StreamEvent {
  return {
    type: 'donation',
    platform: 'chzzk',
    user: {
      platform: 'chzzk',
      id: 'u2',
      nickname: 'donor',
      role: 'viewer',
      badges: [],
    },
    amount,
    currency: 'cheese',
    at: Date.now(),
  }
}

describe('EventBus', () => {
  it('팬아웃하고 필터를 적용합니다', () => {
    const bus = new EventBus()
    const all: StreamEvent[] = []
    const donations: StreamEvent[] = []

    bus.subscribe((e) => all.push(e))
    bus.subscribe((e) => donations.push(e), { types: ['donation'], minDonationAmount: 1000 })

    bus.emit(message('hi'))
    bus.emit(donation(500))
    bus.emit(donation(2000))

    expect(all).toHaveLength(3)
    expect(donations).toHaveLength(1)
    expect(donations[0]).toMatchObject({ type: 'donation', amount: 2000 })
  })

  it('키워드 필터와 dedupe를 적용합니다', () => {
    const bus = new EventBus({ dedupeWindowMs: 60_000 })
    const hits: StreamEvent[] = []
    bus.subscribe((e) => hits.push(e), { keywords: ['uptime'] })

    bus.emit(message('hello'))
    bus.emit(message('!uptime'))
    bus.emit(message('!uptime'))

    expect(hits).toHaveLength(1)
  })

  it('debounce로 마지막 이벤트만 전달합니다', async () => {
    vi.useFakeTimers()
    const bus = new EventBus()
    const hits: StreamEvent[] = []
    bus.subscribe((e) => hits.push(e), { debounceMs: 100 })

    bus.emit(message('a'))
    bus.emit(message('b'))
    expect(hits).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(100)
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ text: 'b' })
    vi.useRealTimers()
  })
})
