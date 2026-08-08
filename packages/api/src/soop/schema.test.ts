import { describe, expect, it } from 'vitest'
import {
  parseSoopChatSessionFields,
  soopChatWebSocketUrl,
  toSoopLiveState,
  toSoopStreamerInfo,
} from './schema'

describe('parseSoopChatSessionFields', () => {
  it('CHDOMAIN을 소문자화하고 CHPT+1로 포트를 잡는다', () => {
    const session = parseSoopChatSessionFields('bjid', {
      CHANNEL: {
        RESULT: 1,
        CHDOMAIN: 'CHAT.SOOPLIVE.CO.KR',
        CHPT: '6666',
        CHATNO: '12345',
        FTK: 'ticket',
      },
    })
    expect(session.chatDomain).toBe('chat.sooplive.co.kr')
    expect(session.chatPort).toBe(6667)
    expect(soopChatWebSocketUrl(session)).toBe('wss://chat.sooplive.co.kr:6667/Websocket/bjid')
  })

  it('RESULT가 1이 아니면 실패한다', () => {
    expect(() => parseSoopChatSessionFields('bjid', { CHANNEL: { RESULT: 0 } })).toThrow(/RESULT=0/)
  })
})

describe('toSoopLiveState / toSoopStreamerInfo', () => {
  it('라이브 상태를 정규화한다', () => {
    const live = toSoopLiveState('bj', {
      CHANNEL: { RESULT: 1, TITLE: '방송', CTUSER: 10, CATE: 'game' },
    })
    expect(live).toMatchObject({ live: true, title: '방송', viewerCount: 10 })
  })

  it('스테이션 응답을 StreamerInfo로 바꾼다', () => {
    const info = toSoopStreamerInfo('bjid', {
      station: {
        user_id: 'bjid',
        user_nick: '숲닉',
        profile_image: 'https://img.example/p.png',
        station_title: '소개',
      },
      fan_cnt: 50,
    })
    expect(info).toMatchObject({
      platform: 'soop',
      id: 'bjid',
      name: '숲닉',
      followerCount: 50,
      url: 'https://ch.sooplive.co.kr/bjid',
    })
  })
})
