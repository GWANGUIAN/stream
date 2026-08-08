import type { ChatEvent } from '@stream/chat'
import type { Platform } from '@stream/core'

export interface ChatLineModel {
  id: string
  platform: Platform
  kind: ChatEvent['type'] | 'hello'
  nick?: string
  text: string
  amount?: number
  currency?: string
  at: number
}

let lineSeq = 0

export function chatEventToLine(event: ChatEvent): ChatLineModel {
  lineSeq += 1
  const id = `${event.type}-${event.at}-${lineSeq}`

  if (event.type === 'message') {
    return {
      id,
      platform: event.platform,
      kind: 'message',
      nick: event.user.nickname,
      text: event.text,
      at: event.at,
    }
  }
  if (event.type === 'donation') {
    return {
      id,
      platform: event.platform,
      kind: 'donation',
      nick: event.user.nickname,
      text: event.text ?? '',
      amount: event.amount,
      currency: event.currency,
      at: event.at,
    }
  }
  if (event.type === 'subscription') {
    return {
      id,
      platform: event.platform,
      kind: 'subscription',
      nick: event.user.nickname,
      text: `${event.months}개월 구독`,
      at: event.at,
    }
  }
  if (event.type === 'system') {
    return {
      id,
      platform: event.platform,
      kind: 'system',
      text: event.text,
      at: event.at,
    }
  }
  return {
    id,
    platform: event.platform,
    kind: 'status',
    text: event.text ?? event.status,
    at: event.at,
  }
}
