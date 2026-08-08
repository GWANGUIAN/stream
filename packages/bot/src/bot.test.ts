import { describe, expect, it, vi } from 'vitest'
import { CommandBot } from './bot'
import { renderTemplate } from './template'

describe('renderTemplate', () => {
  it('변수를 치환합니다', () => {
    expect(renderTemplate('hi {user}', { user: 'A' })).toBe('hi A')
  })
})

describe('CommandBot', () => {
  it('권한·쿨다운·응답을 처리합니다', async () => {
    const send = vi.fn()
    const bot = new CommandBot({
      channelId: 'ch1',
      sender: { send },
      commands: [
        {
          name: 'discord',
          response: 'join {user}',
          cooldownMs: 10_000,
        },
        {
          name: 'mod',
          permission: 'manager',
          response: 'secret',
        },
      ],
      now: () => 1000,
    })

    const base = {
      type: 'message' as const,
      platform: 'chzzk' as const,
      emojis: {},
      at: 1,
      user: {
        platform: 'chzzk' as const,
        id: 'u1',
        nickname: 'nick',
        role: 'viewer' as const,
        badges: [],
      },
    }

    expect(await bot.handleMessage({ ...base, text: 'hello' })).toBe(false)
    expect(await bot.handleMessage({ ...base, text: '!discord' })).toBe(true)
    expect(send).toHaveBeenCalledWith('chzzk', 'ch1', 'join nick')

    expect(await bot.handleMessage({ ...base, text: '!discord' })).toBe(false)
    expect(await bot.handleMessage({ ...base, text: '!mod' })).toBe(false)

    expect(
      await bot.handleMessage({
        ...base,
        text: '!mod',
        user: { ...base.user, role: 'manager' },
      }),
    ).toBe(true)
  })
})
