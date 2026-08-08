import type { Credential } from '@stream/auth'
import {
  AuthError,
  type ChannelLiveState,
  HttpClient,
  ProviderError,
  type StreamerInfo,
} from '@stream/core'
import type { ChzzkChatConnection, StreamApi } from '../types'
import { CHZZK_API_BASE, CHZZK_GAME_API_BASE, CHZZK_UNOFFICIAL_HEADERS } from './constants'
import {
  chzzkChatAccessTokenSchema,
  chzzkChatWebSocketUrl,
  chzzkUserStatusSchema,
  toChannelLiveState,
  toStreamerInfo,
} from './schema'

export interface ChzzkApiOptions {
  credential?: Credential
  fetch?: typeof globalThis.fetch
  apiBaseUrl?: string
  gameApiBaseUrl?: string
}

export class ChzzkStreamApi implements StreamApi {
  readonly platform = 'chzzk' as const

  private readonly cookies: Record<string, string>
  private readonly api: HttpClient
  private readonly gameApi: HttpClient

  constructor(options: ChzzkApiOptions = {}) {
    const credential = options.credential
    if (credential && credential.platform !== 'chzzk') {
      throw new AuthError('치지직 자격증명이 필요합니다.', { platform: 'chzzk' })
    }
    this.cookies = credential?.kind === 'cookie' ? credential.cookies : {}
    this.api = new HttpClient({
      baseUrl: options.apiBaseUrl ?? CHZZK_API_BASE,
      platform: 'chzzk',
      fetch: options.fetch,
      headers: CHZZK_UNOFFICIAL_HEADERS,
    })
    this.gameApi = new HttpClient({
      baseUrl: options.gameApiBaseUrl ?? CHZZK_GAME_API_BASE,
      platform: 'chzzk',
      fetch: options.fetch,
      headers: CHZZK_UNOFFICIAL_HEADERS,
    })
  }

  private get hasSessionCookies(): boolean {
    return Boolean(this.cookies.NID_AUT && this.cookies.NID_SES)
  }

  async getStreamer(channelId: string): Promise<StreamerInfo> {
    const data = await this.api.json(`/service/v1/channels/${channelId}`, {
      cookies: this.hasSessionCookies ? this.cookies : undefined,
      label: `chzzk/channel/${channelId}`,
    })
    try {
      return toStreamerInfo(channelId, data)
    } catch (cause) {
      throw new ProviderError(cause instanceof Error ? cause.message : '치지직 채널 조회 실패', {
        platform: 'chzzk',
        cause,
        body: data,
      })
    }
  }

  async getLive(channelId: string): Promise<ChannelLiveState> {
    const data = await this.api.json(`/polling/v2/channels/${channelId}/live-status`, {
      cookies: this.hasSessionCookies ? this.cookies : undefined,
      label: `chzzk/live-status/${channelId}`,
    })
    return toChannelLiveState(channelId, data)
  }

  async getChatConnection(channelId: string): Promise<ChzzkChatConnection> {
    const live = await this.getLive(channelId)
    if (!live.chatChannelId) {
      throw new ProviderError(
        '치지직 chatChannelId를 얻지 못했습니다. 방송 중이 아닐 수 있습니다.',
        { platform: 'chzzk', body: live.raw },
      )
    }

    let userIdHash: string | undefined
    if (this.hasSessionCookies) {
      userIdHash = await this.getCookieUserIdHash()
    }

    const data = await this.gameApi.json('/v1/chats/access-token', {
      query: {
        channelId: live.chatChannelId,
        chatType: 'STREAMING',
      },
      cookies: this.hasSessionCookies ? this.cookies : undefined,
      schema: chzzkChatAccessTokenSchema,
      label: 'chzzk/chats/access-token',
    })

    if (Number(data.code) !== 200 || !data.content) {
      throw new ProviderError(`치지직 chat access-token 실패: ${data.message ?? data.code}`, {
        platform: 'chzzk',
        code: data.code,
        body: data,
      })
    }

    return {
      platform: 'chzzk',
      chatChannelId: live.chatChannelId,
      accessToken: data.content.accessToken,
      extraToken: data.content.extraToken ?? undefined,
      userIdHash,
      webSocketUrl: chzzkChatWebSocketUrl(live.chatChannelId),
    }
  }

  private async getCookieUserIdHash(): Promise<string> {
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
    return data.content.userIdHash
  }
}
