'use client'

import type { SectionId } from '@stream/sentence'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SentenceStore, SentenceStoreSnapshot } from '@/lib/store'
import { SlotReel } from './slot-reel'

export interface ReelStageProps {
  store: SentenceStore
  snapshot: SentenceStoreSnapshot
  compact?: boolean
  /** 하나라도 릴이 도는 중이면 true. 문장 스포일러 방지에 사용합니다. */
  onAnimatingChange?: (animating: boolean) => void
}

/**
 * 활성 섹션 릴 묶음. 엔진 picks의 spinSeq가 바뀌면 해당 릴을 반드시 애니메이션합니다.
 */
export function ReelStage({ store, snapshot, compact = false, onAnimatingChange }: ReelStageProps) {
  const [spinningIds, setSpinningIds] = useState<Set<SectionId>>(new Set())
  const [seenSpinSeq, setSeenSpinSeq] = useState<Partial<Record<SectionId, number>> | null>(null)

  // 렌더 시점에 바로 spinning으로 잡아, 결과 텍스트가 한 프레임이라도 미리 보이지 않게 합니다.
  const pendingIds = useMemo(() => {
    const pending = new Set<SectionId>()
    if (seenSpinSeq == null) return pending
    for (const section of snapshot.sections) {
      if (!section.enabled) continue
      const pick = snapshot.picks[section.id]
      if (!pick) continue
      if (seenSpinSeq[section.id] !== pick.spinSeq) pending.add(section.id)
    }
    return pending
  }, [snapshot.picks, snapshot.sections, seenSpinSeq])

  useEffect(() => {
    if (seenSpinSeq == null) {
      const initial: Partial<Record<SectionId, number>> = {}
      for (const section of snapshot.sections) {
        const pick = snapshot.picks[section.id]
        if (pick) initial[section.id] = pick.spinSeq
      }
      setSeenSpinSeq(initial)
      return
    }

    if (pendingIds.size === 0) return

    const nextSeen = { ...seenSpinSeq }
    for (const id of pendingIds) {
      const pick = snapshot.picks[id]
      if (pick) nextSeen[id] = pick.spinSeq
    }
    setSeenSpinSeq(nextSeen)
    setSpinningIds((prev) => {
      const next = new Set(prev)
      for (const id of pendingIds) next.add(id)
      return next
    })
  }, [pendingIds, seenSpinSeq, snapshot.picks, snapshot.sections])

  const animating = spinningIds.size > 0 || pendingIds.size > 0

  useEffect(() => {
    onAnimatingChange?.(animating)
  }, [animating, onAnimatingChange])

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
        const isSpinning = spinningIds.has(section.id) || pendingIds.has(section.id)
        return (
          <SlotReel
            key={section.id}
            section={section}
            targetText={pick?.text ?? null}
            spinKey={pick?.spinSeq ?? 0}
            spinning={isSpinning}
            canSpin={canSpinPhase && section.entries.length > 0 && !isSpinning}
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
