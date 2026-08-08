'use client'

import type { PollHistoryEntry } from '@stream/poll'
import { X } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

export interface HistoryPanelProps {
  history: PollHistoryEntry[]
  open: boolean
  onClose: () => void
  onClear?: () => void
}

export function HistoryPanel({ history, open, onClose, onClear }: HistoryPanelProps) {
  const reversed = [...history].reverse()

  return (
    <>
      <button
        type="button"
        aria-label="히스토리 닫기"
        className={`history-scrim ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`history-drawer scroll-thin ${open ? 'open' : ''}`}>
        <div className="console-header" style={{ marginBottom: '0.8rem' }}>
          <h2 className="glass-panel-title" style={{ margin: 0 }}>
            지난 투표
          </h2>
          <div className="header-actions">
            {onClear && history.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => window.confirm('지난 투표 기록을 모두 지울까요?') && onClear()}
              >
                비우기
              </button>
            )}
            <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="history-list">
          {reversed.length === 0 ? (
            <div className="item-empty">아직 공개된 투표 결과가 없어요.</div>
          ) : (
            reversed.map((entry) => (
              <div key={entry.id} className="history-card">
                <div className="history-card-head">
                  <span className="history-card-title">{entry.title}</span>
                  <time className="history-card-time">{formatDateTime(entry.endedAt)}</time>
                </div>
                {[...entry.results]
                  .sort((a, b) => a.rank - b.rank)
                  .map((result) => (
                    <div key={result.id} className="history-mini-row">
                      <span style={{ minWidth: '4.5rem' }}>{result.label}</span>
                      <span className="history-mini-bar">
                        <span style={{ width: `${result.percentage}%` }} />
                      </span>
                      <span className="mono-num" style={{ minWidth: '2.8rem', textAlign: 'right' }}>
                        {result.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                <div className="field-hint" style={{ marginTop: '0.3rem' }}>
                  총 {entry.totalVotes.toLocaleString('ko-KR')}표
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
