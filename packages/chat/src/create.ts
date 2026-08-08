import type { Platform } from '@stream/core'
import { ChzzkChatClient, type ChzzkChatClientOptions } from './chzzk/client'
import { SoopChatClient, type SoopChatClientOptions } from './soop/client'
import type { ChatClient, ChatClientOptions } from './types'

export type CreateChatClientOptions =
  | ({ platform: 'chzzk' } & ChzzkChatClientOptions)
  | ({ platform: 'soop' } & SoopChatClientOptions)

export function createChatClient(options: CreateChatClientOptions): ChatClient {
  if (options.platform === 'chzzk') {
    return new ChzzkChatClient(options)
  }
  return new SoopChatClient(options)
}

export function createChatClientFor(platform: Platform, options: ChatClientOptions): ChatClient {
  return createChatClient({ platform, ...options } as CreateChatClientOptions)
}
