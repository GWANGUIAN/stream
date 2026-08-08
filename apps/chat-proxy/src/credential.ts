import { anonymousCredential, type Credential, cookieCredential } from '@stream/auth'
import type { Platform } from '@stream/core'

/**
 * 채팅 읽기용 자격증명. 기본은 익명이며, 치지직만 선택적으로 NID 쿠키를 씁니다.
 */
export function chatCredential(platform: Platform): Credential {
  const aut = process.env.CHZZK_NID_AUT?.trim()
  const ses = process.env.CHZZK_NID_SES?.trim()
  if (platform === 'chzzk' && aut && ses) {
    return cookieCredential('chzzk', {
      NID_AUT: aut,
      NID_SES: ses,
    })
  }
  return anonymousCredential(platform)
}
