import { anonymousCredential, type Credential, cookieCredential } from '@stream/auth'
import { isPlatform, type Platform } from '@stream/core'
import { getEnv } from './env'

export function assertPlatform(value: string): Platform {
  if (!isPlatform(value)) {
    throw new Error(`지원하지 않는 플랫폼: ${value}`)
  }
  return value
}

export function chatCredential(platform: Platform): Credential {
  const env = getEnv()
  if (platform === 'chzzk' && env.CHZZK_NID_AUT && env.CHZZK_NID_SES) {
    return cookieCredential('chzzk', {
      NID_AUT: env.CHZZK_NID_AUT,
      NID_SES: env.CHZZK_NID_SES,
    })
  }
  return anonymousCredential(platform)
}
