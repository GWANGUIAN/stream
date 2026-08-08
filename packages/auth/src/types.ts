import type { Platform } from '@stream/core'

/** 발급받은 토큰 한 벌. 플랫폼별 만료 표현 차이는 여기서 흡수합니다. */
export interface TokenSet {
  accessToken: string
  refreshToken?: string
  /** epoch ms. 플랫폼이 주는 expires_in(초)을 절대 시각으로 바꿔 저장합니다. */
  expiresAt: number
  tokenType: string
  /**
   * 치지직은 "유저 조회" 같은 한국어 설명 문자열을 돌려주고 SOOP은 null을 줍니다.
   * 기계적으로 파싱하지 마세요. 표시용입니다.
   */
  scope?: string
  /** 디버깅용 원본 응답. */
  raw?: unknown
}

/**
 * 앱이 들고 다니는 단 하나의 인증 표현.
 *
 * 공식 OAuth인지, 비공식 쿠키인지, 익명인지를 소비하는 쪽(@stream/chat, API 클라이언트)이
 * 알아서 처리하므로 애플리케이션 코드는 이 타입만 알면 됩니다.
 */
export type Credential =
  | { kind: 'oauth'; platform: Platform; tokens: TokenSet }
  | { kind: 'cookie'; platform: Platform; cookies: Record<string, string> }
  | { kind: 'anonymous'; platform: Platform }

export type CredentialKind = Credential['kind']

/** 인증된 계정의 신원. */
export interface AccountIdentity {
  platform: Platform
  /** 치지직은 channelId, SOOP은 user_id. */
  id: string
  nickname: string
  profileImageUrl?: string
  /** 치지직에서 id와 동일하지만, 의미가 다르므로 별도로 노출합니다. */
  channelId?: string
  raw?: unknown
}

export interface StateCookie {
  name: string
  value: string
  maxAgeSeconds: number
}

export interface AuthorizationRequest {
  /** 사용자를 보낼 인가 URL. */
  url: string
  /**
   * 서명된 state. 치지직은 이 값이 URL에도 실리지만 SOOP은 실리지 않습니다.
   * 어느 쪽이든 쿠키에 저장해 두었다가 콜백에서 검증해야 합니다.
   */
  state: string
  stateCookie: StateCookie
}

export interface CreateAuthorizationOptions {
  /** 인증 후 돌아갈 앱 내부 경로 등, state에 실어 보낼 부가 정보. */
  data?: Record<string, string>
  /** state 유효시간. 기본 10분. */
  ttlMs?: number
}

export interface ExchangeCodeParams {
  code: string
  /** 콜백 쿼리스트링의 state. SOOP은 state를 왕복시키지 않으므로 항상 undefined입니다. */
  state?: string
  /** 인가 요청 때 쿠키에 심어 둔 서명 state. */
  storedState?: string
  /** 기본 redirectUri를 덮어쓸 때만. */
  redirectUri?: string
}

export interface OAuthProvider {
  readonly platform: Platform
  /** client id/secret이 채워져 있어 실제로 OAuth를 시도할 수 있는지. */
  readonly configured: boolean
  createAuthorization(options?: CreateAuthorizationOptions): AuthorizationRequest
  exchangeCode(params: ExchangeCodeParams): Promise<TokenSet>
  refresh(tokens: TokenSet): Promise<TokenSet>
  /** 플랫폼이 폐기를 지원하지 않으면 no-op이며 supportsRevoke가 false입니다. */
  revoke(tokens: TokenSet): Promise<void>
  readonly supportsRevoke: boolean
  getIdentity(credential: Credential): Promise<AccountIdentity>
}

export function oauthCredential(platform: Platform, tokens: TokenSet): Credential {
  return { kind: 'oauth', platform, tokens }
}

export function cookieCredential(platform: Platform, cookies: Record<string, string>): Credential {
  return { kind: 'cookie', platform, cookies }
}

export function anonymousCredential(platform: Platform): Credential {
  return { kind: 'anonymous', platform }
}

/** 만료까지 남은 시간(ms). 이미 만료면 음수. */
export function expiresInMs(tokens: TokenSet, now = Date.now()): number {
  return tokens.expiresAt - now
}

/**
 * 만료됐거나 곧 만료되는지.
 *
 * skewMs 기본 60초는 "지금 요청을 보내면 서버 도착 시점엔 이미 만료"인 구간을 피하려는 값입니다.
 */
export function isExpired(tokens: TokenSet, skewMs = 60_000, now = Date.now()): boolean {
  return expiresInMs(tokens, now) <= skewMs
}

/** expires_in(초)을 절대 시각으로 바꿉니다. */
export function toExpiresAt(expiresInSeconds: number, now = Date.now()): number {
  return now + expiresInSeconds * 1000
}
