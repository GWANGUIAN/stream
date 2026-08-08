'use client'

import {
  History,
  Infinity as InfinityIcon,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Timer,
} from 'lucide-react'
import type { PollStore, PollStoreSnapshot } from '@/lib/store'

export interface ControlBarProps {
  store: PollStore
  snapshot: PollStoreSnapshot
  onOpenHistory: () => void
}

const DURATION_PRESETS = [30, 60, 120, 180] as const

export function ControlBar({ store, snapshot, onOpenHistory }: ControlBarProps) {
  const { phase, options, durationSec } = snapshot
  const validOptionCount = options.filter((o) => o.label.trim()).length
  const canStart = validOptionCount >= 2

  return (
    <div className="control-bar">
      {phase === 'idle' && (
        <div className="control-bar-idle">
          <div className="control-bar-tools" aria-label="타이머 설정">
            <span className="control-bar-tools-label">
              <Timer size={14} />
              타이머
            </span>
            <div className="duration-presets control-duration-presets">
              {DURATION_PRESETS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className={`pill ${durationSec === sec ? 'active' : ''}`}
                  onClick={() => store.engine.setDurationSec(sec)}
                >
                  {sec}초
                </button>
              ))}
              <button
                type="button"
                className={`pill ${durationSec === 0 ? 'active' : ''}`}
                onClick={() => store.engine.setDurationSec(0)}
                title="시간 제한 없음"
              >
                <InfinityIcon size={14} />
                무제한
              </button>
            </div>
            <label className={`control-duration-custom ${durationSec > 0 ? 'active' : ''}`}>
              <input
                type="number"
                min={5}
                step={5}
                value={durationSec > 0 ? durationSec : ''}
                placeholder="초"
                aria-label="타이머 초 직접 입력"
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === '') {
                    store.engine.setDurationSec(0)
                    return
                  }
                  store.engine.setDurationSec(Math.max(5, Number(raw) || 5))
                }}
              />
              <span>초</span>
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!canStart}
            onClick={() => store.engine.start()}
          >
            <Play size={18} />
            {durationSec > 0 ? `${durationSec}초 투표 시작` : '투표 시작 (무제한)'}
          </button>
        </div>
      )}

      {phase === 'running' && (
        <div className="control-bar-secondary">
          <button type="button" className="btn btn-sm" onClick={() => store.engine.extend(30)}>
            +30초
          </button>
          <button type="button" className="btn btn-danger" onClick={() => store.engine.close()}>
            <Square size={15} /> 지금 마감
          </button>
          <button type="button" className="btn btn-brand" onClick={() => store.engine.reveal()}>
            <Sparkles size={15} /> 바로 결과 공개
          </button>
        </div>
      )}

      {phase === 'closed' && (
        <div className="control-bar-secondary">
          <button
            type="button"
            className="btn btn-brand btn-lg"
            onClick={() => store.engine.reveal()}
          >
            <Sparkles size={18} /> 결과 공개
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => store.engine.reset()}>
            <RotateCcw size={15} /> 취소하고 초기화
          </button>
        </div>
      )}

      {phase === 'revealed' && (
        <div className="control-bar-secondary">
          <button type="button" className="btn btn-primary" onClick={() => store.engine.reset()}>
            <RotateCcw size={15} /> 새 투표 시작
          </button>
          <button type="button" className="btn btn-ghost" onClick={onOpenHistory}>
            <History size={15} /> 히스토리
          </button>
        </div>
      )}
    </div>
  )
}
