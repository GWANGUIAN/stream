'use client'

import { History, Play, RotateCcw, Sparkles, Square } from 'lucide-react'
import type { PollStore, PollStoreSnapshot } from '@/lib/store'

export interface ControlBarProps {
  store: PollStore
  snapshot: PollStoreSnapshot
  onOpenHistory: () => void
}

export function ControlBar({ store, snapshot, onOpenHistory }: ControlBarProps) {
  const { phase, options, durationSec } = snapshot
  const validOptionCount = options.filter((o) => o.label.trim()).length
  const canStart = validOptionCount >= 2

  return (
    <div className="control-bar">
      {phase === 'idle' && (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!canStart}
          onClick={() => store.engine.start()}
        >
          <Play size={18} />
          {durationSec > 0 ? `${durationSec}초 투표 시작` : '투표 시작 (무제한)'}
        </button>
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
