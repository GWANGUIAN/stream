import { EventBus } from '@stream/events'
import { describe, expect, it } from 'vitest'
import { AnalyticsAggregator } from './aggregator'

describe('AnalyticsAggregator', () => {
  it('메시지·후원을 집계합니다', () => {
    const bus = new EventBus()
    const analytics = new AnalyticsAggregator({ keywords: ['ㅋ'] })
    analytics.attachEventBus(bus)

    bus.emit({
      type: 'message',
      platform: 'chzzk',
      user: { platform: 'chzzk', id: '1', nickname: 'a', role: 'viewer', badges: [] },
      text: 'ㅋㅋ',
      emojis: {},
      at: Date.now(),
    })
    bus.emit({
      type: 'donation',
      platform: 'soop',
      user: { platform: 'soop', id: '2', nickname: 'b', role: 'viewer', badges: [] },
      amount: 1000,
      currency: 'star',
      at: Date.now(),
    })

    const snap = analytics.snapshot()
    expect(snap.messageCount).toBe(1)
    expect(snap.donationTotal).toBe(1000)
    expect(snap.activeUsers).toBe(2)
    expect(snap.keywordHits.ㅋ).toBe(1)
  })
})
