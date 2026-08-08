import { describe, expect, it } from 'vitest'
import {
  chzzkChatServerIndex,
  chzzkChatWebSocketUrl,
  toChannelLiveState,
  toStreamerInfo,
} from './schema'

describe('toChannelLiveState', () => {
  it('OPEN이면 live=true이고 chatChannelId를 보존한다', () => {
    const state = toChannelLiveState('chan1', {
      code: 200,
      content: {
        status: 'OPEN',
        liveTitle: '테스트 방송',
        concurrentUserCount: 42,
        chatChannelId: 'chat-abc',
        liveCategoryValue: '게임',
      },
    })
    expect(state.live).toBe(true)
    expect(state.chatChannelId).toBe('chat-abc')
    expect(state.viewerCount).toBe(42)
  })
})

describe('toStreamerInfo', () => {
  it('채널 응답을 StreamerInfo로 바꾼다', () => {
    const info = toStreamerInfo('chan1', {
      code: 200,
      content: {
        channelId: 'chan1',
        channelName: '테스트채널',
        channelImageUrl: 'https://img.example/p.png',
        followerCount: 100,
        channelDescription: '소개',
      },
    })
    expect(info).toMatchObject({
      platform: 'chzzk',
      id: 'chan1',
      name: '테스트채널',
      followerCount: 100,
      url: 'https://chzzk.naver.com/chan1',
    })
  })
})

describe('chzzkChatServerIndex', () => {
  it('문자코드 합 % 9 + 1', () => {
    expect(chzzkChatServerIndex('abc')).toBe(7)
    expect(chzzkChatWebSocketUrl('abc')).toBe('wss://kr-ss7.chat.naver.com/chat')
  })
})
