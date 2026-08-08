import type { ChatUser } from '@stream/core'
import type { ChatEvent } from '../types'
import type { DecodedPacket } from './packet'
import { SVC } from './packet'

function viewer(nickname: string, id = nickname): ChatUser {
  return {
    platform: 'soop',
    id,
    nickname,
    role: 'viewer',
    badges: [],
  }
}

/**
 * SOOP 서비스 코드별 필드를 정규화 이벤트로 바꿉니다.
 * 필드 배치는 커뮤니티 라이브러리(soop-extension 등) 기준입니다.
 */
export function normalizeSoopPacket(packet: DecodedPacket): ChatEvent[] {
  const f = packet.fields
  const at = Date.now()

  switch (packet.svc) {
    case SVC.CHAT: {
      // 일반 채팅: [comment, ?, userId, ?, nickname, ...]
      const text = f[0] ?? ''
      const userId = f[2] ?? 'anonymous'
      const nickname = f[5] || f[4] || userId
      return [
        {
          type: 'message',
          platform: 'soop',
          user: viewer(nickname, userId),
          text,
          emojis: {},
          at,
          raw: packet,
        },
      ]
    }
    case SVC.TEXT_DONATION:
    case SVC.AD_BALLOON:
    case SVC.VIDEO_DONATION: {
      // 후원: 금액/닉네임 위치가 svc마다 약간 다릅니다. 방어적으로 파싱합니다.
      const nickname = f[2] || f[1] || '익명'
      const amount = Number(f[3] ?? f[4] ?? 0)
      const text = f[5] || f[6] || undefined
      return [
        {
          type: 'donation',
          platform: 'soop',
          user: viewer(nickname),
          amount: Number.isFinite(amount) ? amount : 0,
          currency: 'balloon',
          text,
          at,
          raw: packet,
        },
      ]
    }
    case SVC.SUBSCRIBE: {
      const nickname = f[1] || f[2] || '익명'
      const months = Number(f[3] ?? 1)
      return [
        {
          type: 'subscription',
          platform: 'soop',
          user: viewer(nickname),
          months: Number.isFinite(months) ? months : 1,
          at,
          raw: packet,
        },
      ]
    }
    case SVC.NOTIFICATION: {
      const text = f[0] || f[1] || '알림'
      return [{ type: 'system', platform: 'soop', text, at, raw: packet }]
    }
    default:
      return []
  }
}
