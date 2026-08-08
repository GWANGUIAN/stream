'use client'

import { pickGiveawayWinner } from '@stream/poll'
import { Gift } from 'lucide-react'
import { useState } from 'react'
import { playRevealFanfare } from '@/lib/sound'
import type { PollStoreSnapshot } from '@/lib/store'

export interface RafflePanelProps {
  snapshot: PollStoreSnapshot
}

/** 투표에 참여한 시청자 중 한 명을 추첨합니다(경품 이벤트 등 편의 기능). */
export function RafflePanel({ snapshot }: RafflePanelProps) {
  const [winner, setWinner] = useState<string | null>(null)
  const nicknames = Object.keys(snapshot.votes)

  function draw() {
    const result = pickGiveawayWinner(nicknames.map((nickname) => ({ nickname })))
    if (!result) return
    setWinner(result.nickname)
    playRevealFanfare()
  }

  return (
    <section className="glass-panel">
      <h2 className="glass-panel-title">
        <Gift size={16} /> 참여자 추첨
      </h2>
      <p className="glass-panel-sub">
        이번 투표에 참여한 시청자 중 한 명을 무작위로 뽑아 경품 이벤트 등에 활용해 보세요.
      </p>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={draw}
        disabled={nicknames.length === 0}
      >
        {nicknames.length === 0 ? '참여자가 없어요' : `${nicknames.length}명 중 추첨하기`}
      </button>
      {winner && (
        <p className="field-hint" style={{ marginTop: '0.6rem', fontSize: '0.95rem' }}>
          🎉 당첨: <b style={{ color: 'var(--brand)' }}>{winner}</b>
        </p>
      )}
    </section>
  )
}
