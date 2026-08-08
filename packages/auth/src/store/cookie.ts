import { seal, unseal } from '../crypto'
import type { TokenSet } from '../types'
import type { TokenStore } from './types'

const COOKIE_PURPOSE = 'token-cookie'

/**
 * Next.js `cookies()` 같은 쿠키 저장소에 대한 최소 인터페이스.
 * 프레임워크에 직접 의존하지 않기 위해 이 모양만 요구합니다.
 */
export interface CookieAccessor {
  get(name: string): string | undefined
  set(name: string, value: string, options: CookieWriteOptions): void
  delete(name: string): void
}

export interface CookieWriteOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  path: string
  maxAge: number
}

export interface CookieTokenStoreOptions {
  secret: string
  cookies: CookieAccessor
  /** 쿠키 이름 접두사. 최종 이름은 `${prefix}_${key}` 입니다. */
  prefix?: string
  secure?: boolean
  /** 기본 30일. 치지직 리프레시 토큰 수명과 맞춰 두었습니다. */
  maxAgeSeconds?: number
}

/**
 * 토큰을 AES-256-GCM으로 봉인해 httpOnly 쿠키에 담습니다.
 *
 * 서버 사이드 세션 저장소 없이 데모를 돌리기 위한 것입니다. 브라우저 쿠키는
 * 4KB 제한이 있으므로 토큰 외 큰 데이터를 함께 넣지 마세요.
 */
export class CookieTokenStore implements TokenStore {
  private readonly secret: string
  private readonly cookies: CookieAccessor
  private readonly prefix: string
  private readonly secure: boolean
  private readonly maxAgeSeconds: number

  constructor(options: CookieTokenStoreOptions) {
    this.secret = options.secret
    this.cookies = options.cookies
    this.prefix = options.prefix ?? 'stream_token'
    this.secure = options.secure ?? process.env.NODE_ENV === 'production'
    this.maxAgeSeconds = options.maxAgeSeconds ?? 30 * 24 * 60 * 60
  }

  private nameFor(key: string): string {
    return `${this.prefix}_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`
  }

  async get(key: string): Promise<TokenSet | undefined> {
    const sealed = this.cookies.get(this.nameFor(key))
    if (!sealed) return undefined
    const decoded = unseal(this.secret, COOKIE_PURPOSE, sealed)
    if (!decoded) return undefined
    try {
      return JSON.parse(decoded) as TokenSet
    } catch {
      return undefined
    }
  }

  async set(key: string, tokens: TokenSet): Promise<void> {
    // raw 원본 응답은 쿠키 용량만 잡아먹으므로 저장하지 않습니다.
    const { raw: _raw, ...persisted } = tokens
    this.cookies.set(
      this.nameFor(key),
      seal(this.secret, COOKIE_PURPOSE, JSON.stringify(persisted)),
      {
        httpOnly: true,
        secure: this.secure,
        sameSite: 'lax',
        path: '/',
        maxAge: this.maxAgeSeconds,
      },
    )
  }

  async delete(key: string): Promise<void> {
    this.cookies.delete(this.nameFor(key))
  }
}
