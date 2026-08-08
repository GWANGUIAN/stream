import type { StreamApi } from '@stream/api'
import { CHANNEL_URL, type ChannelLiveState, type Platform, type StreamerInfo } from '@stream/core'

export interface MediaSnapshot {
  streamer: StreamerInfo
  live: ChannelLiveState
  channelUrl: string
  thumbnailUrl?: string
  /** 임베드/플레이어에 쓸 수 있는 후보 URL (플랫폼 정책에 따라 차단될 수 있음) */
  playerCandidates: string[]
}

/** 채널 페이지 URL. */
export function channelPageUrl(platform: Platform, channelId: string): string {
  return CHANNEL_URL[platform](channelId)
}

/**
 * 라이브 플레이어/임베드 후보 URL.
 * 실제 iframe 허용 여부는 플랫폼·브라우저 정책에 따릅니다.
 */
export function playerCandidateUrls(platform: Platform, channelId: string): string[] {
  if (platform === 'chzzk') {
    return [`https://chzzk.naver.com/live/${channelId}`, `https://chzzk.naver.com/${channelId}`]
  }
  return [`https://play.sooplive.co.kr/${channelId}`, `https://ch.sooplive.co.kr/${channelId}`]
}

export function pickThumbnail(live: ChannelLiveState, streamer?: StreamerInfo): string | undefined {
  return live.thumbnailUrl ?? streamer?.profileImageUrl
}

/**
 * StreamApi로 스트리머·라이브 메타를 한 번에 가져옵니다.
 * 클립 생성은 플랫폼 제약이 크므로 재생·메타부터 제공합니다.
 */
export async function fetchMediaSnapshot(
  api: StreamApi,
  channelId: string,
): Promise<MediaSnapshot> {
  const [streamer, live] = await Promise.all([api.getStreamer(channelId), api.getLive(channelId)])
  return {
    streamer,
    live,
    channelUrl: channelPageUrl(api.platform, channelId),
    thumbnailUrl: pickThumbnail(live, streamer),
    playerCandidates: playerCandidateUrls(api.platform, channelId),
  }
}

export interface VodHint {
  platform: Platform
  channelId: string
  /** 다시보기/클립 목록 페이지 추정 URL */
  listUrl: string
}

export function vodListHint(platform: Platform, channelId: string): VodHint {
  if (platform === 'chzzk') {
    return {
      platform,
      channelId,
      listUrl: `https://chzzk.naver.com/${channelId}/videos`,
    }
  }
  return {
    platform,
    channelId,
    listUrl: `https://ch.sooplive.co.kr/${channelId}/vods`,
  }
}
