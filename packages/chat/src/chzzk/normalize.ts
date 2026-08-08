import type { ChatUser, Platform } from '@stream/core'
import { z } from '@stream/core'
import type { ChatDonationEvent, ChatEvent, ChatMessageEvent } from '../types'

const profileSchema = z
  .object({
    nickname: z.string().optional(),
    userIdHash: z.string().optional(),
    profileImageUrl: z.string().optional().nullable(),
    userRoleCode: z.string().optional().nullable(),
    badge: z.unknown().optional(),
    badges: z.array(z.unknown()).optional(),
    verifiedMark: z.boolean().optional(),
  })
  .passthrough()

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string' || !value) return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function toUser(platform: Platform, profileRaw: unknown, uid?: string): ChatUser {
  const profile =
    typeof profileRaw === 'object' && profileRaw
      ? profileSchema.safeParse(profileRaw).data
      : undefined

  const roleCode = profile?.userRoleCode ?? ''
  const role =
    roleCode === 'streamer' || roleCode === 'STREAMER'
      ? 'streamer'
      : roleCode === 'manager' || roleCode === 'streaming_channel_manager'
        ? 'manager'
        : 'viewer'

  const badges: string[] = []
  if (profile?.verifiedMark) badges.push('verified')
  if (Array.isArray(profile?.badges)) {
    for (const badge of profile.badges) {
      if (badge && typeof badge === 'object' && 'name' in badge && typeof badge.name === 'string') {
        badges.push(badge.name)
      }
    }
  }

  return {
    platform,
    id: profile?.userIdHash ?? uid ?? 'anonymous',
    nickname: profile?.nickname ?? '익명',
    profileImageUrl: profile?.profileImageUrl ?? undefined,
    role,
    badges,
  }
}

/** 실시간/과거 프레임 필드명 차이를 흡수합니다. */
function pickText(msg: Record<string, unknown>): string {
  const text = msg.msg ?? msg.content ?? msg.message
  return typeof text === 'string' ? text : ''
}

function pickTime(msg: Record<string, unknown>): number {
  const raw = msg.msgTime ?? msg.messageTime ?? msg.time
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? n : Date.now()
}

function pickEmojis(msg: Record<string, unknown>): Record<string, string> {
  const extras = parseJsonField(msg.extras)
  if (!extras || typeof extras !== 'object') return {}
  const emojis = (extras as Record<string, unknown>).emojis
  if (!emojis || typeof emojis !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(emojis as Record<string, unknown>)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

function normalizeOne(msg: Record<string, unknown>): ChatEvent | undefined {
  const profile = parseJsonField(msg.profile)
  const user = toUser('chzzk', profile, typeof msg.uid === 'string' ? msg.uid : undefined)
  const text = pickText(msg)
  const at = pickTime(msg)
  const msgType = Number(msg.msgTypeCode ?? msg.messageTypeCode ?? 1)

  if (msgType === 10) {
    const extras = parseJsonField(msg.extras) as Record<string, unknown> | undefined
    const amount = Number(extras?.payAmount ?? extras?.amount ?? 0)
    const donation: ChatDonationEvent = {
      type: 'donation',
      platform: 'chzzk',
      user,
      amount: Number.isFinite(amount) ? amount : 0,
      currency: 'cheese',
      text: text || undefined,
      at,
      raw: msg,
    }
    return donation
  }

  if (msgType === 11) {
    const extras = parseJsonField(msg.extras) as Record<string, unknown> | undefined
    const months = Number(extras?.month ?? extras?.tierMonth ?? 1)
    return {
      type: 'subscription',
      platform: 'chzzk',
      user,
      months: Number.isFinite(months) ? months : 1,
      at,
      raw: msg,
    }
  }

  if (msgType === 30) {
    return {
      type: 'system',
      platform: 'chzzk',
      text: text || '시스템 메시지',
      at,
      raw: msg,
    }
  }

  const message: ChatMessageEvent = {
    type: 'message',
    platform: 'chzzk',
    user,
    text,
    emojis: pickEmojis(msg),
    at,
    raw: msg,
  }
  return message
}

/**
 * 치지직 채팅 프레임의 bdy를 ChatEvent 배열로 바꿉니다.
 * bdy는 배열이거나 { messageList } 객체일 수 있습니다.
 */
export function normalizeChzzkBody(bdy: unknown): ChatEvent[] {
  const list: unknown[] = Array.isArray(bdy)
    ? bdy
    : bdy &&
        typeof bdy === 'object' &&
        Array.isArray((bdy as { messageList?: unknown }).messageList)
      ? (bdy as { messageList: unknown[] }).messageList
      : bdy && typeof bdy === 'object'
        ? [bdy]
        : []

  const events: ChatEvent[] = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const event = normalizeOne(item as Record<string, unknown>)
    if (event) events.push(event)
  }
  return events
}
