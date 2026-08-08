'use client'

import {
  buildSegments,
  type RouletteItem,
  type SpinResult,
  type WeightMode,
} from '@stream/roulette'
import confetti from 'canvas-confetti'
import { useLayoutEffect, useRef, useState } from 'react'
import { playTick, playWinFanfare } from '@/lib/sound'

const SPIN_DURATION_MS = 6200
const VIEW_SIZE = 460

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  // 0도 = 12시(포인터) 방향, 시계 방향으로 증가합니다.
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeSlice(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(center, center, radius, startAngle)
  const end = polarToCartesian(center, center, radius, endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

function truncate(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label
}

export interface WheelProps {
  items: RouletteItem[]
  weightMode: WeightMode
  lastResult: SpinResult | null
  onSpin?: () => void
  canSpin?: boolean
  interactive?: boolean
  maxWidth?: number
}

export function Wheel({
  items,
  weightMode,
  lastResult,
  onSpin,
  canSpin = true,
  interactive = true,
  maxWidth,
}: WheelProps) {
  const rotation = lastResult?.rotation ?? 0

  const [displayRotation, setDisplayRotation] = useState(rotation)
  const [spinning, setSpinning] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const prevRotationRef = useRef(rotation)
  const prevResultAtRef = useRef<number | null>(lastResult?.at ?? null)
  const rafRef = useRef<number | null>(null)
  const crossingsRef = useRef(0)

  // 스핀 중/직후에는 회전 각도를 계산할 때 쓴 원래 칸 배치(lastResult.segments)를 그대로 보여줍니다.
  // 당첨 후 항목이 차감/제거되면 실시간 아이템 목록으로 다시 계산한 배치와 어긋나기 때문입니다.
  const segments =
    (spinning || showBanner) && lastResult ? lastResult.segments : buildSegments(items, weightMode)

  useLayoutEffect(() => {
    const result = lastResult
    const resultAt = result?.at ?? null
    if (!result || resultAt === prevResultAtRef.current) {
      setDisplayRotation(rotation)
      prevRotationRef.current = rotation
      return
    }

    const from = prevRotationRef.current
    const to = rotation
    const segmentCount = Math.max(result.segments.length, 1)
    prevResultAtRef.current = resultAt
    prevRotationRef.current = to
    crossingsRef.current = 0
    setSpinning(true)
    setShowBanner(false)

    const start = performance.now()

    function frame(now: number) {
      const elapsed = now - start
      const t = Math.min(1, elapsed / SPIN_DURATION_MS)
      const eased = easeOutCubic(t)
      const current = from + (to - from) * eased
      setDisplayRotation(current)

      const traveled = current - from
      const expectedCrossings = Math.floor((traveled / 360) * segmentCount)
      if (expectedCrossings > crossingsRef.current) {
        crossingsRef.current = expectedCrossings
        playTick(1 - t)
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
        return
      }

      setDisplayRotation(to)
      setSpinning(false)
      setShowBanner(true)
      playWinFanfare()
      void confetti({
        particleCount: 150,
        spread: 85,
        origin: { y: 0.4 },
        colors: ['#ffb443', '#ff8a3d', '#00ffa3', '#4fa4ff', '#ffffff'],
      })
      window.setTimeout(() => setShowBanner(false), 3200)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // segments는 스핀 시작 시점 값으로 충분합니다(스핀 중 아이템 편집은 드묅).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult?.at, rotation])

  const center = VIEW_SIZE / 2
  const radius = center - 6
  const fontSize = Math.max(9, Math.min(15, 210 / Math.max(items.length, 1)))
  const maxChars = items.length > 10 ? 8 : items.length > 6 ? 12 : 16

  return (
    <div
      className="wheel-shell"
      style={maxWidth != null ? { width: `min(100%, ${maxWidth}px)` } : undefined}
    >
      <div className="wheel-pointer" />
      <div className="wheel-svg-wrap">
        {segments.length === 0 ? (
          <div className="wheel-empty-state">
            아직 등록된 아이템이 없어요.
            <br />
            도네이션이 들어오거나 수동으로 추가해 보세요.
          </div>
        ) : (
          <svg
            className="wheel-svg"
            viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
            style={{ transform: `rotate(${displayRotation}deg)` }}
            role="img"
            aria-label="룰렛 원판"
          >
            <title>룰렛 원판</title>
            {segments.map((segment) => {
              const midAngle = (segment.startAngle + segment.endAngle) / 2
              const labelPos = polarToCartesian(center, center, radius * 0.64, midAngle)
              let textRotation = midAngle - 90
              if (midAngle > 90 && midAngle < 270) textRotation += 180

              return (
                <g key={segment.itemId}>
                  <path
                    d={describeSlice(center, radius, segment.startAngle, segment.endAngle)}
                    fill={segment.color}
                    stroke="#0a0714"
                    strokeWidth={1.5}
                  />
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    fontSize={fontSize}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="wheel-segment-label"
                    transform={`rotate(${textRotation} ${labelPos.x} ${labelPos.y})`}
                  >
                    {truncate(segment.label, maxChars)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>

      {interactive && (
        <button
          type="button"
          className="wheel-hub"
          onClick={onSpin}
          disabled={!canSpin || spinning || items.length === 0}
        >
          {spinning ? '\u00B7\u00B7\u00B7' : 'SPIN'}
        </button>
      )}

      <div className={`result-banner ${showBanner && lastResult ? 'show' : ''}`}>
        <div className="eyebrow">당첨</div>
        <div className="label">{lastResult?.label}</div>
      </div>
    </div>
  )
}
