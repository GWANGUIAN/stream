'use client'

import type { SectionId, SectionState } from '@stream/sentence'
import { Dices } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { playLock, playTick } from '@/lib/sound'

const ITEM_HEIGHT = 115.2 // 7.2rem @ 16px
const SPIN_DURATION_MS = 3400
/** 애니메이션이 항상 눈에 띄게 돌도록 최소 칸 수 */
const MIN_SPIN_STEPS = 18

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export interface SlotReelProps {
  section: SectionState
  /** 엔진이 고른 최종 텍스트. 있으면 그쪽으로 멈춤. */
  targetText: string | null
  /** 뽑기마다 바뀌는 키. 같은 문구 재추첨에도 애니메이션을 강제합니다. */
  spinKey: number
  spinning: boolean
  onSpin?: () => void
  canSpin: boolean
  compact?: boolean
  onSpinEnd?: (sectionId: SectionId) => void
}

/**
 * 세로 슬롯 릴. `spinning`이 true가 되면 항상 위에서 아래로 감속하며 돌고
 * `targetText`에 맞춰 정지합니다.
 */
export function SlotReel({
  section,
  targetText,
  spinKey,
  spinning,
  onSpin,
  canSpin,
  compact = false,
  onSpinEnd,
}: SlotReelProps) {
  const [offset, setOffset] = useState(0)
  const [locked, setLocked] = useState(Boolean(targetText) && !spinning)
  const lastTickIndex = useRef(-1)
  const animGen = useRef(0)
  const hydratedKey = useRef<number | null>(null)

  const texts = useMemo(() => {
    const entries = section.entries.map((e) => e.text)
    if (entries.length === 0) return ['…']
    // 최소 회전 거리 + 여유분만큼 반복
    const repeats = Math.max(12, Math.ceil((MIN_SPIN_STEPS + 8) / entries.length))
    const loop: string[] = []
    for (let i = 0; i < repeats; i += 1) loop.push(...entries)
    return loop
  }, [section.entries])

  // 복원/정지 상태: 애니메이션 없이 결과에 스냅
  useEffect(() => {
    if (spinning || !targetText) return
    if (hydratedKey.current === spinKey) return
    hydratedKey.current = spinKey
    const idx = Math.max(0, texts.lastIndexOf(targetText))
    setLocked(true)
    setOffset(-idx * ITEM_HEIGHT)
  }, [spinning, targetText, spinKey, texts])

  // 뽑기 애니메이션: spinKey가 바뀌며 spinning=true일 때 항상 처음부터 돌아감
  useEffect(() => {
    if (!spinning || !targetText || texts.length === 0 || texts[0] === '…') {
      if (spinning && onSpinEnd) {
        // 후보가 없으면 즉시 종료 처리
        onSpinEnd(section.id)
      }
      return
    }

    hydratedKey.current = spinKey
    setLocked(false)

    const gen = ++animGen.current
    const uniqueCount = Math.max(1, section.entries.length)

    // 항상 0에서 시작해 최소 MIN_SPIN_STEPS 이상 이동한 뒤 타겟에 멈춤
    const startOffset = 0
    setOffset(0)

    let targetIndex = -1
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      if (texts[i] !== targetText) continue
      if (i >= MIN_SPIN_STEPS) {
        targetIndex = i
        break
      }
      if (targetIndex < 0) targetIndex = i
    }
    if (targetIndex < 0) targetIndex = texts.length - 1

    // 그래도 거리가 짧으면 한 바퀴 더 뒤로 보정(목록이 짧을 때)
    if (targetIndex < MIN_SPIN_STEPS && texts.length > uniqueCount) {
      const aligned = texts.lastIndexOf(targetText)
      targetIndex = aligned >= 0 ? aligned : targetIndex
    }

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
        playTick(0.55 + (1 - t) * 0.45)
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
    return () => {
      cancelAnimationFrame(frame)
      animGen.current += 1
    }
  }, [spinning, spinKey, targetText, texts, section.id, section.entries.length, onSpinEnd])

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
          className="reel-strip"
          style={{
            transform: `translate3d(0, ${offset}px, 0)`,
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
