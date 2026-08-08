import type { TokenSet } from '../types'

/**
 * 토큰 영속화 지점.
 *
 * key는 보통 `${platform}:${userId}` 형태입니다. TokenManager가 이 인터페이스만
 * 알고 있으므로 메모리/파일/DB/쿠키 어느 쪽이든 갈아끼울 수 있습니다.
 */
export interface TokenStore {
  get(key: string): Promise<TokenSet | undefined>
  set(key: string, tokens: TokenSet): Promise<void>
  delete(key: string): Promise<void>
  keys?(): Promise<string[]>
}
