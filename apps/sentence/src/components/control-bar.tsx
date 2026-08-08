'use client'

import { Dices, History, Play, RotateCcw, Square } from 'lucide-react'
import type { SentenceStore, SentenceStoreSnapshot } from '@/lib/store'

export interface ControlBarProps {
  store: SentenceStore
  snapshot: SentenceStoreSnapshot
  onOpenHistory: () => void
  animating?: boolean
}

export function ControlBar({ store, snapshot, onOpenHistory, animating }: ControlBarProps) {
  const { phase, durationSec, sections } = snapshot
  const hasCandidates = sections.some((s) => s.enabled && s.entries.length > 0)

  return (
    <div className="control-bar">
      {(phase === 'idle' || phase === 'revealed') && (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => store.engine.start()}
        >
          <Play size={18} />
          {durationSec > 0 ? `${durationSec}초 수집 시작` : '수집 시작 (무제한)'}
        </button>
      )}

      {phase === 'collecting' && (
        <div className="control-bar-secondary">
          <button type="button" className="btn btn-sm" onClick={() => store.engine.extend(30)}>
            +30초
          </button>
          <button type="button" className="btn btn-danger" onClick={() => store.engine.close()}>
            <Square size={15} /> 지금 마감
          </button>
          <button
            type="button"
            className="btn btn-brand"
            disabled={!hasCandidates || animating}
            onClick={() => {
              store.engine.close()
              store.engine.spinAll()
            }}
          >
            <Dices size={15} /> 바로 전체 뽑기
          </button>
        </div>
      )}

      {(phase === 'closed' || phase === 'spinning') && (
        <div className="control-bar-secondary">
          <button
            type="button"
            className="btn btn-brand btn-lg"
            disabled={!hasCandidates || animating}
            onClick={() => store.engine.spinAll()}
          >
            <Dices size={18} /> 전체 뽑기
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => store.engine.reset()}>
            <RotateCcw size={15} /> 초기화
          </button>
        </div>
      )}

      {phase === 'revealed' && (
        <div className="control-bar-secondary">
          <button
            type="button"
            className="btn btn-brand"
            disabled={!hasCandidates || animating}
            onClick={() => store.engine.spinAll()}
          >
            <Dices size={15} /> 다시 뽑기
          </button>
          <button type="button" className="btn btn-ghost" onClick={onOpenHistory}>
            <History size={15} /> 히스토리
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => store.engine.reset()}>
            <RotateCcw size={15} /> 초기화
          </button>
        </div>
      )}
    </div>
  )
}
