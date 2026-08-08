import type { Platform } from '@stream/core'
import type { ChatClient, ChatEvent, ChatEventHandler } from './types'

/** 공통 이벤트 버스 + 상태 emit. */
export abstract class BaseChatClient implements ChatClient {
  abstract readonly platform: Platform
  readonly channelId: string

  private readonly handlers = new Set<ChatEventHandler>()
  protected closed = false

  constructor(channelId: string) {
    this.channelId = channelId
  }

  on(handler: ChatEventHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  protected emit(event: ChatEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event)
      } catch {
        // 구독자 에러가 연결을 끊지 않게 합니다.
      }
    }
  }

  protected emitStatus(
    status: Extract<ChatEvent, { type: 'status' }>['status'],
    text?: string,
  ): void {
    this.emit({
      type: 'status',
      platform: this.platform,
      status,
      text,
      at: Date.now(),
    })
  }

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
}
