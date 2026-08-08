import type { Credential } from '@stream/auth'
import type { ChatUser, Platform } from '@stream/core'

export type ChatEventType = 'message' | 'donation' | 'subscription' | 'system' | 'status'

export interface ChatMessageEvent {
  type: 'message'
  platform: Platform
  user: ChatUser
  text: string
  emojis: Record<string, string>
  at: number
  raw?: unknown
}

export interface ChatDonationEvent {
  type: 'donation'
  platform: Platform
  user: ChatUser
  amount: number
  currency: string
  text?: string
  at: number
  raw?: unknown
}

export interface ChatSubscriptionEvent {
  type: 'subscription'
  platform: Platform
  user: ChatUser
  months: number
  at: number
  raw?: unknown
}

export interface ChatSystemEvent {
  type: 'system'
  platform: Platform
  text: string
  at: number
  raw?: unknown
}

export interface ChatStatusEvent {
  type: 'status'
  platform: Platform
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error'
  text?: string
  at: number
}

export type ChatEvent =
  | ChatMessageEvent
  | ChatDonationEvent
  | ChatSubscriptionEvent
  | ChatSystemEvent
  | ChatStatusEvent

export type ChatEventHandler = (event: ChatEvent) => void

export interface ChatClientOptions {
  channelId: string
  credential?: Credential
  fetch?: typeof globalThis.fetch
}

export interface ChatClient {
  readonly platform: Platform
  readonly channelId: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  on(handler: ChatEventHandler): () => void
}
