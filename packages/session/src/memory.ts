import type { TokenSet } from '@stream/auth'
import type { CreatorProfile, SessionStore } from './types'

/** 개발/테스트용 인메모리 세션 저장소. */
export class MemorySessionStore implements SessionStore {
  private readonly profiles = new Map<string, CreatorProfile>()
  private readonly settings = new Map<string, unknown>()
  private readonly tokens = new Map<string, TokenSet>()

  async getProfile(id: string): Promise<CreatorProfile | undefined> {
    return this.profiles.get(id)
  }

  async saveProfile(profile: CreatorProfile): Promise<void> {
    this.profiles.set(profile.id, { ...profile, updatedAt: Date.now() })
  }

  async deleteProfile(id: string): Promise<void> {
    this.profiles.delete(id)
    for (const key of [...this.settings.keys()]) {
      if (key.startsWith(`${id}:`)) this.settings.delete(key)
    }
  }

  async listProfiles(): Promise<CreatorProfile[]> {
    return [...this.profiles.values()]
  }

  async getSetting<T = unknown>(profileId: string, key: string): Promise<T | undefined> {
    return this.settings.get(`${profileId}:${key}`) as T | undefined
  }

  async setSetting(profileId: string, key: string, value: unknown): Promise<void> {
    this.settings.set(`${profileId}:${key}`, value)
  }

  async getTokens(key: string): Promise<TokenSet | undefined> {
    return this.tokens.get(key)
  }

  async setTokens(key: string, tokens: TokenSet): Promise<void> {
    this.tokens.set(key, tokens)
  }

  async deleteTokens(key: string): Promise<void> {
    this.tokens.delete(key)
  }

  async listTokenKeys(): Promise<string[]> {
    return [...this.tokens.keys()]
  }
}
