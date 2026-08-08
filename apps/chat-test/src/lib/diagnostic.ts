import type { Platform } from '@stream/core'
import type { ChatSseClientEvent } from '@stream/sse/client'
import type { ConnectionStatus } from './hooks'

export const MAX_EVENTS = 500

export interface DiagnosticMeta {
  capturedAt: string
  platform: Platform | null
  channelId: string
  sseBase: string
  connectionStatus: ConnectionStatus
  connectionMessage: string
  eventCount: number
  filter: string
}

/** Cursor에 붙여넣어 정규화/프록시 연동을 검증할 진단 텍스트. */
export function buildDiagnosticDump(
  meta: DiagnosticMeta,
  events: ChatSseClientEvent[],
): string {
  const header = [
    '=== stream chat-test diagnostic ===',
    '이 블록을 Cursor에 붙여넣어 채팅 프록시·정규화 이벤트를 검증하세요.',
    `capturedAt: ${meta.capturedAt}`,
    `platform: ${meta.platform ?? '(none)'}`,
    `channelId: ${meta.channelId || '(none)'}`,
    `sseBase: ${meta.sseBase}`,
    `connectionStatus: ${meta.connectionStatus}`,
    `connectionMessage: ${meta.connectionMessage || '(empty)'}`,
    `filter: ${meta.filter}`,
    `eventCount: ${meta.eventCount}`,
    '--- events (JSON Lines) ---',
  ].join('\n')

  const lines = events.map((event) => JSON.stringify(event))
  return `${header}\n${lines.join('\n')}\n=== end ===\n`
}

export function summarizeEvent(event: ChatSseClientEvent): string {
  if (event.type === 'hello') {
    return `hello ${event.platform} ${event.channelId}`
  }
  if (event.type === 'message') {
    return `${event.user.nickname}: ${event.text}`
  }
  if (event.type === 'donation') {
    return `후원 ${event.user.nickname} ${event.amount}${event.currency}${event.text ? ` — ${event.text}` : ''}`
  }
  if (event.type === 'subscription') {
    return `구독 ${event.user.nickname} ${event.months}개월`
  }
  if (event.type === 'system') {
    return event.text
  }
  if (event.type === 'status') {
    return `status ${event.status}${event.text ? `: ${event.text}` : ''}`
  }
  if (event.type === 'live') {
    return `live ${event.live.live ? 'on' : 'off'} ${event.channelId}`
  }
  return JSON.stringify(event)
}
