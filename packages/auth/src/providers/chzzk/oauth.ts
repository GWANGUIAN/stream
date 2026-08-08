import { AuthError, HttpClient, type Platform, ProviderError } from '@stream/core'
import { assertState, createSignedState, toStateCookie } from '../../state'
import type {
  AccountIdentity,
  AuthorizationRequest,
  CreateAuthorizationOptions,
  Credential,
  ExchangeCodeParams,
  OAuthProvider,
  TokenSet,
} from '../../types'
import { CHZZK_AUTHORIZE_URL, CHZZK_OPEN_API_BASE } from './constants'
import { chzzkChannelUrl, chzzkMeEnvelopeSchema, parseChzzkTokenSet } from './schema'

export interface ChzzkOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  /** state HMAC 서명용. 보통 AUTH_SECRET. */
  secret: string
  openApiBaseUrl?: string
  authorizeUrl?: string
  fetch?: typeof globalThis.fetch
}

/**
 * 치지직 공식 OAuth 2.0 프로바이더.
 *
 * - 인가 URL만 chzzk.naver.com (다른 도메인)
 * - 토큰 요청은 JSON 바디 (form-urlencoded 아님)
 * - 응답은 { code, message, content } 봉투
 * - 리프레시 토큰은 1회용 회전 → TokenManager single-flight 필수
 */
export class ChzzkOAuthProvider implements OAuthProvider {
  readonly platform: Platform = 'chzzk'
  readonly supportsRevoke = true

  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly secret: string
  private readonly authorizeUrl: string
  private readonly http: HttpClient

  constructor(config: ChzzkOAuthConfig) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.redirectUri = config.redirectUri
    this.secret = config.secret
    this.authorizeUrl = config.authorizeUrl ?? CHZZK_AUTHORIZE_URL
    this.http = new HttpClient({
      baseUrl: config.openApiBaseUrl ?? CHZZK_OPEN_API_BASE,
      platform: 'chzzk',
      fetch: config.fetch,
      headers: {
        accept: 'application/json',
      },
    })
  }

  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri && this.secret)
  }

  createAuthorization(options: CreateAuthorizationOptions = {}): AuthorizationRequest {
    this.assertConfigured()
    const signed = createSignedState(this.secret, {
      ttlMs: options.ttlMs,
      data: options.data,
    })

    const url = new URL(this.authorizeUrl)
    url.searchParams.set('clientId', this.clientId)
    url.searchParams.set('redirectUri', this.redirectUri)
    url.searchParams.set('state', signed.value)

    return {
      url: url.toString(),
      state: signed.value,
      stateCookie: toStateCookie('chzzk', signed),
    }
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<TokenSet> {
    this.assertConfigured()
    assertState({
      secret: this.secret,
      platform: 'chzzk',
      queryState: params.state,
      cookieState: params.storedState,
      requireQueryState: true,
    })

    const data = await this.http.json('/auth/v1/token', {
      method: 'POST',
      json: {
        grantType: 'authorization_code',
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        code: params.code,
        state: params.state,
      },
      label: 'chzzk/auth/token',
      retry: false,
    })

    return this.unwrapToken(data)
  }

  async refresh(tokens: TokenSet): Promise<TokenSet> {
    this.assertConfigured()
    if (!tokens.refreshToken) {
      throw new AuthError('치지직 리프레시 토큰이 없습니다.', { platform: 'chzzk' })
    }

    const data = await this.http.json('/auth/v1/token', {
      method: 'POST',
      json: {
        grantType: 'refresh_token',
        refreshToken: tokens.refreshToken,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      },
      label: 'chzzk/auth/token/refresh',
      retry: false,
    })

    return this.unwrapToken(data)
  }

  async revoke(tokens: TokenSet): Promise<void> {
    this.assertConfigured()
    await this.http.json('/auth/v1/token/revoke', {
      method: 'POST',
      json: {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        token: tokens.accessToken,
        tokenTypeHint: 'access_token',
      },
      label: 'chzzk/auth/token/revoke',
      retry: false,
    })
  }

  async getIdentity(credential: Credential): Promise<AccountIdentity> {
    if (credential.kind !== 'oauth' || credential.platform !== 'chzzk') {
      throw new AuthError('치지직 OAuth 자격증명이 필요합니다.', { platform: 'chzzk' })
    }

    // /open/v1/users/me 는 Bearer + Client-Id + Client-Secret 세 헤더가 모두 필요합니다.
    const data = await this.http.json('/open/v1/users/me', {
      headers: {
        Authorization: `Bearer ${credential.tokens.accessToken}`,
        'Client-Id': this.clientId,
        'Client-Secret': this.clientSecret,
      },
      schema: chzzkMeEnvelopeSchema,
      label: 'chzzk/users/me',
    })

    if (Number(data.code) !== 200 || !data.content) {
      throw new ProviderError(`치지직 users/me 실패: ${data.message ?? data.code}`, {
        platform: 'chzzk',
        code: data.code,
        body: data,
      })
    }

    return {
      platform: 'chzzk',
      id: data.content.channelId,
      nickname: data.content.channelName,
      channelId: data.content.channelId,
      raw: data,
    }
  }

  /** Bearer + Client 헤더를 붙인 HttpClient. 공식 API 호출에 씁니다. */
  authenticatedClient(accessToken: string): HttpClient {
    return this.http.extend({
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': this.clientId,
        'Client-Secret': this.clientSecret,
      },
    })
  }

  private unwrapToken(data: unknown): TokenSet {
    try {
      return parseChzzkTokenSet(data)
    } catch (cause) {
      throw new AuthError('치지직 토큰 교환/갱신 실패', {
        platform: 'chzzk',
        cause,
      })
    }
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new AuthError(
        '치지직 OAuth가 설정되지 않았습니다. CHZZK_CLIENT_ID/SECRET/REDIRECT_URI와 AUTH_SECRET을 확인하세요.',
        { platform: 'chzzk' },
      )
    }
  }
}

export { chzzkChannelUrl }
