'use client'

import type { LogEntry, LogKind } from '@stream/roulette'
import { useMemo, useState } from 'react'
import { formatDateTime } from '@/lib/format'

export interface HistoryPanelProps {
  history: LogEntry[]
  open: boolean
  onClose: () => void
}

const FILTERS: Array<{ id: LogKind | 'all'; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'registered', label: '등록' },
  { id: 'rejected', label: '거절' },
  { id: 'manual', label: '수동' },
  { id: 'spin', label: '스핀' },
  { id: 'system', label: '시스템' },
]

export function HistoryPanel({ history, open, onClose }: HistoryPanelProps) {
  const [filter, setFilter] = useState<LogKind | 'all'>('all')

  const filtered = useMemo(() => {
    const list = filter === 'all' ? history : history.filter((entry) => entry.kind === filter)
    return [...list].reverse()
  }, [history, filter])

  function copyCsv() {
    const rows = [
      ['시간', '종류', '내용'],
      ...filtered.map((entry) => [formatDateTime(entry.at), entry.kind, entry.message]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    void navigator.clipboard.writeText(csv)
  }

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
            히스토리
          </h2>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="history-filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`pill ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-sm btn-secondary btn-block"
          onClick={copyCsv}
          style={{ marginBottom: '0.8rem' }}
        >
          CSV로 복사
        </button>

        <div className="history-list">
          {filtered.length === 0 ? (
            <div className="item-empty">기록이 없습니다.</div>
          ) : (
            filtered.map((entry) => (
              <div key={entry.id} className="history-row">
                <time>{formatDateTime(entry.at)}</time>
                {entry.message}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
