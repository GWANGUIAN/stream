'use client'

import type { SectionId } from '@stream/sentence'
import { Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { SentenceStore, SentenceStoreSnapshot } from '@/lib/store'

export interface CandidatePanelsProps {
  store: SentenceStore
  snapshot: SentenceStoreSnapshot
}

export function CandidatePanels({ store, snapshot }: CandidatePanelsProps) {
  const [drafts, setDrafts] = useState<Partial<Record<SectionId, string>>>({})
  const locked = snapshot.phase === 'spinning'

  return (
    <div className="candidate-grid">
      {snapshot.sections.map((section) => (
        <section
          key={section.id}
          className={`candidate-panel ${section.enabled ? '' : 'disabled'}`}
        >
          <div className="candidate-panel-head">
            <h3 className="candidate-panel-title">
              {section.label} <span className="field-hint command-hint">{section.prefix}</span>
            </h3>
            {section.entries.length > 0 && (
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                aria-label={`${section.label} 비우기`}
                disabled={locked}
                onClick={() => store.engine.clearSection(section.id)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div className="candidate-list scroll-thin">
            {section.entries.length === 0 ? (
              <div className="field-hint">아직 없어요</div>
            ) : (
              section.entries.map((entry) => (
                <div key={entry.id} className="candidate-row">
                  <span className="candidate-row-text" title={entry.text}>
                    {entry.text}
                  </span>
                  <span className="candidate-row-count">×{entry.count}</span>
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost"
                    aria-label="삭제"
                    disabled={locked}
                    onClick={() => store.engine.removeEntry(section.id, entry.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="candidate-add-row">
            <input
              value={drafts[section.id] ?? ''}
              placeholder="수동 추가"
              disabled={!section.enabled || locked}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [section.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const text = (drafts[section.id] ?? '').trim()
                if (!text) return
                store.engine.injectEntry(section.id, text, '운영')
                setDrafts((prev) => ({ ...prev, [section.id]: '' }))
              }}
            />
            <button
              type="button"
              className="btn btn-sm"
              disabled={!section.enabled || locked || !(drafts[section.id] ?? '').trim()}
              onClick={() => {
                const text = (drafts[section.id] ?? '').trim()
                if (!text) return
                store.engine.injectEntry(section.id, text, '운영')
                setDrafts((prev) => ({ ...prev, [section.id]: '' }))
              }}
            >
              추가
            </button>
          </div>
        </section>
      ))}
    </div>
  )
}
