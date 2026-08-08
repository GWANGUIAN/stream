import type { Platform } from '@stream/core'
import type { CreatorProfile, CreatorSettings, LinkedAccount } from './types'

export function createEmptyProfile(id: string, displayName?: string): CreatorProfile {
  return {
    id,
    displayName,
    accounts: [],
    settings: {},
    updatedAt: Date.now(),
  }
}

export function upsertLinkedAccount(
  profile: CreatorProfile,
  account: Omit<LinkedAccount, 'linkedAt'> & { linkedAt?: number },
): CreatorProfile {
  const linkedAt = account.linkedAt ?? Date.now()
  const rest = profile.accounts.filter(
    (a) => !(a.platform === account.platform && a.userId === account.userId),
  )
  return {
    ...profile,
    accounts: [...rest, { ...account, linkedAt }],
    updatedAt: Date.now(),
  }
}

export function mergeSettings(profile: CreatorProfile, patch: CreatorSettings): CreatorProfile {
  return {
    ...profile,
    settings: {
      ...profile.settings,
      ...patch,
      commands: { ...profile.settings.commands, ...patch.commands },
      extras: { ...profile.settings.extras, ...patch.extras },
    },
    updatedAt: Date.now(),
  }
}

export function findAccount(
  profile: CreatorProfile,
  platform: Platform,
): LinkedAccount | undefined {
  return profile.accounts.find((a) => a.platform === platform)
}

export function tokenKey(platform: Platform, userId: string): string {
  return `${platform}:${userId}`
}
