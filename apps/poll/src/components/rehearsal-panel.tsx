'use client'

import type { PollOption, PollPhase } from '@stream/poll'
import { useState } from 'react'
import type { PollStore } from '@/lib/store'

export interface RehearsalPanelProps {
  store: PollStore
  options: PollOption[]
  phase: PollPhase
}

/** 방송 전 점검용 가짜 투표 주입 패널. */
export function RehearsalPanel({ store, options, phase }: RehearsalPanelProps) {
  const [nickname, setNickname] = useState('테스트시청자')
  const [optionId, setOptionId] = useState(options[0]?.id ?? '')

  function handleSend() {
    const target = optionId || options[0]?.id
    if (!target) return
    store.engine.injectRehearsalVote(nickname.trim() || '익명', target)
  }

  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">리허설</h2>
      <p className="glass-panel-sub">
        방송 전 가짜 투표를 보내 집계·중복 투표 규칙이 잘 동작하는지 확인해 보세요.
      </p>
      {phase !== 'running' ? (
        <p className="field-hint">투표가 진행 중일 때만 테스트할 수 있어요.</p>
      ) : (
        <>
          <div className="rehearsal-row">
            <input
              value={nickname}
              placeholder="닉네임"
              onChange={(e) => setNickname(e.target.value)}
            />
            <select value={optionId} onChange={(e) => setOptionId(e.target.value)}>
              {options.map((option, index) => (
                <option key={option.id} value={option.id}>
                  {index + 1}. {option.label || `항목 ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ marginTop: '0.5rem' }}
            onClick={handleSend}
          >
            테스트 투표 보내기
          </button>
        </>
      )}
    </section>
  )
}
