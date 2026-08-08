import { AuthError, HttpClient, parseSetCookies } from '@stream/core'
import type { AccountIdentity, Credential } from '../../types'
import { SOOP_DEFAULT_DOMAIN, soopLoginBase, soopUnofficialHeaders } from './constants'

export interface SoopPasswordLoginConfig {
  domain?: string
  fetch?: typeof globalThis.fetch
}

export interface SoopLoginResult {
  cookies: Record<string, string>
  identity: AccountIdentity
}

/**
 * SOOP 아이디/비밀번호 로그인으로 AuthTicket 쿠키를 발급합니다.
 *
 * 채팅 "전송"에만 필요합니다. 채널/라이브/채팅 읽기는 `@stream/api`의 익명 Credential로 됩니다.
 */
export class SoopPasswordLogin {
  private readonly domain: string
  private readonly loginHttp: HttpClient

  constructor(config: SoopPasswordLoginConfig = {}) {
    this.domain = config.domain ?? SOOP_DEFAULT_DOMAIN
    this.loginHttp = new HttpClient({
      baseUrl: soopLoginBase(this.domain),
      platform: 'soop',
      fetch: config.fetch,
      headers: soopUnofficialHeaders(this.domain),
    })
  }

  async login(userId: string, password: string): Promise<SoopLoginResult> {
    const response = await this.loginHttp.send('/app/LoginAction.php', {
      method: 'POST',
      form: {
        szWork: 'login',
        szType: 'json',
        szUid: userId,
        szPassword: password,
      },
      retry: false,
    })

    const jar = parseSetCookies(response)
    const body = await response.text()
    let parsed: { RESULT?: number | string; MSG?: string } = {}
    try {
      parsed = JSON.parse(body) as typeof parsed
    } catch {
      // 일부 응답은 JSON이 아닐 수 있습니다.
    }

    if (!jar.AuthTicket) {
      throw new AuthError(`SOOP 로그인 실패: ${parsed.MSG ?? 'AuthTicket을 받지 못했습니다.'}`, {
        platform: 'soop',
        cause: { body, jar },
      })
    }

    return {
      cookies: jar,
      identity: {
        platform: 'soop',
        id: userId,
        nickname: userId,
        raw: parsed,
      },
    }
  }
}

/** 쿠키 Credential에서 AuthTicket 존재 여부만 확인하는 헬퍼. */
export function soopHasAuthTicket(credential: Credential): boolean {
  return (
    credential.platform === 'soop' &&
    credential.kind === 'cookie' &&
    Boolean(credential.cookies.AuthTicket)
  )
}
