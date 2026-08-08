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
import { SOOP_OPEN_API_BASE } from './constants'
import { parseSoopTokenSet, soopStationInfoSchema } from './schema'

export interface SoopOAuthConfig {
  clientId: string
  clientSecret: string
  /**
   * 사전 등록된 redirect URI.
   * SOOP 인가 요청에는 실리지 않고, 토큰 교환 시에만 (선택) 전송합니다.
   */
  redirectUri?: string
  /** state HMAC 서명용. SOOP은 state를 왕복시키지 않으므로 쿠키 검증용입니다. */
  secret: string
  openApiBaseUrl?: string
  fetch?: typeof globalThis.fetch
}

/**
 * SOOP 공식 OAuth 프로바이더 (파트너 전용).
 *
 * - 인가 URL에 state/response_type/scope/redirect_uri가 없음
 * - CSRF는 쿠키에 심은 HMAC state로만 방어
 * - 토큰은 form-urlencoded로 받고, API 호출 시에도 form 바디의 access_token 필드로 전달
 * - 개인 개발자 키 발급이 막혀 있으므로 configured가 false인 경우가 정상입니다
 */
export class SoopOAuthProvider implements OAuthProvider {
  readonly platform: Platform = 'soop'
  readonly supportsRevoke = false

  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri?: string
  private readonly secret: string
  private readonly openApiBaseUrl: string
  private readonly http: HttpClient

  constructor(config: SoopOAuthConfig) {
    this.clientId = config.clientId
    this.clientSecret = config.clientSecret
    this.redirectUri = config.redirectUri
    this.secret = config.secret
    this.openApiBaseUrl = config.openApiBaseUrl ?? SOOP_OPEN_API_BASE
    this.http = new HttpClient({
      baseUrl: this.openApiBaseUrl,
      platform: 'soop',
      fetch: config.fetch,
      headers: { accept: 'application/json' },
    })
  }

  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.secret)
  }

  createAuthorization(options: CreateAuthorizationOptions = {}): AuthorizationRequest {
    this.assertConfigured()
    const signed = createSignedState(this.secret, {
      ttlMs: options.ttlMs,
      data: options.data,
    })

    // SOOP은 client_id만 싣습니다. state는 URL에 넣지 않습니다.
    const url = new URL('/auth/code', this.openApiBaseUrl)
    url.searchParams.set('client_id', this.clientId)

    return {
      url: url.toString(),
      state: signed.value,
      stateCookie: toStateCookie('soop', signed),
    }
  }

  /**
   * 헤드리스 인가 코드 발급.
   * 사용자가 SOOP 앱의 인증번호(6자리)를 입력하면 브라우저 없이 코드를 받을 수 있습니다.
   */
  async requestCodeWithCertification(certificationNumber: string): Promise<string> {
    this.assertConfigured()
    const data = await this.http.json<{ code?: string }>('/auth/code', {
      method: 'POST',
      form: {
        client_id: this.clientId,
        auth_type: 'api',
        certification_number: certificationNumber,
      },
      label: 'soop/auth/code',
      retry: false,
    })

    if (!data.code) {
      throw new AuthError('SOOP 인증번호로 인가 코드를 받지 못했습니다.', {
        platform: 'soop',
        cause: data,
      })
    }
    return data.code
  }

  async exchangeCode(params: ExchangeCodeParams): Promise<TokenSet> {
    this.assertConfigured()
    // SOOP은 쿼리 state가 없으므로 쿠키만 검증합니다.
    assertState({
      secret: this.secret,
      platform: 'soop',
      queryState: params.state,
      cookieState: params.storedState,
      requireQueryState: false,
    })

    const form: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: params.code,
    }
    const redirectUri = params.redirectUri ?? this.redirectUri
    if (redirectUri) form.redirect_uri = redirectUri

    const data = await this.http.json('/auth/token', {
      method: 'POST',
      form,
      label: 'soop/auth/token',
      retry: false,
    })

    return this.unwrapToken(data)
  }

  async refresh(tokens: TokenSet): Promise<TokenSet> {
    this.assertConfigured()
    if (!tokens.refreshToken) {
      throw new AuthError('SOOP 리프레시 토큰이 없습니다.', { platform: 'soop' })
    }

    const data = await this.http.json('/auth/token', {
      method: 'POST',
      form: {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: tokens.refreshToken,
      },
      label: 'soop/auth/token/refresh',
      retry: false,
    })

    return this.unwrapToken(data)
  }

  async revoke(_tokens: TokenSet): Promise<void> {
    // SOOP 공식 API에 폐기 엔드포인트가 없습니다.
  }

  async getIdentity(credential: Credential): Promise<AccountIdentity> {
    if (credential.kind !== 'oauth' || credential.platform !== 'soop') {
      throw new AuthError('SOOP OAuth 자격증명이 필요합니다.', { platform: 'soop' })
    }

    // Bearer 헤더가 아니라 form 바디의 access_token 필드.
    const data = await this.http.json('/user/stationinfo', {
      method: 'POST',
      form: { access_token: credential.tokens.accessToken },
      schema: soopStationInfoSchema,
      label: 'soop/user/stationinfo',
    })

    if (data.result !== 1 || !data.data) {
      throw new ProviderError(`SOOP stationinfo 실패: ${data.msg ?? data.result}`, {
        platform: 'soop',
        code: data.result,
        body: data,
      })
    }

    const nick = data.data.user_nick ?? data.data.station_name ?? 'unknown'
    return {
      platform: 'soop',
      id: nick,
      nickname: nick,
      profileImageUrl: data.data.profile_image ?? undefined,
      raw: data,
    }
  }

  /**
   * SOOP API 호출용 폼 데코레이터.
   * Bearer를 가정하지 않고 access_token을 form 필드에 넣습니다.
   */
  withAccessToken(
    accessToken: string,
    form: Record<string, string | number | boolean | undefined> = {},
  ) {
    return { ...form, access_token: accessToken }
  }

  private unwrapToken(data: unknown): TokenSet {
    try {
      return parseSoopTokenSet(data)
    } catch (cause) {
      throw new AuthError('SOOP 토큰 교환/갱신 실패', { platform: 'soop', cause })
    }
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new AuthError(
        'SOOP OAuth가 설정되지 않았습니다. 파트너 키(SOOP_CLIENT_ID/SECRET)와 AUTH_SECRET이 필요합니다. 개인 개발자 키는 현재 발급되지 않습니다.',
        { platform: 'soop' },
      )
    }
  }
}
