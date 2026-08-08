'use client'

import type { SectionId, SectionState, SentencePhase } from '@stream/sentence'
import { useState } from 'react'
import type { SentenceStore } from '@/lib/store'

export interface RehearsalPanelProps {
  store: SentenceStore
  sections: SectionState[]
  phase: SentencePhase
}

export function RehearsalPanel({ store, sections, phase }: RehearsalPanelProps) {
  const enabled = sections.filter((s) => s.enabled)
  const [nickname, setNickname] = useState('테스트시청자')
  const [sectionId, setSectionId] = useState<SectionId>(enabled[0]?.id ?? 'who')
  const [text, setText] = useState('사슴이')

  function handleSend() {
    store.engine.injectRehearsal(sectionId, text.trim() || '테스트', nickname.trim() || '익명')
  }

  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">리허설</h2>
      <p className="glass-panel-sub">방송 전 가짜 채팅을 넣어 수집·추첨을 점검해 보세요.</p>
      {phase !== 'collecting' ? (
        <p className="field-hint">수집이 진행 중일 때만 테스트할 수 있어요.</p>
      ) : (
        <>
          <div className="rehearsal-row">
            <input
              value={nickname}
              placeholder="닉네임"
              onChange={(e) => setNickname(e.target.value)}
            />
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value as SectionId)}>
              {enabled.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label} ({section.prefix})
                </option>
              ))}
            </select>
          </div>
          <input
            style={{ marginTop: '0.5rem' }}
            value={text}
            placeholder="텍스트"
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ marginTop: '0.5rem' }}
            onClick={handleSend}
          >
            테스트 채팅 보내기
          </button>
        </>
      )}
    </section>
  )
}
