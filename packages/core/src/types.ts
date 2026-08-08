/** 지원 플랫폼. */
export type Platform = 'chzzk' | 'soop'

export const PLATFORMS = ['chzzk', 'soop'] as const satisfies readonly Platform[]

export const PLATFORM_LABELS: Record<Platform, string> = {
  chzzk: '치지직',
  soop: 'SOOP',
}

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value)
}

/** 스트리머/채널의 정적 정보. */
export interface StreamerInfo {
  platform: Platform
  /** 치지직은 channelId(해시), SOOP은 user_id(로그인 아이디). */
  id: string
  name: string
  profileImageUrl?: string
  followerCount?: number
  description?: string
  /** 사람이 볼 수 있는 채널 페이지 주소. */
  url: string
}

/** 채널의 현재 방송 상태. */
export interface ChannelLiveState {
  platform: Platform
  channelId: string
  live: boolean
  title?: string
  category?: string
  viewerCount?: number
  startedAt?: string
  thumbnailUrl?: string
  adult?: boolean
  /**
   * 치지직 채팅 연결에 필요한 값. 스트리머가 방송을 재시작할 때마다 바뀌므로
   * 장시간 연결에서는 주기적으로 다시 조회해야 합니다.
   */
  chatChannelId?: string
  /**
   * 플랫폼별 원본 응답. SOOP 채팅은 여기 담긴 CHDOMAIN/CHPT/CHATNO/FTK가 필요합니다.
   */
  raw?: unknown
}

export type ChatUserRole = 'streamer' | 'manager' | 'viewer'

/** 채팅 참여자. 플랫폼별 등급 체계를 배지 문자열로 평탄화합니다. */
export interface ChatUser {
  platform: Platform
  id: string
  nickname: string
  profileImageUrl?: string
  role: ChatUserRole
  badges: string[]
}

export const CHANNEL_URL: Record<Platform, (id: string) => string> = {
  chzzk: (id) => `https://chzzk.naver.com/${id}`,
  soop: (id) => `https://ch.sooplive.co.kr/${id}`,
}
