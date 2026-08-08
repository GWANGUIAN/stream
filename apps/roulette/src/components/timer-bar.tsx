'use client'

import type { TimerState } from '@stream/roulette'
import { useEffect, useState } from 'react'
import { formatCountdown } from '@/lib/format'
import type { RouletteStore } from '@/lib/store'

export interface TimerBarProps {
  store: RouletteStore
  timer: TimerState
}

/** 접수 시작/연장/마감을 아이템 목록 바로 위에서 바로 조작할 수 있는 위젯. */
export function TimerBar({ store, timer }: TimerBarProps) {
  const [minutes, setMinutes] = useState(5)
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (!timer.isOpen) return
    const id = window.setInterval(() => {
      store.engine.getRemainingMs()
      forceTick((t) => t + 1)
    }, 500)
    return () => window.clearInterval(id)
  }, [timer.isOpen, store])

  const remainingMs = timer.isOpen ? store.engine.getRemainingMs() : null
  const isHot = remainingMs != null && remainingMs <= 10_000

  return (
    <section className="glass-panel timer-bar">
      <div className="timer-bar-head">
        <h2 className="glass-panel-title">접수 타이머</h2>
        <span className={`badge timer-badge ${isHot ? 'hot' : ''}`}>
          <span className={`badge-dot ${timer.isOpen ? 'ok' : ''}`} />
          {timer.isOpen ? (
            remainingMs != null ? (
              <span className="mono-num">{formatCountdown(remainingMs)}</span>
            ) : (
              '무제한 접수 중'
            )
          ) : (
            '마감됨'
          )}
        </span>
      </div>

      <div className="field-row">
        <input
          type="number"
          min={1}
          value={minutes}
          onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
          style={{ flex: '0 0 4.5rem' }}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => store.engine.openRegistration(minutes * 60 * 1000)}
        >
          {minutes}분 시작
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => store.engine.openRegistration()}
        >
          무제한 시작
        </button>
      </div>

      <div className="field-row" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => store.engine.extendRegistration(60_000)}
        >
          +1분
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => store.engine.extendRegistration(300_000)}
        >
          +5분
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={() => store.engine.closeRegistration()}
        >
          지금 마감
        </button>
      </div>
    </section>
  )
}
