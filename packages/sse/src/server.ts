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
  /**
   * 허용할 ChatEvent.type 목록. 지정하면 목록에 있는 타입만 전달합니다.
   * `hello`는 이 목록과 무관하게 전송됩니다.
   */
  types?: string[]
  /**
   * `message` 이벤트만 적용. 비어 있지 않으면 text가 접두사로 시작할 때만 전달.
   * 비어 있거나 생략이면 message 전부 전달(타입 필터 통과 시).
   */
  messagePrefixes?: string[]
  /**
   * true(기본)면 abort/cancel 시 client.disconnect()를 호출합니다.
   * 공유 클라이언트는 false로 두세요.
   */
  ownsClient?: boolean
  /**
   * true(기본)면 start에서 client.connect()를 호출합니다.
   * 허브가 이미 연결한 공유 클라이언트는 false.
   */
  manageConnection?: boolean
}

export interface ParsedChatSseQuery {
  channelId: string
  types?: string[]
  messagePrefixes?: string[]
}

/** SSE URL 쿼리에서 channelId / types / prefix(es)를 읽습니다. */
export function parseChatSseSearchParams(params: URLSearchParams): ParsedChatSseQuery {
  const channelId = params.get('channelId')?.trim() ?? ''
  const typesRaw = params.get('types')?.trim()
  const types = typesRaw
    ? typesRaw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : undefined

  const fromRepeated = params
    .getAll('prefix')
    .map((part) => part.trim())
    .filter(Boolean)
  const fromCsv =
    params
      .get('prefixes')
      ?.split(',')
      .map((part) => part.trim())
      .filter(Boolean) ?? []
  const messagePrefixes = [...fromRepeated, ...fromCsv]
  const uniquePrefixes = [...new Set(messagePrefixes)]

  return {
    channelId,
    types: types?.length ? types : undefined,
    messagePrefixes: uniquePrefixes.length ? uniquePrefixes : undefined,
  }
}

/** 단위 테스트·프록시에서 재사용하는 이벤트 전달 여부 판정. */
export function shouldForwardChatEvent(
  event: ChatEvent,
  options: Pick<CreateChatSseOptions, 'types' | 'messagePrefixes'>,
): boolean {
  if (options.types && options.types.length > 0 && !options.types.includes(event.type)) {
    return false
  }

  if (event.type !== 'message') return true

  const prefixes = options.messagePrefixes
  if (!prefixes || prefixes.length === 0) return true

  const text = event.text.trim().toLowerCase()
  return prefixes.some((prefix) => {
    const needle = prefix.trim().toLowerCase()
    return needle.length > 0 && text.startsWith(needle)
  })
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
  let detachHandler: (() => void) | undefined
  const ownsClient = options.ownsClient !== false
  const manageConnection = options.manageConnection !== false

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

      detachHandler = client.on((event) => {
        if (!shouldForwardChatEvent(event, options)) return
        send(event)
      })

      const close = () => {
        if (closed) return
        closed = true
        detachBus?.()
        detachHandler?.()
        if (ownsClient) {
          void client?.disconnect()
        }
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      options.signal?.addEventListener('abort', close)

      if (!manageConnection) {
        return
      }

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
      detachHandler?.()
      if (ownsClient) {
        void client?.disconnect()
      }
    },
  })

  return new Response(stream, { headers: { ...SSE_RESPONSE_HEADERS } })
}
