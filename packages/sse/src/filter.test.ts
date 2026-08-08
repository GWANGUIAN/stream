import { describe, expect, it } from 'vitest'
import { parseChatSseSearchParams, shouldForwardChatEvent } from './server'

function message(text: string) {
  return {
    type: 'message' as const,
    platform: 'soop' as const,
    user: {
      platform: 'soop' as const,
      id: 'u',
      nickname: 'nick',
      role: 'viewer' as const,
      badges: [],
    },
    text,
    emojis: {},
    at: 1,
  }
}

function donation() {
  return {
    type: 'donation' as const,
    platform: 'soop' as const,
    user: {
      platform: 'soop' as const,
      id: 'u',
      nickname: 'nick',
      role: 'viewer' as const,
      badges: [],
    },
    amount: 1000,
    currency: 'KRW',
    at: 1,
  }
}

describe('shouldForwardChatEvent', () => {
  it('types가 있으면 목록에 있는 타입만 통과합니다', () => {
    expect(shouldForwardChatEvent(donation(), { types: ['message', 'status'] })).toBe(false)
    expect(shouldForwardChatEvent(message('hi'), { types: ['message', 'status'] })).toBe(true)
  })

  it('messagePrefixes가 있으면 접두사 매칭 message만 통과합니다', () => {
    expect(
      shouldForwardChatEvent(message('안녕'), {
        types: ['message'],
        messagePrefixes: ['!투표'],
      }),
    ).toBe(false)
    expect(
      shouldForwardChatEvent(message('!투표 1'), {
        types: ['message'],
        messagePrefixes: ['!투표'],
      }),
    ).toBe(true)
  })

  it('prefixes가 비어 있으면 message를 모두 통과합니다', () => {
    expect(shouldForwardChatEvent(message('잡담'), { types: ['message'] })).toBe(true)
  })
})

describe('parseChatSseSearchParams', () => {
  it('types와 prefix 쿼리를 파싱합니다', () => {
    const params = new URLSearchParams(
      'channelId=abc&types=message,status&prefix=!투표&prefix=!vote',
    )
    expect(parseChatSseSearchParams(params)).toEqual({
      channelId: 'abc',
      types: ['message', 'status'],
      messagePrefixes: ['!투표', '!vote'],
    })
  })
})
