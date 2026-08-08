import type { Platform } from '@stream/core'
import type { DonationRule } from './rules'
import type { Segment } from './spin'

export type ItemSource = 'donation' | 'manual'

/** 룰렛 원판에 등록된 한 항목. */
export interface RouletteItem {
  id: string
  label: string
  count: number
  color?: string
  source: ItemSource
  /** 이 항목에 기여한 닉네임들(도네 등록 시 누적). */
  contributors: string[]
  createdAt: number
  updatedAt: number
}

/** 당첨 후 해당 항목을 어떻게 처리할지. */
export type WinnerAction = 'keep' | 'decrement' | 'remove'

/** 원판 칸 크기를 개수 비례로 할지, 균등 분할할지. */
export type WeightMode = 'proportional' | 'even'

export type LogKind = 'registered' | 'rejected' | 'manual' | 'spin' | 'system'

export interface LogEntry {
  id: string
  kind: LogKind
  message: string
  platform?: Platform
  /** 시청자 닉네임이 있으면 로그 UI에서 색상 강조에 사용합니다. */
  nickname?: string
  at: number
}

export interface TimerState {
  isOpen: boolean
  /** null이면 무제한(수동으로 마감할 때까지 유지). */
  openUntil: number | null
}

export interface SpinResult {
  itemId: string
  label: string
  /** 최종 회전 각도(도). 애니메이션 종료 시 원판 rotate 값. */
  rotation: number
  segments: Segment[]
  at: number
}

export interface RehearsalDonationInput {
  nickname: string
  amount: number
  text?: string
}

export interface RouletteSnapshot {
  title: string
  platform: Platform
  streamerId: string
  items: RouletteItem[]
  rule: DonationRule
  timer: TimerState
  weightMode: WeightMode
  winnerAction: WinnerAction
  log: LogEntry[]
  history: LogEntry[]
  lastResult: SpinResult | null
  updatedAt: number
}
