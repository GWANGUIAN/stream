import type { Credential } from '@stream/auth'
import { type ChatClient, type ChatEvent, createChatClient } from '@stream/chat'
import type { Platform } from '@stream/core'
import type { EventBus, StreamEvent } from '@stream/events'
import { encodeSseData, SSE_RESPONSE_HEADERS } from './encode'

export interface ChatSseHelloEvent {
  type: 'hello'
  platform: Platform
  channelId: string
}

export type ChatSsePayload = ChatEvent | ChatSseHelloEvent | StreamEvent

export interface CreateChatSseOptions {
  platform: Platform
  channelId: string
  credential?: Credential
  /** 이미 연결한 ChatClient를 넘기면 새로 만들지 않습니다. */
  client?: ChatClient
  /** 연결하면 이벤트를 이 버스에도 팬아웃합니다. */
  bus?: EventBus
  signal?: AbortSignal
  /** hello 이벤트 포함 여부. 기본 true. */
  sendHello?: boolean
}

/**
 * 서버에서 채팅 클라이언트를 돌리고 정규화 이벤트를 SSE Response로 반환합니다.
 * 비공식 API는 CORS로 브라우저 직접 호출이 막혀 있어 이 프록시가 필요합니다.
 */
export function createChatSseResponse(options: CreateChatSseOptions): Response {
  const channelId = options.channelId.trim()
  if (!channelId) {
    return new Response(JSON.stringify({ error: 'channelId가 필요합니다.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  let client: ChatClient | null = options.client ?? null
  let closed = false
  let detachBus: (() => void) | undefined

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: ChatSsePayload) => {
        if (closed) return
        controller.enqueue(encoder.encode(encodeSseData(payload)))
      }

      if (options.sendHello !== false) {
        send({ type: 'hello', platform: options.platform, channelId })
      }

      client ??= createChatClient({
        platform: options.platform,
        channelId,
        credential: options.credential,
      })

      if (options.bus) {
        detachBus = options.bus.attachChatClient(client)
      }

      client.on((event) => send(event))

      const close = () => {
        if (closed) return
        closed = true
        detachBus?.()
        void client?.disconnect()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      options.signal?.addEventListener('abort', close)

      try {
        await client.connect()
      } catch (error) {
        send({
          type: 'status',
          platform: options.platform,
          status: 'error',
          text: error instanceof Error ? error.message : '연결 실패',
          at: Date.now(),
        })
        close()
      }
    },
    cancel() {
      closed = true
      detachBus?.()
      void client?.disconnect()
    },
  })

  return new Response(stream, { headers: { ...SSE_RESPONSE_HEADERS } })
}
