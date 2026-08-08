import type { ChatEvent } from '@stream/chat'
import type { Platform } from '@stream/core'
import type { StreamEvent } from '@stream/events'

export interface ChatSseHelloEvent {
  type: 'hello'
  platform: Platform
  channelId: string
}

export type ChatSseClientEvent = ChatEvent | ChatSseHelloEvent | StreamEvent

export interface SubscribeChatSseOptions {
  url: string
  onEvent: (event: ChatSseClientEvent) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  /** EventSource 구현 주입(테스트용). 기본 globalThis.EventSource */
  EventSourceImpl?: typeof EventSource
}

export interface ChatSseSubscription {
  close(): void
  readonly readyState: number
}

export interface ChatSseUrlOptions {
  types?: string[]
  prefixes?: string[]
}

/**
 * 브라우저에서 채팅 SSE를 구독합니다.
 * URL은 보통 `/api/chat/{platform}/stream?channelId=...` 형태입니다.
 */
export function subscribeChatSse(options: SubscribeChatSseOptions): ChatSseSubscription {
  const Impl = options.EventSourceImpl ?? globalThis.EventSource
  if (!Impl) {
    throw new Error('EventSource를 사용할 수 없습니다. 브라우저 환경에서 호출하세요.')
  }

  const source = new Impl(options.url)

  source.onopen = () => options.onOpen?.()
  source.onerror = (error) => options.onError?.(error)
  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as ChatSseClientEvent
      options.onEvent(event)
    } catch {
      // malformed frame
    }
  }

  return {
    close: () => source.close(),
    get readyState() {
      return source.readyState
    },
  }
}

export function chatSseUrl(
  basePath: string,
  platform: Platform,
  channelId: string,
  options?: ChatSseUrlOptions,
): string {
  const root = basePath.replace(/\/$/, '')
  const qs = new URLSearchParams()
  qs.set('channelId', channelId)
  if (options?.types && options.types.length > 0) {
    qs.set('types', options.types.join(','))
  }
  for (const prefix of options?.prefixes ?? []) {
    const trimmed = prefix.trim()
    if (trimmed) qs.append('prefix', trimmed)
  }
  return `${root}/${platform}/stream?${qs.toString()}`
}
