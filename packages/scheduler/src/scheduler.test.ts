import { describe, expect, it, vi } from 'vitest'
import { BroadcastScheduler, WebhookOutbox } from './scheduler'

describe('BroadcastScheduler', () => {
  it('리마인더를 발화합니다', async () => {
    const now = 1_000_000
    const scheduler = new BroadcastScheduler({ now: () => now })
    await scheduler.upsert({
      id: 's1',
      title: '저녁 방송',
      startsAt: now + 10 * 60_000,
      remindMinutesBefore: [10],
    })

    const due = await scheduler.tick()
    expect(due).toHaveLength(1)
    expect(await scheduler.tick()).toHaveLength(0)
  })
})

describe('WebhookOutbox', () => {
  it('webhook을 전송합니다', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    const outbox = new WebhookOutbox({ fetch: fetchImpl as unknown as typeof fetch })
    outbox.enqueue('https://example.com/hook', { content: 'hi' })
    const result = await outbox.flush()
    expect(result.sent).toBe(1)
    expect(fetchImpl).toHaveBeenCalled()
  })
})
