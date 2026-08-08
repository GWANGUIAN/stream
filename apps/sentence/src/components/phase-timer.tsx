'use client'

import type { SentencePhase } from '@stream/sentence'
import { CheckCircle2, Circle, Dices, Lock, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatCountdown } from '@/lib/format'
import type { SentenceStore } from '@/lib/store'

export interface PhaseTimerProps {
  store: SentenceStore
  phase: SentencePhase
  endsAt: number | null
}

const PHASE_LABEL: Record<SentencePhase, string> = {
  idle: '대기 중',
  collecting: '텍스트 받는 중',
  closed: '마감됨 · 뽑기 대기',
  spinning: '뽑는 중',
  revealed: '문장 완성',
}

const PHASE_ICON: Record<SentencePhase, typeof Circle> = {
  idle: Circle,
  collecting: Play,
  closed: Lock,
  spinning: Dices,
  revealed: CheckCircle2,
}

export function PhaseTimer({ store, phase, endsAt }: PhaseTimerProps) {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (phase !== 'collecting' || endsAt == null) return
    const id = window.setInterval(() => {
      store.engine.getRemainingMs()
      forceTick((t) => t + 1)
    }, 250)
    return () => window.clearInterval(id)
  }, [phase, endsAt, store])

  const remainingMs = phase === 'collecting' ? store.engine.getRemainingMs() : null
  const isHot = remainingMs != null && remainingMs <= 10_000
  const Icon = PHASE_ICON[phase]

  return (
    <div className="phase-row">
      <span className={`phase-badge ${phase}`}>
        <Icon size={14} />
        {PHASE_LABEL[phase]}
      </span>
      {phase === 'collecting' && (
        <span className={`timer-value ${isHot ? 'hot' : ''}`}>
          {remainingMs != null ? formatCountdown(remainingMs) : '무제한'}
        </span>
      )}
    </div>
  )
}
