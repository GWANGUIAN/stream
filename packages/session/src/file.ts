import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { TokenSet } from '@stream/auth'
import { z } from 'zod'
import type { CreatorProfile, SessionStore } from './types'

const linkedAccountSchema = z.object({
  platform: z.enum(['chzzk', 'soop']),
  userId: z.string(),
  displayName: z.string().optional(),
  channelId: z.string().optional(),
  linkedAt: z.number(),
})

const profileSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  accounts: z.array(linkedAccountSchema),
  settings: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.number(),
})

const fileSchema = z.object({
  profiles: z.record(z.string(), profileSchema).default({}),
  settings: z.record(z.string(), z.unknown()).default({}),
  tokens: z.record(z.string(), z.unknown()).default({}),
})

export interface FileSessionStoreOptions {
  /** 기본 `.data/session.json` */
  filePath?: string
}

/**
 * 단일 JSON 파일 기반 세션 저장소.
 * Next 번들에 끌려오지 않게 `@stream/session/file-store` 엔트리로 export합니다.
 */
export class FileSessionStore implements SessionStore {
  private readonly filePath: string
  private data: z.infer<typeof fileSchema> = { profiles: {}, settings: {}, tokens: {} }
  private loaded = false
  private writeChain: Promise<void> = Promise.resolve()

  constructor(options: FileSessionStoreOptions = {}) {
    this.filePath = options.filePath ?? path.resolve('.data/session.json')
  }

  async getProfile(id: string): Promise<CreatorProfile | undefined> {
    await this.ensureLoaded()
    return this.data.profiles[id] as CreatorProfile | undefined
  }

  async saveProfile(profile: CreatorProfile): Promise<void> {
    await this.ensureLoaded()
    this.data.profiles[profile.id] = {
      ...profile,
      settings: { ...profile.settings },
      updatedAt: Date.now(),
    }
    await this.persist()
  }

  async deleteProfile(id: string): Promise<void> {
    await this.ensureLoaded()
    delete this.data.profiles[id]
    for (const key of Object.keys(this.data.settings)) {
      if (key.startsWith(`${id}:`)) delete this.data.settings[key]
    }
    await this.persist()
  }

  async listProfiles(): Promise<CreatorProfile[]> {
    await this.ensureLoaded()
    return Object.values(this.data.profiles) as CreatorProfile[]
  }

  async getSetting<T = unknown>(profileId: string, key: string): Promise<T | undefined> {
    await this.ensureLoaded()
    return this.data.settings[`${profileId}:${key}`] as T | undefined
  }

  async setSetting(profileId: string, key: string, value: unknown): Promise<void> {
    await this.ensureLoaded()
    this.data.settings[`${profileId}:${key}`] = value
    await this.persist()
  }

  async getTokens(key: string): Promise<TokenSet | undefined> {
    await this.ensureLoaded()
    return this.data.tokens[key] as TokenSet | undefined
  }

  async setTokens(key: string, tokens: TokenSet): Promise<void> {
    await this.ensureLoaded()
    this.data.tokens[key] = tokens
    await this.persist()
  }

  async deleteTokens(key: string): Promise<void> {
    await this.ensureLoaded()
    delete this.data.tokens[key]
    await this.persist()
  }

  async listTokenKeys(): Promise<string[]> {
    await this.ensureLoaded()
    return Object.keys(this.data.tokens)
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return
    try {
      const raw = await readFile(this.filePath, 'utf8')
      this.data = fileSchema.parse(JSON.parse(raw))
    } catch {
      this.data = { profiles: {}, settings: {}, tokens: {} }
    }
    this.loaded = true
  }

  private async persist(): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true })
      await writeFile(this.filePath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf8')
    })
    await this.writeChain
  }
}
