import { describe, expect, it, vi } from 'vitest'
import { TtsEngine } from './engine'

describe('TtsEngine', () => {
  it('금지어와 큐잉을 처리합니다', async () => {
    const spoken: string[] = []
    const engine = new TtsEngine({
      blockedWords: ['금칙어'],
      provider: {
        async speak({ text }) {
          spoken.push(text)
        },
      },
    })

    await engine.enqueue('안녕')
    await engine.enqueue('이건 금칙어 포함')
    expect(spoken).toEqual(['안녕'])
  })

  it('알림 speakText를 읽습니다', async () => {
    const speak = vi.fn(async () => {})
    const engine = new TtsEngine({ provider: { speak } })
    await engine.enqueueAlert({
      id: '1',
      kind: 'donation',
      platform: 'chzzk',
      title: 'a',
      priority: 1,
      durationMs: 1000,
      createdAt: 1,
      speakText: '후원 감사',
      amount: 1000,
    })
    expect(speak).toHaveBeenCalledWith({ text: '후원 감사' })
  })
})
