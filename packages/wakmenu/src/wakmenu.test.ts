import { describe, expect, it } from 'vitest'
import { WakmenuEngine } from './wakmenu'

const menu = { id: 'pho', label: '쌀국수', aliases: ['포'], imageUrl: '' }
const event = (id: string, nickname: string, text: string, at: number) => ({ type: 'message' as const, platform: 'soop' as const, user: { platform: 'soop' as const, id, nickname, role: 'viewer' as const, badges: [] }, text, emojis: {}, at })
describe('WakmenuEngine', () => {
  it('normalizes aliases and keeps the latest answer by default', () => { const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu]); engine.start(); expect(engine.handleMessage(event('a','A','!밥  포 ',1))).toBe(true); engine.handleMessage(event('a','A','!밥 아닌메뉴',2)); expect(engine.getSnapshot().results[0]?.winners).toHaveLength(1); engine.handleMessage(event('a','A','!밥 쌀국수',3)); expect(engine.getSnapshot().results[0]?.fastest[0]?.at).toBe(3) })
  it('keeps earlier correct submissions and ranks first five stably when enabled', () => { const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu]); engine.setAllowMultipleAnswers(true); engine.start(); for (let i=0;i<6;i++) engine.handleMessage(event(String(i), `u${i}`, '!밥 쌀국수', 10)); const result=engine.getSnapshot().results[0]; expect(result?.winners).toHaveLength(6); expect(result?.fastest.map((winner) => winner.nickname)).toEqual(['u0','u1','u2','u3','u4']) })
  it('counts every distinct viewer who submitted, right or wrong', () => {
    const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu]); engine.start()
    engine.handleMessage(event('a', 'A', '!밥 쌀국수', 1))
    engine.handleMessage(event('b', 'B', '!밥 아닌메뉴', 2))
    engine.handleMessage(event('b', 'B', '!밥 여전히아님', 3))
    engine.handleMessage(event('c', 'C', '!밥 포', 4))
    expect(engine.getSnapshot().participantCount).toBe(3)
    expect(engine.getSnapshot().acceptedMessages).toBe(4)
  })
  it('counts a viewer who wins multiple menus only once toward correctParticipantCount', () => {
    const menu2 = { id: 'ramen', label: '라면', aliases: [], imageUrl: '' }
    const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu, menu2]); engine.setAllowMultipleAnswers(true); engine.start()
    engine.handleMessage(event('a', 'A', '!밥 쌀국수', 1))
    engine.handleMessage(event('a', 'A', '!밥 라면', 2))
    engine.handleMessage(event('b', 'B', '!밥 오답', 3))
    expect(engine.getSnapshot().correctParticipantCount).toBe(1)
    expect(engine.getSnapshot().participantCount).toBe(2)
  })
  it('merges normalized-equivalent wrong answers and ranks them by frequency', () => {
    const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu]); engine.start()
    engine.handleMessage(event('a', 'A', '!밥 라면', 1))
    engine.handleMessage(event('b', 'B', '!밥 라 면', 2))
    engine.handleMessage(event('c', 'C', '!밥 김밥', 3))
    const top = engine.getSnapshot().topWrongAnswers
    expect(top[0]).toEqual({ text: '라면', count: 2 })
    expect(top[1]).toEqual({ text: '김밥', count: 1 })
  })
  it('resets wrong-answer tracking on start()', () => {
    const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu]); engine.start()
    engine.handleMessage(event('a', 'A', '!밥 오답', 1))
    expect(engine.getSnapshot().topWrongAnswers).toHaveLength(1)
    engine.start()
    expect(engine.getSnapshot().topWrongAnswers).toHaveLength(0)
  })
})
