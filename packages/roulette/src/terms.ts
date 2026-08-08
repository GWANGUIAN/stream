import type { Platform } from '@stream/core'

/**
 * 플랫폼별로 다르게 불리는 후원 단위 용어.
 * SOOP은 "별풍선", 치지직은 "치즈"를 씁니다.
 */
export interface PlatformTerms {
  platform: Platform
  currency: string
  unit: string
  streamerLabel: string
  idPlaceholder: string
  verb: string
}

export const PLATFORM_TERMS: Record<Platform, PlatformTerms> = {
  soop: {
    platform: 'soop',
    currency: '별풍선',
    unit: '개',
    streamerLabel: '스트리머 아이디',
    idPlaceholder: '예: gameng',
    verb: '쐈어요',
  },
  chzzk: {
    platform: 'chzzk',
    currency: '치즈',
    unit: '개',
    streamerLabel: '채널 ID',
    idPlaceholder: '예: 32자리 채널 코드',
    verb: '후원했어요',
  },
}

export function termsFor(platform: Platform): PlatformTerms {
  return PLATFORM_TERMS[platform]
}
