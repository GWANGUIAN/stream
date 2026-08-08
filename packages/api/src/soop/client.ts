import type { Credential } from '@stream/auth'
import {
  AuthError,
  type ChannelLiveState,
  HttpClient,
  ProviderError,
  type StreamerInfo,
} from '@stream/core'
import type { SoopChatConnection, StreamApi } from '../types'
import {
  SOOP_DEFAULT_DOMAIN,
  soopChannelApiBase,
  soopLiveBase,
  soopOrigin,
  soopUnofficialHeaders,
} from './constants'
import { parseSoopChatSessionFields, toSoopLiveState, toSoopStreamerInfo } from './schema'

export interface SoopApiOptions {
  credential?: Credential
  fetch?: typeof globalThis.fetch
  domain?: string
}

export class SoopStreamApi implements StreamApi {
  readonly platform = 'soop' as const

  private readonly cookies: Record<string, string>
  private readonly domain: string
  private readonly liveHttp: HttpClient
  private readonly channelHttp: HttpClient

  constructor(options: SoopApiOptions = {}) {
    const credential = options.credential
    if (credential && credential.platform !== 'soop') {
      throw new AuthError('SOOP 자격증명이 필요합니다.', { platform: 'soop' })
    }
    this.cookies = credential?.kind === 'cookie' ? credential.cookies : {}
    this.domain = options.domain ?? SOOP_DEFAULT_DOMAIN
    const headers = soopUnofficialHeaders(this.domain)

    this.liveHttp = new HttpClient({
      baseUrl: soopLiveBase(this.domain),
      platform: 'soop',
      fetch: options.fetch,
      headers,
    })
    this.channelHttp = new HttpClient({
      baseUrl: soopChannelApiBase(this.domain),
      platform: 'soop',
      fetch: options.fetch,
      headers,
    })
  }

  private get hasAuthTicket(): boolean {
    return Boolean(this.cookies.AuthTicket)
  }

  async getStreamer(channelId: string): Promise<StreamerInfo> {
    const data = await this.channelHttp.json(`/api/${channelId}/station`, {
      cookies: this.hasAuthTicket ? this.cookies : undefined,
      label: `soop/station/${channelId}`,
    })
    try {
      return toSoopStreamerInfo(channelId, data)
    } catch (cause) {
      throw new ProviderError(cause instanceof Error ? cause.message : 'SOOP 스테이션 조회 실패', {
        platform: 'soop',
        cause,
        body: data,
      })
    }
  }

  async getLive(channelId: string): Promise<ChannelLiveState> {
    const data = await this.fetchPlayerLive(channelId)
    return toSoopLiveState(channelId, data)
  }

  async getChatConnection(channelId: string): Promise<SoopChatConnection> {
    const data = await this.fetchPlayerLive(channelId)
    try {
      const session = parseSoopChatSessionFields(channelId, data)
      return {
        platform: 'soop',
        ...session,
        authTicket: this.cookies.AuthTicket,
      }
    } catch (cause) {
      throw new ProviderError(
        cause instanceof Error ? cause.message : 'SOOP 채팅 세션을 만들지 못했습니다.',
        { platform: 'soop', cause, body: data },
      )
    }
  }

  private async fetchPlayerLive(streamerId: string): Promise<unknown> {
    return this.liveHttp.json(`/afreeca/player_live_api.php`, {
      method: 'POST',
      query: { bjid: streamerId },
      form: {
        bid: streamerId,
        type: 'live',
        pwd: '',
        player_type: 'html5',
        stream_type: 'common',
        quality: 'HD',
        mode: 'landing',
        from_api: 0,
        is_revive: false,
      },
      cookies: this.hasAuthTicket ? this.cookies : undefined,
      headers: {
        origin: `https://play.${this.domain}`,
        referer: `${soopOrigin(this.domain)}/`,
      },
      label: `soop/player_live/${streamerId}`,
    })
  }
}
