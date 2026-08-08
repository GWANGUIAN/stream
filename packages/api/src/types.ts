import type { Credential } from '@stream/auth'
import type { ChannelLiveState, Platform, StreamerInfo } from '@stream/core'

/** 치지직 비공식 채팅 WebSocket 연결 정보. */
export interface ChzzkChatConnection {
  platform: 'chzzk'
  chatChannelId: string
  accessToken: string
  extraToken?: string
  userIdHash?: string
  webSocketUrl: string
}

/** SOOP 비공식 채팅 WebSocket 연결 정보. */
export interface SoopChatConnection {
  platform: 'soop'
  streamerId: string
  chatDomain: string
  chatPort: number
  chatNo: string
  ftk?: string
  broadcastNo?: string
  webSocketUrl: string
  authTicket?: string
  raw?: unknown
}

export type ChatConnection = ChzzkChatConnection | SoopChatConnection

/**
 * 방송 컨텐츠 앱이 쓰는 플랫폼 데이터 API.
 *
 * 인증(@stream/auth)과 분리되어 있습니다. Credential을 넘기면 쿠키 권한이
 * 필요한 호출에 쓰이고, 없으면 익명으로 읽습니다.
 */
export interface StreamApi {
  readonly platform: Platform
  getStreamer(channelId: string): Promise<StreamerInfo>
  getLive(channelId: string): Promise<ChannelLiveState>
  getChatConnection(channelId: string): Promise<ChatConnection>
}

export interface CreateStreamApiOptions {
  platform: Platform
  credential?: Credential
  fetch?: typeof globalThis.fetch
  /** SOOP 도메인. 기본 sooplive.co.kr */
  soopDomain?: string
}
