import { createStreamApi } from '@stream/api'
import {
  anonymousCredential,
  ChzzkOAuthProvider,
  type Credential,
  cookieCredential,
  type OAuthProvider,
  SoopOAuthProvider,
  TokenManager,
} from '@stream/auth'
import { isPlatform, type Platform } from '@stream/core'
import { chzzkOAuthConfigured, getEnv, soopOAuthConfigured } from './env'
import { tokenStore } from './session'

export function assertPlatform(value: string): Platform {
  if (!isPlatform(value)) {
    throw new Error(`지원하지 않는 플랫폼: ${value}`)
  }
  return value
}

export function createOAuthProvider(platform: Platform): OAuthProvider {
  const env = getEnv()
  if (platform === 'chzzk') {
    return new ChzzkOAuthProvider({
      clientId: env.CHZZK_CLIENT_ID ?? '',
      clientSecret: env.CHZZK_CLIENT_SECRET ?? '',
      redirectUri: env.CHZZK_REDIRECT_URI ?? 'http://localhost:3000/api/auth/chzzk/callback',
      secret: env.AUTH_SECRET,
    })
  }
  return new SoopOAuthProvider({
    clientId: env.SOOP_CLIENT_ID ?? '',
    clientSecret: env.SOOP_CLIENT_SECRET ?? '',
    redirectUri: env.SOOP_REDIRECT_URI,
    secret: env.AUTH_SECRET,
  })
}

export async function createTokenManager(platform: Platform): Promise<TokenManager> {
  return new TokenManager({
    provider: createOAuthProvider(platform),
    store: await tokenStore(),
  })
}

export function isOAuthConfigured(platform: Platform): boolean {
  return platform === 'chzzk' ? chzzkOAuthConfigured() : soopOAuthConfigured()
}

/**
 * 채팅·채널 조회용 자격증명.
 * OAuth와 별개로, 비공식 API는 쿠키/익명을 씁니다.
 */
export function apiCredential(platform: Platform): Credential {
  const env = getEnv()
  if (platform === 'chzzk' && env.CHZZK_NID_AUT && env.CHZZK_NID_SES) {
    return cookieCredential('chzzk', {
      NID_AUT: env.CHZZK_NID_AUT,
      NID_SES: env.CHZZK_NID_SES,
    })
  }
  return anonymousCredential(platform)
}

/** @deprecated apiCredential을 쓰세요. */
export const chatCredential = apiCredential

export function streamApiFor(platform: Platform) {
  return createStreamApi({
    platform,
    credential: apiCredential(platform),
  })
}
