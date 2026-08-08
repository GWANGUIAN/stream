import type { ChatMessageEvent } from '@stream/chat'
import type { ChatUser, ChatUserRole, Platform } from '@stream/core'

export type CommandPermission = ChatUserRole | 'everyone'

export interface CommandContext {
  platform: Platform
  channelId: string
  user: ChatUser
  message: ChatMessageEvent
  /** `!cmd arg1 arg2`에서 cmd */
  command: string
  /** 공백 분리 args */
  args: string[]
  /** args를 다시 합친 문자열 */
  argText: string
  /** 변수 치환된 응답을 보내려 할 때 사용. 미구현이면 no-op. */
  reply: (text: string) => void | Promise<void>
  vars: Record<string, string>
}

export interface CommandDefinition {
  name: string
  aliases?: string[]
  description?: string
  /** 기본 everyone */
  permission?: CommandPermission
  /** 사용자별 쿨다운(ms) */
  cooldownMs?: number
  /** 전역 쿨다운(ms) */
  globalCooldownMs?: number
  /** 고정 응답. handler보다 우선하지 않음 — handler 없으면 사용. */
  response?: string
  handler?: (ctx: CommandContext) => void | Promise<void>
}

export interface ChatSender {
  send(platform: Platform, channelId: string, text: string): Promise<void>
}

export interface CommandBotOptions {
  channelId: string
  platform?: Platform
  prefix?: string
  commands?: CommandDefinition[]
  sender?: ChatSender
  /** 템플릿 변수 기본값. `{uptime}` 등 */
  vars?: Record<string, string | (() => string)>
  now?: () => number
}
