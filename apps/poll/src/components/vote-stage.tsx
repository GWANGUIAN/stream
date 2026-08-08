'use client'

import type { PollOptionResult } from '@stream/poll'
import { MAX_POLL_OPTIONS } from '@stream/poll'
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import type { PollStore, PollStoreSnapshot } from '@/lib/store'

export interface VoteStageProps {
  store: PollStore
  snapshot: PollStoreSnapshot
}

export function VoteStage({ store, snapshot }: VoteStageProps) {
  const { phase, options, totals, totalVotes, winnerIds, settings } = snapshot

  if (phase === 'idle') {
    return (
      <div className="vote-stage">
        {options.map((option, index) => (
          <div key={option.id} className="vote-bar">
            <span className="vote-bar-alias">{index + 1}</span>
            <span className="vote-bar-input">
              <input
                value={option.label}
                placeholder={`항목 ${index + 1}`}
                onChange={(e) => store.engine.renameOption(option.id, e.target.value)}
                maxLength={30}
              />
            </span>
            <span className="vote-bar-editor-actions">
              <button
                type="button"
                aria-label="위로 이동"
                onClick={() => store.engine.moveOption(option.id, -1)}
                disabled={index === 0}
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                aria-label="아래로 이동"
                onClick={() => store.engine.moveOption(option.id, 1)}
                disabled={index === options.length - 1}
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                aria-label="삭제"
                onClick={() => store.engine.removeOption(option.id)}
                disabled={options.length <= 2}
              >
                <Trash2 size={14} />
              </button>
            </span>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm btn-secondary btn-block"
          onClick={() => store.engine.addOption(`항목 ${options.length + 1}`)}
          disabled={options.length >= MAX_POLL_OPTIONS}
        >
          <Plus size={14} /> 항목 추가 ({options.length}/{MAX_POLL_OPTIONS})
        </button>
      </div>
    )
  }

  // 결과(표/퍼센트/바)는 공개 옵션이 켜진 진행 중이거나, 결과 공개 후에만 표시합니다.
  const showResults = phase === 'revealed' || (phase === 'running' && settings.showLiveResults)
  const orderedTotals: PollOptionResult[] =
    phase === 'revealed' ? [...totals].sort((a, b) => a.rank - b.rank) : totals

  return (
    <div className="vote-stage">
      {orderedTotals.map((result, index) => {
        const isRevealed = phase === 'revealed'
        const isWinner = isRevealed && winnerIds.includes(result.id)
        const rankClass = isRevealed && isWinner ? `rank-${Math.min(result.rank, 3)}` : ''
        return (
          <div
            key={result.id}
            className={`vote-bar ${isRevealed ? 'revealed' : ''} ${rankClass}`}
            style={isRevealed ? { animationDelay: `${index * 90}ms` } : undefined}
          >
            {showResults && (
              <span className="vote-bar-fill" style={{ width: `${result.percentage}%` }} />
            )}
            <span className="vote-bar-alias">{isRevealed ? result.rank : index + 1}</span>
            <span className="vote-bar-label">{result.label}</span>
            {showResults && (
              <span className="vote-bar-meta">
                <span className="vote-bar-count">{result.votes.toLocaleString('ko-KR')}표</span>
                <span className="vote-bar-pct">{result.percentage.toFixed(1)}%</span>
              </span>
            )}
          </div>
        )
      })}

      {phase === 'running' && (
        <div
          className="vote-bar-hidden-note"
          style={{ justifyContent: 'center', padding: '0.2rem' }}
        >
          {showResults ? <Eye size={13} /> : <EyeOff size={13} />}
          {showResults
            ? `실시간 결과 공개 중 · ${totalVotes.toLocaleString('ko-KR')}표`
            : '실시간 결과 비공개 · 결과 공개 전까지 현황이 보이지 않아요'}
        </div>
      )}

      {phase === 'closed' && (
        <div
          className="vote-bar-hidden-note"
          style={{ justifyContent: 'center', padding: '0.2rem' }}
        >
          <EyeOff size={13} />
          마감됨 · 결과 공개 버튼을 누르면 순위가 나타나요
        </div>
      )}
    </div>
  )
}
