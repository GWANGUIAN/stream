import type { Credential } from '@stream/auth'
import { type ChatClient, createChatClient } from '@stream/chat'
import type { Platform } from '@stream/core'

interface HubEntry {
  client: ChatClient
  refs: number
  ready: Promise<void>
}

const hubs = new Map<string, HubEntry>()
const pending = new Map<string, Promise<HubEntry>>()

function hubKey(platform: Platform, channelId: string): string {
  return `${platform}:${channelId}`
}

export interface AcquiredChatClient {
  client: ChatClient
  release: () => void
}

/**
 * platform+channelId당 upstream ChatClient 하나를 공유합니다.
 * 마지막 구독자가 떠나면 disconnect합니다.
 */
export async function acquireChatClient(options: {
  platform: Platform
  channelId: string
  credential?: Credential
}): Promise<AcquiredChatClient> {
  const channelId = options.channelId.trim()
  if (!channelId) {
    throw new Error('channelId가 필요합니다.')
  }

  const key = hubKey(options.platform, channelId)
  let entry = hubs.get(key)

  if (!entry) {
    let creating = pending.get(key)
    if (!creating) {
      creating = (async () => {
        const client = createChatClient({
          platform: options.platform,
          channelId,
          credential: options.credential,
        })
        const ready = client.connect()
        const next: HubEntry = { client, refs: 0, ready }
        hubs.set(key, next)
        return next
      })().finally(() => {
        pending.delete(key)
      })
      pending.set(key, creating)
    }
    entry = await creating
  }

  entry.refs += 1
  let released = false

  try {
    await entry.ready
  } catch (error) {
    entry.refs -= 1
    if (entry.refs <= 0) {
      hubs.delete(key)
      void entry.client.disconnect()
    }
    throw error
  }

  return {
    client: entry.client,
    release: () => {
      if (released) return
      released = true
      const current = hubs.get(key)
      if (!current) return
      current.refs -= 1
      if (current.refs <= 0) {
        hubs.delete(key)
        void current.client.disconnect()
      }
    },
  }
}
