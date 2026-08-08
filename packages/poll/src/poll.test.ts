import { describe, expect, it } from 'vitest'
import { PollEngine, pickGiveawayWinner } from './poll'

function chat(
  nickname: string,
  text: string,
  at = 1,
): Parameters<PollEngine['handleVoteMessage']>[0] {
  return {
    type: 'message',
    platform: 'soop',
    user: { platform: 'soop', id: nickname, nickname, role: 'viewer', badges: [] },
    text,
    emojis: {},
    at,
  }
}

function makeEngine(now = { value: 0 }) {
  return new PollEngine({
    optionLabels: ['치킨', '피자', '족발'],
    now: () => now.value,
  })
}

describe('PollEngine', () => {
  it('running 상태가 아니면 투표를 무시합니다', () => {
    const poll = makeEngine()
    expect(poll.handleVoteMessage(chat('a', '!투표 1'))).toBe(false)
  })

  it('!투표 N 형식을 파싱해 옵션에 매칭합니다', () => {
    const poll = makeEngine()
    poll.start(60)
    expect(poll.handleVoteMessage(chat('a', '!투표 2'))).toBe(true)
    const totals = poll.getSnapshot().totals
    expect(totals.find((t) => t.label === '피자')?.votes).toBe(1)
  })

  it('기본값: 중복 투표 시 마지막 채팅으로 덮어씁니다', () => {
    const poll = makeEngine()
    poll.start(60)
    poll.handleVoteMessage(chat('철수', '!투표 1'))
    poll.handleVoteMessage(chat('철수', '!투표 3'))

    const totals = poll.getSnapshot().totals
    expect(totals.find((t) => t.label === '치킨')?.votes).toBe(0)
    expect(totals.find((t) => t.label === '족발')?.votes).toBe(1)
    expect(poll.getSnapshot().totalVotes).toBe(1)
  })

  it('중복 투표 허용 옵션이 켜지면 매 채팅이 누적됩니다', () => {
    const poll = makeEngine()
    poll.setAllowMultipleVotes(true)
    poll.start(60)
    poll.handleVoteMessage(chat('철수', '!투표 1'))
    poll.handleVoteMessage(chat('철수', '!투표 1'))
    poll.handleVoteMessage(chat('철수', '!투표 2'))

    const totals = poll.getSnapshot().totals
    expect(totals.find((t) => t.label === '치킨')?.votes).toBe(2)
    expect(totals.find((t) => t.label === '피자')?.votes).toBe(1)
    expect(poll.getSnapshot().totalVotes).toBe(3)
  })

  it('접두사를 바꾸면 새 접두사로만 인식합니다', () => {
    const poll = makeEngine()
    poll.setVotePrefix('!vote')
    poll.start(60)
    expect(poll.handleVoteMessage(chat('a', '!투표 1'))).toBe(false)
    expect(poll.handleVoteMessage(chat('a', '!vote 1'))).toBe(true)
  })

  it('타이머가 만료되면 자동으로 closed 상태가 됩니다', () => {
    const now = { value: 0 }
    const poll = makeEngine(now)
    poll.start(10)
    now.value = 11_000
    expect(poll.getRemainingMs()).toBeNull()
    expect(poll.getSnapshot().phase).toBe('closed')
  })

  it('reveal은 순위/퍼센트를 계산하고 히스토리에 남깁니다', () => {
    const poll = makeEngine()
    poll.start(60)
    poll.handleVoteMessage(chat('a', '!투표 1'))
    poll.handleVoteMessage(chat('b', '!투표 1'))
    poll.handleVoteMessage(chat('c', '!투표 2'))
    poll.close()
    poll.reveal()

    const snapshot = poll.getSnapshot()
    expect(snapshot.phase).toBe('revealed')
    const chicken = snapshot.totals.find((t) => t.label === '치킨')
    expect(chicken?.votes).toBe(2)
    expect(chicken?.rank).toBe(1)
    expect(chicken?.percentage).toBeCloseTo(66.7, 1)
    expect(snapshot.winnerIds).toEqual([chicken?.id])
    expect(snapshot.history).toHaveLength(1)
    expect(snapshot.history[0]?.totalVotes).toBe(3)
  })

  it('옵션이 2개 미만이면 시작하지 못합니다', () => {
    const poll = new PollEngine({ optionLabels: ['혼자'] })
    expect(poll.start(30)).toBe(false)
  })

  it('reset은 투표/타이머만 지우고 옵션은 유지합니다', () => {
    const poll = makeEngine()
    poll.start(60)
    poll.handleVoteMessage(chat('a', '!투표 1'))
    poll.reset()

    const snapshot = poll.getSnapshot()
    expect(snapshot.phase).toBe('idle')
    expect(snapshot.totalVotes).toBe(0)
    expect(snapshot.options).toHaveLength(3)
  })

  it('다량 투표 후에도 러닝 토탈이 votes 맵과 일치합니다', () => {
    const poll = makeEngine()
    poll.setAllowMultipleVotes(true)
    poll.start(60)
    for (let i = 0; i < 200; i += 1) {
      const option = (i % 3) + 1
      poll.handleVoteMessage(chat(`u${i}`, `!투표 ${option}`))
    }
    const snapshot = poll.getSnapshot()
    const fromVotes = snapshot.options.map((option) => ({
      id: option.id,
      votes: Object.values(snapshot.votes).reduce(
        (sum, records) => sum + records.filter((r) => r.optionId === option.id).length,
        0,
      ),
    }))
    for (const expected of fromVotes) {
      expect(snapshot.totals.find((t) => t.id === expected.id)?.votes).toBe(expected.votes)
    }
    expect(snapshot.totalVotes).toBe(200)
  })

  it('loadSnapshot 후 러닝 토탈을 복원합니다', () => {
    const poll = makeEngine()
    poll.start(60)
    poll.handleVoteMessage(chat('a', '!투표 1'))
    poll.handleVoteMessage(chat('b', '!투표 2'))
    const saved = poll.getSnapshot()

    const restored = makeEngine()
    restored.loadSnapshot(saved)
    const snapshot = restored.getSnapshot()
    expect(snapshot.totalVotes).toBe(2)
    expect(snapshot.totals.find((t) => t.label === '치킨')?.votes).toBe(1)
    expect(snapshot.totals.find((t) => t.label === '피자')?.votes).toBe(1)
  })
})

describe('pickGiveawayWinner', () => {
  it('가중치로 당첨자를 고릅니다', () => {
    const winner = pickGiveawayWinner(
      [
        { nickname: 'a', weight: 0 },
        { nickname: 'b', weight: 10 },
      ],
      () => 0.5,
    )
    expect(winner?.nickname).toBe('b')
  })
})
