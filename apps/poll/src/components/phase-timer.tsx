'use client'

import type { PollPhase } from '@stream/poll'
import { CheckCircle2, Circle, Lock, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatCountdown } from '@/lib/format'
import type { PollStore } from '@/lib/store'

export interface PhaseTimerProps {
  store: PollStore
  phase: PollPhase
  endsAt: number | null
}

const PHASE_LABEL: Record<PollPhase, string> = {
  idle: '대기 중',
  running: '투표 진행 중',
  closed: '마감됨 · 공개 대기',
  revealed: '결과 공개됨',
}

const PHASE_ICON: Record<PollPhase, typeof Circle> = {
  idle: Circle,
  running: Play,
  closed: Lock,
  revealed: CheckCircle2,
}

export function PhaseTimer({ store, phase, endsAt }: PhaseTimerProps) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (phase !== 'running' || endsAt == null) return
    const id = window.setInterval(() => {
      store.engine.getRemainingMs()
      forceTick((t) => t + 1)
    }, 250)
    return () => window.clearInterval(id)
  }, [phase, endsAt, store])

  const remainingMs = phase === 'running' ? store.engine.getRemainingMs() : null
  const isHot = remainingMs != null && remainingMs <= 10_000
  const Icon = PHASE_ICON[phase]

  return (
    <div className="phase-row">
      <span className={`phase-badge ${phase}`}>
        <Icon size={14} />
        {PHASE_LABEL[phase]}
      </span>
      {phase === 'running' && (
        <span className={`timer-value ${isHot ? 'hot' : ''}`}>
          {remainingMs != null ? formatCountdown(remainingMs) : '무제한'}
        </span>
      )}
    </div>
  )
}
