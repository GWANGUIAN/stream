import { anonymousCredential, type Credential, cookieCredential } from '@stream/auth'
import { isPlatform, type Platform } from '@stream/core'
import { getEnv } from './env'

export function assertPlatform(value: string): Platform {
  if (!isPlatform(value)) {
    throw new Error(`지원하지 않는 플랫폼: ${value}`)
  }
  return value
}

/**
 * 채팅 읽기용 자격증명. 기본은 익명이며, 치지직만 선택적으로 NID 쿠키를 씁니다.
 * 룰렛은 도네 이벤트만 필요하므로 대부분의 경우 익명 읽기로 충분합니다.
 */
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
