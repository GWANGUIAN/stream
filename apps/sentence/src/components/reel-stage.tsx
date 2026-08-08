'use client'

import type { SectionId } from '@stream/sentence'
import { useCallback, useEffect, useState } from 'react'
import type { SentenceStore, SentenceStoreSnapshot } from '@/lib/store'
import { SlotReel } from './slot-reel'

export interface ReelStageProps {
  store: SentenceStore
  snapshot: SentenceStoreSnapshot
  compact?: boolean
}

/**
 * 활성 섹션 릴 묶음. 엔진이 picks를 갱신하면 해당 릴을 애니메이션합니다.
 */
export function ReelStage({ store, snapshot, compact = false }: ReelStageProps) {
  const [spinningIds, setSpinningIds] = useState<Set<SectionId>>(new Set())
  const [seenPicks, setSeenPicks] = useState<Partial<Record<SectionId, string>> | null>(null)

  useEffect(() => {
    // 최초 마운트(로컬 복원 포함)에서는 애니메이션 없이 현재 picks만 동기화합니다.
    if (seenPicks == null) {
      const initial: Partial<Record<SectionId, string>> = {}
      for (const section of snapshot.sections) {
        const pick = snapshot.picks[section.id]
        if (pick) initial[section.id] = pick.text
      }
      setSeenPicks(initial)
      return
    }

    const nextSpinning = new Set(spinningIds)
    let changed = false
    const nextSeen = { ...seenPicks }

    for (const section of snapshot.sections) {
      if (!section.enabled) continue
      const pick = snapshot.picks[section.id]
      if (!pick) continue
      if (seenPicks[section.id] !== pick.text) {
        nextSeen[section.id] = pick.text
        nextSpinning.add(section.id)
        changed = true
      }
    }

    if (changed) {
      setSeenPicks(nextSeen)
      setSpinningIds(nextSpinning)
    }
    // spinningIds / seenPicks는 의도적으로 비교용 스냅샷만 사용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.picks, snapshot.sections])

  const handleSpinEnd = useCallback((id: SectionId) => {
    setSpinningIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const canSpinPhase =
    snapshot.phase === 'closed' ||
    snapshot.phase === 'spinning' ||
    snapshot.phase === 'revealed' ||
    snapshot.phase === 'collecting'

  const active = snapshot.sections.filter((s) => s.enabled)

  return (
    <div className={compact ? 'overlay-reels' : 'reel-stage'}>
      {active.map((section) => {
        const pick = snapshot.picks[section.id]
        return (
          <SlotReel
            key={section.id}
            section={section}
            targetText={pick?.text ?? null}
            spinning={spinningIds.has(section.id)}
            canSpin={canSpinPhase && section.entries.length > 0}
            compact={compact}
            onSpinEnd={handleSpinEnd}
            onSpin={
              compact
                ? undefined
                : () => {
                    if (snapshot.phase === 'collecting') store.engine.close()
                    store.engine.spinSection(section.id)
                  }
            }
          />
        )
      })}
    </div>
  )
}
