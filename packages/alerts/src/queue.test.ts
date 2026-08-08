import { describe, expect, it, vi } from 'vitest'
import { AlertQueue } from './queue'

describe('AlertQueue', () => {
  it('우선순위와 배타 표시를 지킵니다', async () => {
    vi.useFakeTimers()
    const queue = new AlertQueue({
      defaultDonationDurationMs: 1000,
      idFactory: (() => {
        let n = 0
        return () => `a${++n}`
      })(),
    })

    const seen: Array<string | null> = []
    queue.onChange((alert) => seen.push(alert?.id ?? null))

    queue.enqueueDonation({
      type: 'donation',
      platform: 'chzzk',
      user: { platform: 'chzzk', id: '1', nickname: 'low', role: 'viewer', badges: [] },
      amount: 100,
      currency: 'cheese',
      at: 1,
    })
    queue.enqueueDonation({
      type: 'donation',
      platform: 'chzzk',
      user: { platform: 'chzzk', id: '2', nickname: 'high', role: 'viewer', badges: [] },
      amount: 9000,
      currency: 'cheese',
      at: 2,
    })

    expect(queue.currentAlert?.id).toBe('a1')
    expect(queue.pendingCount).toBe(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(queue.currentAlert?.id).toBe('a2')
    expect(queue.currentAlert?.amount).toBe(9000)

    await vi.advanceTimersByTimeAsync(1000)
    expect(queue.currentAlert).toBeNull()
    expect(seen.filter(Boolean).length).toBeGreaterThanOrEqual(2)
    vi.useRealTimers()
  })
})
