import type { TokenSet } from '../types'
import type { TokenStore } from './types'

/** 개발/테스트용. 프로세스가 죽으면 사라집니다. */
export class MemoryTokenStore implements TokenStore {
  private readonly map = new Map<string, TokenSet>()

  async get(key: string): Promise<TokenSet | undefined> {
    return this.map.get(key)
  }

  async set(key: string, tokens: TokenSet): Promise<void> {
    this.map.set(key, tokens)
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key)
  }

  async keys(): Promise<string[]> {
    return [...this.map.keys()]
  }
}
