import type { ChatDonationEvent } from '@stream/chat'
import type { Platform } from '@stream/core'

export type AlertKind = 'donation' | 'subscription' | 'custom'

export interface AlertItem {
  id: string
  kind: AlertKind
  platform: Platform
  title: string
  subtitle?: string
  amount?: number
  currency?: string
  /** 표시 우선순위. 클수록 먼저. */
  priority: number
  /** 최소 표시 시간(ms). */
  durationMs: number
  createdAt: number
  /** TTS에 넘길 문구. */
  speakText?: string
  soundUrl?: string
  imageUrl?: string
  raw?: unknown
}

export interface AlertQueueOptions {
  /** 동시에 하나만 표시. 기본 true. */
  exclusive?: boolean
  defaultDonationDurationMs?: number
  defaultSubscriptionDurationMs?: number
  minDonationAmount?: number
  /** 금액→우선순위. 기본 amount 자체. */
  donationPriority?: (event: ChatDonationEvent) => number
  now?: () => number
  idFactory?: () => string
}

export type AlertQueueListener = (alert: AlertItem | null) => void
