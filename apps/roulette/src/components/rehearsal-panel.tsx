'use client'

import type { Platform } from '@stream/core'
import { termsFor } from '@stream/roulette'
import { useState } from 'react'
import type { RouletteStore } from '@/lib/store'

export interface RehearsalPanelProps {
  store: RouletteStore
  platform: Platform
}

/** 방송 전 룰 점검용 가짜 도네 주입 패널. */
export function RehearsalPanel({ store, platform }: RehearsalPanelProps) {
  const [nickname, setNickname] = useState('테스트시청자')
  const [amount, setAmount] = useState(100)
  const [text, setText] = useState('')
  const terms = termsFor(platform)

  function handleSend() {
    store.engine.injectRehearsalDonation({
      nickname: nickname.trim() || '익명',
      amount,
      text: text.trim() || undefined,
    })
  }

  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">리허설</h2>
      <p className="glass-panel-sub">
        방송 전 가짜 후원을 보내 등록 규칙이 잘 동작하는지 확인해 보세요.
      </p>
      <div className="rehearsal-row">
        <input
          value={nickname}
          placeholder="닉네임"
          onChange={(e) => setNickname(e.target.value)}
        />
        <input
          type="number"
          min={1}
          value={amount}
          placeholder={terms.currency}
          onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>
      <div className="field-row" style={{ marginTop: '0.5rem' }}>
        <input
          value={text}
          placeholder="후원 메시지(선택)"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" onClick={handleSend}>
          {terms.currency} 테스트 보내기
        </button>
      </div>
    </section>
  )
}
