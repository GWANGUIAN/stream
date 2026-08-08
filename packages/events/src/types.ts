import type { ChatEvent } from '@stream/chat'
import type { ChannelLiveState, Platform } from '@stream/core'

/** 앱 공통으로 흐르는 정규화 이벤트. */
export type StreamEvent =
  | ChatEvent
  | {
      type: 'live'
      platform: Platform
      channelId: string
      live: ChannelLiveState
      previous?: ChannelLiveState
      at: number
    }

export type StreamEventHandler = (event: StreamEvent) => void

export type StreamEventFilter = (event: StreamEvent) => boolean

export interface EventBusOptions {
  /** 동일 id/내용의 짧은 중복 이벤트 억제 창(ms). 0이면 비활성. */
  dedupeWindowMs?: number
  /** 이벤트 키 추출. 기본은 type+platform+text/amount 휴리스틱. */
  dedupeKey?: (event: StreamEvent) => string | undefined
}

export interface SubscribeOptions {
  filter?: StreamEventFilter
  /** 같은 구독자에 대한 debounce(ms). 0/미설정이면 즉시 전달. */
  debounceMs?: number
  /** 허용 이벤트 타입만 통과. */
  types?: readonly StreamEvent['type'][]
  platforms?: readonly Platform[]
  /** donation 전용: 이 금액 이상만. */
  minDonationAmount?: number
  /** message 전용: 텍스트에 포함될 키워드(대소문자 무시). */
  keywords?: readonly string[]
}
