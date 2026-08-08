import { describe, expect, it } from 'vitest'
import { normalizeChzzkBody } from './normalize'

describe('normalizeChzzkBody', () => {
  it('profile/extras JSON 문자열을 2차 파싱한다', () => {
    const events = normalizeChzzkBody([
      {
        uid: 'u1',
        msg: '안녕',
        msgTime: 1_700_000_000_000,
        msgTypeCode: 1,
        profile: JSON.stringify({
          nickname: '뷰어',
          userIdHash: 'u1',
          userRoleCode: 'common_user',
          verifiedMark: true,
        }),
        extras: JSON.stringify({ emojis: { ':wave': 'https://img/wave.png' } }),
      },
    ])

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'message',
      platform: 'chzzk',
      text: '안녕',
      user: { nickname: '뷰어', id: 'u1' },
      emojis: { ':wave': 'https://img/wave.png' },
    })
    expect(events[0]?.type === 'message' && events[0].user.badges).toContain('verified')
  })

  it('content/messageTime 필드명(과거 프레임)도 받는다', () => {
    const events = normalizeChzzkBody({
      messageList: [
        {
          content: '과거메시지',
          messageTime: 123,
          messageTypeCode: 1,
          profile: JSON.stringify({ nickname: 'A', userIdHash: 'a' }),
        },
      ],
    })
    expect(events[0]).toMatchObject({ type: 'message', text: '과거메시지', at: 123 })
  })

  it('msgTypeCode 10은 후원으로 정규화한다', () => {
    const events = normalizeChzzkBody([
      {
        msg: '후원!',
        msgTypeCode: 10,
        profile: JSON.stringify({ nickname: '후원자', userIdHash: 'd1' }),
        extras: JSON.stringify({ payAmount: 1000 }),
      },
    ])
    expect(events[0]).toMatchObject({
      type: 'donation',
      amount: 1000,
      currency: 'cheese',
      text: '후원!',
    })
  })
})
