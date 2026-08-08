import type { ChatUserRole } from '@stream/core'
import type { CommandPermission } from './types'

const RANK: Record<ChatUserRole, number> = {
  viewer: 0,
  manager: 1,
  streamer: 2,
}

export function hasPermission(
  role: ChatUserRole,
  required: CommandPermission = 'everyone',
): boolean {
  if (required === 'everyone') return true
  return RANK[role] >= RANK[required]
}
