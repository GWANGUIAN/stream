'use client'

import type { SectionId, SectionState } from '@stream/sentence'
import { Dices } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { playLock, playTick } from '@/lib/sound'

const ITEM_HEIGHT = 115.2 // 7.2rem @ 16px
const SPIN_DURATION_MS = 3200

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export interface SlotReelProps {
  section: SectionState
  /** 엔진이 고른 최종 텍스트. 있으면 그쪽으로 멈춤. */
  targetText: string | null
  spinning: boolean
  onSpin?: () => void
  canSpin: boolean
  compact?: boolean
  onSpinEnd?: (sectionId: SectionId) => void
}

/**
 * 세로 슬롯 릴. `spinning`이 true가 되면 위에서 아래로 감속하며 돌고
 * `targetText`에 맞춰 정지합니다.
 */
export function SlotReel({
  section,
  targetText,
  spinning,
  onSpin,
  canSpin,
  compact = false,
  onSpinEnd,
}: SlotReelProps) {
  const [offset, setOffset] = useState(0)
  const [locked, setLocked] = useState(Boolean(targetText) && !spinning)
  const stripRef = useRef<HTMLDivElement>(null)
  const lastTickIndex = useRef(-1)
  const animGen = useRef(0)

  const texts = useMemo(() => {
    const entries = section.entries.map((e) => e.text)
    if (entries.length === 0) return ['…']
    // 짧은 목록도 충분히 돌도록 반복
    const repeats = Math.max(8, Math.ceil(24 / entries.length))
    const loop: string[] = []
    for (let i = 0; i < repeats; i += 1) loop.push(...entries)
    return loop
  }, [section.entries])

  useEffect(() => {
    if (!spinning || !targetText) {
      if (targetText && !spinning) {
        setLocked(true)
        const idx = texts.lastIndexOf(targetText)
        if (idx >= 0) setOffset(-idx * ITEM_HEIGHT)
      }
      return
    }

    setLocked(false)
    const gen = ++animGen.current
    const targetIndex = (() => {
      // 끝쪽 후보에서 타겟을 찾아 긴 스크롤을 만듭니다.
      for (let i = texts.length - 1; i >= Math.floor(texts.length * 0.45); i -= 1) {
        if (texts[i] === targetText) return i
      }
      return Math.max(0, texts.lastIndexOf(targetText))
    })()

    const startOffset = offset
    const endOffset = -targetIndex * ITEM_HEIGHT
    const start = performance.now()
    lastTickIndex.current = -1

    let frame = 0
    const tick = (now: number) => {
      if (animGen.current !== gen) return
      const t = Math.min(1, (now - start) / SPIN_DURATION_MS)
      const eased = easeOutCubic(t)
      const next = startOffset + (endOffset - startOffset) * eased
      setOffset(next)

      const itemIndex = Math.floor(Math.abs(next) / ITEM_HEIGHT)
      if (itemIndex !== lastTickIndex.current) {
        lastTickIndex.current = itemIndex
        playTick(0.6 + (1 - t) * 0.4)
      }

      if (t < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setOffset(endOffset)
        setLocked(true)
        playLock()
        onSpinEnd?.(section.id)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // offset 초기값만 쓰므로 deps에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, targetText, texts, section.id, onSpinEnd])

  const windowClass = [
    compact ? 'overlay-reel-window' : 'reel-window',
    spinning ? 'spinning' : '',
    locked ? 'locked' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="reel-column">
      <div className={compact ? 'overlay-reel-label' : 'reel-label'}>{section.label}</div>
      <div className={windowClass} aria-live="polite">
        <div
          ref={stripRef}
          className="reel-strip"
          style={{
            transform: `translate3d(0, ${offset + (compact ? 0 : 0)}px, 0)`,
            height: texts.length * ITEM_HEIGHT,
          }}
        >
          {texts.map((text, index) => (
            <div
              key={`${section.id}-${index}-${text}`}
              className={`reel-item ${text === '…' ? 'placeholder' : ''}`}
              style={{ height: ITEM_HEIGHT }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
      {!compact && (
        <>
          <div className="reel-count">{section.entries.length}개 후보</div>
          {onSpin && (
            <button
              type="button"
              className="btn btn-sm btn-ghost reel-spin-btn"
              disabled={!canSpin || spinning || section.entries.length === 0}
              onClick={onSpin}
            >
              <Dices size={14} /> 뽑기
            </button>
          )}
        </>
      )}
    </div>
  )
}
