'use client'

import type { SentenceHistoryEntry } from '@stream/sentence'
import { X } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

export interface HistoryPanelProps {
  history: SentenceHistoryEntry[]
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
            지난 문장
          </h2>
          <div className="header-actions">
            {onClear && history.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => window.confirm('지난 문장 기록을 모두 지울까요?') && onClear()}
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
            <div className="item-empty">아직 완성된 문장이 없어요.</div>
          ) : (
            reversed.map((entry) => (
              <div key={entry.id} className="history-card">
                <div className="history-card-head">
                  <span className="history-card-title">{entry.sentence}</span>
                  <time className="history-card-time">{formatDateTime(entry.at)}</time>
                </div>
                <div className="field-hint">
                  {entry.picks.map((p) => `${p.sectionLabel}:${p.text}`).join(' · ')}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
