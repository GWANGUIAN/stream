import { createStreamApi, type SoopChatConnection } from '@stream/api'
import { anonymousCredential, type Credential } from '@stream/auth'
import { ChatConnectionError, type Platform } from '@stream/core'
import WebSocket from 'ws'
import { BaseChatClient } from '../base'
import type { ChatClientOptions } from '../types'
import { normalizeSoopPacket } from './normalize'
import {
  connectPayload,
  decodePackets,
  encodePacket,
  enterPayload,
  pingPayload,
  SVC,
} from './packet'

const PING_INTERVAL_MS = 60_000

export interface SoopChatClientOptions extends ChatClientOptions {
  /** sooplive.co.kr 또는 sooplive.com */
  domain?: string
}

/**
 * SOOP 비공식 채팅 WebSocket 클라이언트.
 *
 * 채팅 서버 인증서가 호스트명과 맞지 않아 Node에서는 rejectUnauthorized: false가
 * 필요합니다. 패킷 길이는 반드시 Buffer.byteLength(utf8)로 계산합니다.
 */
export class SoopChatClient extends BaseChatClient {
  readonly platform: Platform = 'soop'

  private readonly credential: Credential
  private readonly domain: string
  private readonly fetchImpl?: typeof globalThis.fetch

  private ws: WebSocket | null = null
  private buffer = Buffer.alloc(0)
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private chatNo: string | null = null
  private enterSent = false

  constructor(options: SoopChatClientOptions) {
    super(options.channelId)
    this.credential = options.credential ?? anonymousCredential('soop')
    this.domain = options.domain ?? 'sooplive.co.kr'
    this.fetchImpl = options.fetch
  }

  async connect(): Promise<void> {
    this.closed = false
    this.enterSent = false
    this.buffer = Buffer.alloc(0)
    this.emitStatus('connecting')

    const api = createStreamApi({
      platform: 'soop',
      credential: this.credential,
      fetch: this.fetchImpl,
      soopDomain: this.domain,
    })
    const session = (await api.getChatConnection(this.channelId)) as SoopChatConnection
    this.chatNo = session.chatNo
    const authTicket = session.authTicket

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const ws = new WebSocket(session.webSocketUrl, ['chat'], {
        rejectUnauthorized: false,
        origin: `https://play.${this.domain}`,
      })
      this.ws = ws

      const settleOk = () => {
        if (settled) return
        settled = true
        this.emitStatus('connected', `chatNo=${session.chatNo}`)
        this.startPing()
        resolve()
      }

      const settleErr = (error: Error) => {
        if (settled) return
        settled = true
        reject(
          new ChatConnectionError(`SOOP 채팅 연결 실패: ${error.message}`, {
            platform: 'soop',
            cause: error,
          }),
        )
      }

      ws.on('open', () => {
        this.sendPacket(SVC.CONNECT, connectPayload(authTicket))
      })

      ws.on('error', (error) => settleErr(error))

      ws.on('message', (data) => {
        const chunk = Buffer.from(data as Buffer)
        this.buffer = Buffer.concat([this.buffer, chunk])
        const { packets, rest } = decodePackets(this.buffer)
        this.buffer = Buffer.from(rest)

        for (const packet of packets) {
          if (packet.svc === SVC.CONNECT && !this.enterSent && this.chatNo) {
            this.enterSent = true
            this.sendPacket(SVC.ENTER, enterPayload(this.chatNo))
            continue
          }
          if (packet.svc === SVC.ENTER) {
            settleOk()
          }
          for (const event of normalizeSoopPacket(packet)) {
            this.emit(event)
          }
        }
      })

      ws.on('close', () => {
        if (!settled) {
          settleErr(new Error('핸드셰이크 전에 소켓이 닫혔습니다'))
        } else if (!this.closed) {
          this.emitStatus('disconnected', '소켓이 닫혔습니다')
        }
      })
    })
  }

  async disconnect(): Promise<void> {
    this.closed = true
    this.stopPing()
    if (this.ws) {
      try {
        this.sendPacket(SVC.EXIT, '\f')
      } catch {
        // ignore
      }
      this.ws.removeAllListeners()
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
    this.emitStatus('disconnected')
  }

  private sendPacket(svc: string, payload: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(encodePacket(svc, payload))
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      this.sendPacket(SVC.PING, pingPayload())
    }, PING_INTERVAL_MS)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}
