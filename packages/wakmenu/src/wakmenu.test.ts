import { describe, expect, it } from 'vitest'
import { WakmenuEngine } from './wakmenu'

const menu = { id: 'pho', label: '쌀국수', aliases: ['포'], imageUrl: '' }
const event = (id: string, nickname: string, text: string, at: number) => ({ type: 'message' as const, platform: 'soop' as const, user: { platform: 'soop' as const, id, nickname, role: 'viewer' as const, badges: [] }, text, emojis: {}, at })
describe('WakmenuEngine', () => {
  it('normalizes aliases and keeps the latest answer by default', () => { const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu]); engine.start(); expect(engine.handleMessage(event('a','A','!밥  포 ',1))).toBe(true); engine.handleMessage(event('a','A','!밥 아닌메뉴',2)); expect(engine.getSnapshot().results[0]?.winners).toHaveLength(1); engine.handleMessage(event('a','A','!밥 쌀국수',3)); expect(engine.getSnapshot().results[0]?.fastest[0]?.at).toBe(3) })
  it('keeps earlier correct submissions and ranks first five stably when enabled', () => { const engine = new WakmenuEngine({ now: () => 0 }); engine.setAnswers([menu]); engine.setAllowMultipleAnswers(true); engine.start(); for (let i=0;i<6;i++) engine.handleMessage(event(String(i), `u${i}`, '!밥 쌀국수', 10)); const result=engine.getSnapshot().results[0]; expect(result?.winners).toHaveLength(6); expect(result?.fastest.map((winner) => winner.nickname)).toEqual(['u0','u1','u2','u3','u4']) })
})
