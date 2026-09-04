import { isPlatform, type Platform } from './types'

const STORAGE_KEY = 'stream:last-connection:v1'

export interface LastConnection {
  platform: Platform
  streamerId: string
}

/**
 * 방송 도구 앱들(roulette/poll/sentence)은 같은 오리진(streamcontent.click)의
 * 서로 다른 경로에 배포되므로 localStorage를 공유합니다. 한 도구에서 연동한
 * 플랫폼·채널 ID를 다른 도구에서도 그대로 이어 쓸 수 있도록 이 키에 기록합니다.
 */
export function getLastConnection(): LastConnection | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Partial<LastConnection>
    if (!isPlatform(parsed.platform) || !parsed.streamerId) return undefined
    return { platform: parsed.platform, streamerId: parsed.streamerId }
  } catch {
    return undefined
  }
}

export function setLastConnection(platform: Platform, streamerId: string): void {
  if (typeof window === 'undefined') return
  const id = streamerId.trim()
  if (!id) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ platform, streamerId: id }))
  } catch {
    // 저장 공간 부족 등은 조용히 무시합니다.
  }
}
