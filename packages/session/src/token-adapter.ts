import type { TokenSet, TokenStore } from '@stream/auth'
import type { SessionStore } from './types'

/** SessionStore를 @stream/auth TokenStore로 노출합니다. */
export class SessionTokenStore implements TokenStore {
  constructor(private readonly session: SessionStore) {}

  get(key: string): Promise<TokenSet | undefined> {
    return this.session.getTokens(key)
  }

  set(key: string, tokens: TokenSet): Promise<void> {
    return this.session.setTokens(key, tokens)
  }

  delete(key: string): Promise<void> {
    return this.session.deleteTokens(key)
  }

  keys(): Promise<string[]> {
    return this.session.listTokenKeys()
  }
}
