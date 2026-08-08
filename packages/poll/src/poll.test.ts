import { describe, expect, it } from 'vitest'
import { PollEngine, pickGiveawayWinner } from './poll'

describe('PollEngine', () => {
  it('중복 투표를 막고 집계합니다', () => {
    const poll = new PollEngine()
    poll.start({
      id: 'p1',
      title: '선택',
      options: [
        { id: 'a', label: 'A', aliases: ['a', '1'] },
        { id: 'b', label: 'B', aliases: ['b', '2'] },
      ],
    })

    const user = {
      platform: 'chzzk' as const,
      id: 'u1',
      nickname: 'n',
      role: 'viewer' as const,
      badges: [],
    }

    expect(
      poll.handleVoteMessage({
        type: 'message',
        platform: 'chzzk',
        user,
        text: '!vote a',
        emojis: {},
        at: 1,
      }),
    ).toBe(true)
    expect(
      poll.handleVoteMessage({
        type: 'message',
        platform: 'chzzk',
        user,
        text: '!vote b',
        emojis: {},
        at: 2,
      }),
    ).toBe(false)

    const result = poll.close()
    expect(result.totals.find((t) => t.id === 'a')?.votes).toBe(1)
    expect(result.winnerIds).toEqual(['a'])
  })
})

describe('pickGiveawayWinner', () => {
  it('가중치로 당첨자를 고릅니다', () => {
    const winner = pickGiveawayWinner(
      [
        { userId: '1', nickname: 'a', weight: 0 },
        { userId: '2', nickname: 'b', weight: 10 },
      ],
      () => 0.5,
    )
    expect(winner?.userId).toBe('2')
  })
})
