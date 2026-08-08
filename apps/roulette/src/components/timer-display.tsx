'use client'

import type { TimerState } from '@stream/roulette'
import { useEffect, useState } from 'react'
import { formatCountdown } from '@/lib/format'
import type { RouletteStore } from '@/lib/store'

export interface TimerDisplayProps {
  store: RouletteStore
  timer: TimerState
}

/** 제목 아래에서 접수 남은 시간을 크게 보여주는 상시 표시용 위젯. */
export function TimerDisplay({ store, timer }: TimerDisplayProps) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!timer.isOpen) return
    const id = window.setInterval(() => {
      store.engine.getRemainingMs()
      forceTick((t) => t + 1)
    }, 250)
    return () => window.clearInterval(id)
  }, [timer.isOpen, store])

  const remainingMs = timer.isOpen ? store.engine.getRemainingMs() : null
  const isHot = remainingMs != null && remainingMs <= 10_000

  return (
    <div className={`timer-display ${timer.isOpen ? 'open' : 'closed'} ${isHot ? 'hot' : ''}`}>
      <span className="timer-display-dot" />
      {timer.isOpen ? (
        remainingMs != null ? (
          <span className="timer-display-value mono-num">{formatCountdown(remainingMs)}</span>
        ) : (
          <span className="timer-display-value">무제한 접수 중</span>
        )
      ) : (
        <span className="timer-display-value muted">마감됨</span>
      )}
    </div>
  )
}
