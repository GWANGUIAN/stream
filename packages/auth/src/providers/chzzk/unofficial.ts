import { AuthError, HttpClient, ProviderError } from '@stream/core'
import type { AccountIdentity, Credential } from '../../types'
import { CHZZK_GAME_API_BASE, CHZZK_UNOFFICIAL_HEADERS } from './constants'
import { chzzkUserStatusSchema } from './schema'

export interface ChzzkCookieAuthConfig {
  cookies: Record<string, string>
  gameApiBaseUrl?: string
  fetch?: typeof globalThis.fetch
}

/**
 * 치지직 비공식 쿠키 자격증명 헬퍼.
 *
 * 채널/라이브/채팅 조회는 `@stream/api`로 옮겼습니다. 여기에는
 * NID_AUT/NID_SES로 로그인한 사용자 신원을 읽는 것만 남깁니다.
 */
export class ChzzkCookieAuth {
  private readonly cookies: Record<string, string>
  private readonly gameApi: HttpClient

  constructor(config: ChzzkCookieAuthConfig) {
    this.cookies = config.cookies
    this.gameApi = new HttpClient({
      baseUrl: config.gameApiBaseUrl ?? CHZZK_GAME_API_BASE,
      platform: 'chzzk',
      fetch: config.fetch,
      headers: CHZZK_UNOFFICIAL_HEADERS,
    })
  }

  static fromCredential(credential: Credential, fetch?: typeof globalThis.fetch): ChzzkCookieAuth {
    if (credential.platform !== 'chzzk' || credential.kind !== 'cookie') {
      throw new AuthError('치지직 쿠키 자격증명(NID_AUT/NID_SES)이 필요합니다.', {
        platform: 'chzzk',
      })
    }
    return new ChzzkCookieAuth({ cookies: credential.cookies, fetch })
  }

  async getUserStatus(): Promise<AccountIdentity> {
    if (!this.cookies.NID_AUT || !this.cookies.NID_SES) {
      throw new AuthError('치지직 비공식 사용자 조회에는 NID_AUT/NID_SES 쿠키가 필요합니다.', {
        platform: 'chzzk',
      })
    }

    const data = await this.gameApi.json('/v1/user/getUserStatus', {
      cookies: this.cookies,
      schema: chzzkUserStatusSchema,
      label: 'chzzk/getUserStatus',
    })

    if (Number(data.code) !== 200 || !data.content) {
      throw new ProviderError(`치지직 getUserStatus 실패: ${data.message ?? data.code}`, {
        platform: 'chzzk',
        code: data.code,
        body: data,
      })
    }

    return {
      platform: 'chzzk',
      id: data.content.userIdHash,
      nickname: data.content.nickname ?? data.content.userIdHash,
      profileImageUrl: data.content.profileImageUrl ?? undefined,
      channelId: data.content.userIdHash,
      raw: data,
    }
  }
}
