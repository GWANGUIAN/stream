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

/** 선행 빈 필드를 한 칸 제거합니다(VIDEO/AD 패킷 레이아웃). */
function skipLeadingEmpty(fields: string[]): string[] {
  return fields[0] === '' ? fields.slice(1) : fields
}

function positiveAmount(...candidates: Array<string | undefined>): number {
  for (const raw of candidates) {
    if (raw === undefined || raw === '') continue
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

/**
 * SOOP 서비스 코드별 필드를 정규화 이벤트로 바꿉니다.
 *
 * 필드 배치는 실방송 패킷 + 커뮤니티 라이브러리(soop-extension) 기준입니다.
 * decodePackets가 payload 선행 `\f`를 이미 한 칸 제거한 뒤의 인덱스를 사용합니다.
 */
export function normalizeSoopPacket(packet: DecodedPacket): ChatEvent[] {
  const f = packet.fields
  const at = Date.now()

  switch (packet.svc) {
    case SVC.CHAT: {
      // [comment, userId, flags..., nickname, ...]
      const text = f[0] ?? ''
      const userId = f[1] || 'anonymous'
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
    case SVC.TEXT_DONATION: {
      // [to, from, fromUsername, amount, fanClubOrdinal]
      const userId = f[1] || 'anonymous'
      const nickname = f[2] || userId
      const amount = positiveAmount(f[3], f[4])
      return [
        {
          type: 'donation',
          platform: 'soop',
          user: viewer(nickname, userId),
          amount,
          currency: 'balloon',
          text: undefined,
          at,
          raw: packet,
        },
      ]
    }
    case SVC.VIDEO_DONATION: {
      // 선행 빈 필드 가능: [to, from, fromUsername, amount, fanClubOrdinal]
      const d = skipLeadingEmpty(f)
      const userId = d[1] || 'anonymous'
      const nickname = d[2] || userId
      const amount = positiveAmount(d[3], d[4])
      return [
        {
          type: 'donation',
          platform: 'soop',
          user: viewer(nickname, userId),
          amount,
          currency: 'balloon',
          text: undefined,
          at,
          raw: packet,
        },
      ]
    }
    case SVC.AD_BALLOON: {
      // 선행 빈 필드 후: [to, from, fromUsername, *5 fillers, amount, fanClubOrdinal]
      const d = skipLeadingEmpty(f)
      const userId = d[1] || 'anonymous'
      const nickname = d[2] || userId
      const amount = positiveAmount(d[8], d[9], d[7], d[10])
      return [
        {
          type: 'donation',
          platform: 'soop',
          user: viewer(nickname, userId),
          amount,
          currency: 'balloon',
          text: undefined,
          at,
          raw: packet,
        },
      ]
    }
    case SVC.SUBSCRIBE: {
      // [to, from, fromUsername, months, ...]
      const userId = f[1] || 'anonymous'
      const nickname = f[2] || userId
      const months = Number(f[3] ?? 1)
      return [
        {
          type: 'subscription',
          platform: 'soop',
          user: viewer(nickname, userId),
          months: Number.isFinite(months) && months > 0 ? months : 1,
          at,
          raw: packet,
        },
      ]
    }
    case SVC.NOTIFICATION: {
      // 실방송: [chatNo, flag, flag, notificationText, ...]
      const text = f[3] || f[0] || f[1] || '알림'
      return [{ type: 'system', platform: 'soop', text, at, raw: packet }]
    }
    default:
      return []
  }
}
