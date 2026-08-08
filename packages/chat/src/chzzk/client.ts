import { type ChzzkChatConnection, createStreamApi } from '@stream/api'
import { anonymousCredential, type Credential } from '@stream/auth'
import { ChatConnectionError, type Platform } from '@stream/core'
import WebSocket from 'ws'
import { BaseChatClient } from '../base'
import type { ChatClientOptions } from '../types'
import { normalizeChzzkBody } from './normalize'

const CMD = {
  PING: 0,
  PONG: 10_000,
  CONNECT: 100,
  CONNECTED: 10_100,
  CHAT: 93_101,
  DONATION: 93_102,
  RECENT: 15_101,
} as const

const CHAT_CHANNEL_POLL_MS = 30_000
const SERVER_SILENCE_MS = 20_000

export interface ChzzkChatClientOptions extends ChatClientOptions {
  /** chatChannelId 변경 폴링 주기. 기본 30초. */
  pollIntervalMs?: number
}

/**
 * 치지직 비공식 채팅 WebSocket 클라이언트.
 *
 * chatChannelId는 방송 재시작마다 바뀌므로 주기적으로 live-status를 다시 보고,
 * 바뀌면 소켓을 갈아끼웁니다.
 */
export class ChzzkChatClient extends BaseChatClient {
  readonly platform: Platform = 'chzzk'

  private readonly credential: Credential
  private readonly fetchImpl?: typeof globalThis.fetch
  private readonly pollIntervalMs: number

  private ws: WebSocket | null = null
  private sid: string | null = null
  private chatChannelId: string | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private silenceTimer: ReturnType<typeof setTimeout> | null = null
  private tid = 1

  constructor(options: ChzzkChatClientOptions) {
    super(options.channelId)
    this.credential = options.credential ?? anonymousCredential('chzzk')
    this.fetchImpl = options.fetch
    this.pollIntervalMs = options.pollIntervalMs ?? CHAT_CHANNEL_POLL_MS
  }

  async connect(): Promise<void> {
    if (this.closed) this.closed = false
    this.emitStatus('connecting')
    await this.openSocket()
    this.startPolling()
  }

  async disconnect(): Promise<void> {
    this.closed = true
    this.stopPolling()
    this.clearSilenceTimer()
    this.closeSocket()
    this.emitStatus('disconnected')
  }

  private async openSocket(): Promise<void> {
    const api = createStreamApi({
      platform: 'chzzk',
      credential: this.credential,
      fetch: this.fetchImpl,
    })
    const access = (await api.getChatConnection(this.channelId)) as ChzzkChatConnection
    this.chatChannelId = access.chatChannelId

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(access.webSocketUrl)
      this.ws = ws

      const onOpen = () => {
        cleanup()
        this.send({
          ver: '2',
          cmd: CMD.CONNECT,
          svcid: 'game',
          cid: access.chatChannelId,
          bdy: {
            uid: access.userIdHash ?? null,
            devType: 2001,
            accTkn: access.accessToken,
            auth: access.userIdHash ? 'SEND' : 'READ',
          },
          tid: this.nextTid(),
        })
        this.emitStatus('connected', `chatChannelId=${access.chatChannelId}`)
        this.armSilenceTimer()
        resolve()
      }

      const onError = (error: Error) => {
        cleanup()
        reject(
          new ChatConnectionError(`치지직 채팅 연결 실패: ${error.message}`, {
            platform: 'chzzk',
            cause: error,
          }),
        )
      }

      const cleanup = () => {
        ws.off('open', onOpen)
        ws.off('error', onError)
      }

      ws.on('open', onOpen)
      ws.on('error', onError)
      ws.on('message', (data) => this.onMessage(data))
      ws.on('close', () => {
        if (!this.closed) this.emitStatus('disconnected', '소켓이 닫혔습니다')
      })
    })
  }

  private onMessage(data: WebSocket.RawData): void {
    this.armSilenceTimer()
    let frame: Record<string, unknown>
    try {
      frame = JSON.parse(data.toString()) as Record<string, unknown>
    } catch {
      return
    }

    const cmd = Number(frame.cmd)
    if (cmd === CMD.PING) {
      this.send({ ver: '2', cmd: CMD.PONG })
      return
    }

    if (cmd === CMD.CONNECTED) {
      const bdy = frame.bdy as { sid?: string } | undefined
      this.sid = bdy?.sid ?? null
      return
    }

    if (cmd === CMD.CHAT || cmd === CMD.DONATION || cmd === CMD.RECENT) {
      for (const event of normalizeChzzkBody(frame.bdy)) {
        this.emit(event)
      }
    }
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    if (this.sid && payload.sid === undefined) payload.sid = this.sid
    this.ws.send(JSON.stringify(payload))
  }

  private nextTid(): number {
    return this.tid++
  }

  private startPolling(): void {
    this.stopPolling()
    this.pollTimer = setInterval(() => {
      void this.checkChatChannel()
    }, this.pollIntervalMs)
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async checkChatChannel(): Promise<void> {
    if (this.closed) return
    try {
      const api = createStreamApi({
        platform: 'chzzk',
        credential: this.credential,
        fetch: this.fetchImpl,
      })
      const live = await api.getLive(this.channelId)
      if (!live.chatChannelId) return
      if (live.chatChannelId !== this.chatChannelId) {
        this.emitStatus('reconnecting', 'chatChannelId가 변경되어 재연결합니다')
        this.closeSocket()
        await this.openSocket()
      }
    } catch (error) {
      this.emitStatus('error', error instanceof Error ? error.message : 'live-status 폴링 실패')
    }
  }

  private armSilenceTimer(): void {
    this.clearSilenceTimer()
    this.silenceTimer = setTimeout(() => {
      // 서버 침묵이 길면 우리가 ping을 보냅니다.
      this.send({ ver: '2', cmd: CMD.PING })
      this.armSilenceTimer()
    }, SERVER_SILENCE_MS)
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }

  private closeSocket(): void {
    if (this.ws) {
      this.ws.removeAllListeners()
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
    this.sid = null
  }
}
