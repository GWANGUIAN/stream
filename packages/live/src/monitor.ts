import type { StreamApi } from '@stream/api'
import type { ChannelLiveState, Platform } from '@stream/core'
import type { EventBus } from '@stream/events'

export interface LiveChannelRef {
  platform: Platform
  channelId: string
  api: StreamApi
}

export interface LiveMonitorOptions {
  channels: LiveChannelRef[]
  /** 폴링 주기(ms). 기본 30s. 너무 낮추지 마세요. */
  intervalMs?: number
  bus?: EventBus
  onChange?: (state: ChannelLiveState, previous?: ChannelLiveState) => void
}

export interface MergedLiveState {
  anyLive: boolean
  channels: ChannelLiveState[]
  startedAt?: number
}

/**
 * 방송 시작/종료·타이틀 변경을 폴링으로 감지합니다.
 * 멀티 채널(숲+치직) 상태를 머지할 수 있습니다.
 */
export class LiveMonitor {
  private readonly channels: LiveChannelRef[]
  private readonly intervalMs: number
  private readonly bus?: EventBus
  private readonly onChange?: LiveMonitorOptions['onChange']
  private readonly previous = new Map<string, ChannelLiveState>()
  private timer: ReturnType<typeof setInterval> | undefined
  private sessionStartedAt: number | undefined
  private running = false

  constructor(options: LiveMonitorOptions) {
    this.channels = options.channels
    this.intervalMs = options.intervalMs ?? 30_000
    this.bus = options.bus
    this.onChange = options.onChange
  }

  start(): void {
    if (this.running) return
    this.running = true
    void this.tick()
    this.timer = setInterval(() => void this.tick(), this.intervalMs)
  }

  stop(): void {
    this.running = false
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  getMerged(): MergedLiveState {
    const channels = [...this.previous.values()]
    const anyLive = channels.some((c) => c.live)
    return {
      anyLive,
      channels,
      startedAt: anyLive ? this.sessionStartedAt : undefined,
    }
  }

  /** `1시간 23분` 형태의 uptime 문자열. 오프라인이면 `오프라인`. */
  formatUptime(now = Date.now()): string {
    const merged = this.getMerged()
    if (!merged.anyLive || merged.startedAt == null) return '오프라인'
    const sec = Math.max(0, Math.floor((now - merged.startedAt) / 1000))
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    if (h > 0) return `${h}시간 ${m}분`
    return `${m}분`
  }

  async tick(): Promise<void> {
    for (const channel of this.channels) {
      try {
        const live = await channel.api.getLive(channel.channelId)
        const key = `${channel.platform}:${channel.channelId}`
        const prev = this.previous.get(key)
        this.previous.set(key, live)

        const changed =
          !prev ||
          prev.live !== live.live ||
          prev.title !== live.title ||
          prev.category !== live.category

        if (live.live && !prev?.live) {
          this.sessionStartedAt = live.startedAt
            ? Date.parse(live.startedAt) || Date.now()
            : Date.now()
        }
        if (!live.live && prev?.live) {
          const stillLive = [...this.previous.values()].some((c) => c.live)
          if (!stillLive) this.sessionStartedAt = undefined
        }

        if (changed) {
          this.onChange?.(live, prev)
          this.bus?.emit({
            type: 'live',
            platform: channel.platform,
            channelId: channel.channelId,
            live,
            previous: prev,
            at: Date.now(),
          })
        }
      } catch {
        // 개별 채널 실패는 다음 틱에서 재시도
      }
    }
  }
}

export function createLiveMonitor(options: LiveMonitorOptions): LiveMonitor {
  return new LiveMonitor(options)
}
