import type { TokenSet } from '@stream/auth'
import type { Platform } from '@stream/core'

/** 크리에이터에 연결된 플랫폼 계정. */
export interface LinkedAccount {
  platform: Platform
  userId: string
  displayName?: string
  channelId?: string
  linkedAt: number
}

/** 명령어·알림 테마 등 크리에이터 설정. */
export interface CreatorSettings {
  commands?: Record<string, string>
  alertTheme?: string
  overlayTheme?: string
  discordUrl?: string
  /** 자유 확장 키 */
  extras?: Record<string, unknown>
}

export interface CreatorProfile {
  id: string
  displayName?: string
  accounts: LinkedAccount[]
  settings: CreatorSettings
  updatedAt: number
}

export interface SessionStore {
  getProfile(id: string): Promise<CreatorProfile | undefined>
  saveProfile(profile: CreatorProfile): Promise<void>
  deleteProfile(id: string): Promise<void>
  listProfiles(): Promise<CreatorProfile[]>

  getSetting<T = unknown>(profileId: string, key: string): Promise<T | undefined>
  setSetting(profileId: string, key: string, value: unknown): Promise<void>

  /** auth TokenStore와 같은 키 규약: `${platform}:${userId}` */
  getTokens(key: string): Promise<TokenSet | undefined>
  setTokens(key: string, tokens: TokenSet): Promise<void>
  deleteTokens(key: string): Promise<void>
  listTokenKeys(): Promise<string[]>
}
