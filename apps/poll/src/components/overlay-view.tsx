'use client'

import type { PollFeedEntry, PollOptionResult } from '@stream/poll'
import confetti from 'canvas-confetti'
import { CheckCircle2, Circle, Lock, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatCountdown } from '@/lib/format'
import { useOverlaySnapshot } from '@/lib/hooks'

const PHASE_ICON = { idle: Circle, running: Play, closed: Lock, revealed: CheckCircle2 } as const

/**
 * OBS 브라우저 소스에 그대로 붙여넣는 읽기 전용 화면.
 * 조작 페이지가 소유한 엔진 스냅샷을 BroadcastChannel/localStorage로만 미러링합니다.
 */
export function OverlayView() {
  const snapshot = useOverlaySnapshot()
  const [, forceTick] = useState(0)
  const [toast, setToast] = useState<PollFeedEntry | null>(null)
  const lastSeenIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const lastPhaseRef = useRef<string | null>(null)
  const hideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (snapshot?.phase !== 'running') return
    const id = window.setInterval(() => forceTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [snapshot?.phase])

  useEffect(() => {
    if (!snapshot) return
    if (lastPhaseRef.current !== 'revealed' && snapshot.phase === 'revealed') {
      void confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ff5d73', '#1fd8c4', '#ffcb57'],
      })
    }
    lastPhaseRef.current = snapshot.phase
  }, [snapshot])

  useEffect(() => {
    if (!snapshot) return
    const feed = snapshot.feed

    if (!initializedRef.current) {
      initializedRef.current = true
      lastSeenIdRef.current = feed.at(-1)?.id ?? null
      return
    }

    const latest = feed.at(-1)
    if (!latest || latest.id === lastSeenIdRef.current) return

    lastSeenIdRef.current = latest.id
    setToast(latest)

    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      setToast((prev) => (prev?.id === latest.id ? null : prev))
      hideTimerRef.current = null
    }, 2800)

    return () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [snapshot])

  if (!snapshot) {
    return (
      <div className="overlay-root">
        <p className="overlay-empty">투표를 불러오는 중…</p>
      </div>
    )
  }

  const { phase, title, options, totals, winnerIds, settings, endsAt } = snapshot
  const remainingMs =
    phase === 'running' && endsAt != null ? Math.max(0, endsAt - Date.now()) : null
  const isHot = remainingMs != null && remainingMs <= 10_000
  const Icon = PHASE_ICON[phase]

  const showBars = phase === 'revealed' || (phase === 'running' && settings.showLiveResults)
  const showOptionInLog = settings.showLiveResults || phase === 'revealed'
  const orderedTotals: PollOptionResult[] =
    phase === 'revealed' ? [...totals].sort((a, b) => a.rank - b.rank) : totals

  return (
    <div className="overlay-root">
      <h1 className="overlay-title">{title}</h1>

      <div className="overlay-phase-row">
        <Icon size={22} color="#fff" />
        {phase === 'running' && remainingMs != null && (
          <span className={`overlay-timer ${isHot ? 'hot' : ''}`}>
            {formatCountdown(remainingMs)}
          </span>
        )}
      </div>

      {phase === 'running' && !showBars && (
        <p className="overlay-instruction">
          채팅창에 <code>{settings.votePrefix} 1</code> 처럼 입력해서 투표해 주세요!
        </p>
      )}
      {phase === 'closed' && (
        <p className="overlay-instruction">투표 마감! 곧 결과를 공개할게요 🎉</p>
      )}

      {showBars ? (
        <div className="overlay-stage">
          {orderedTotals.map((result, index) => {
            const isWinner = phase === 'revealed' && winnerIds.includes(result.id)
            const rankClass = isWinner ? `rank-${Math.min(result.rank, 3)}` : ''
            return (
              <div
                key={result.id}
                className={`overlay-bar ${rankClass}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="overlay-bar-fill" style={{ width: `${result.percentage}%` }} />
                <span className="overlay-bar-alias">
                  {phase === 'revealed' ? result.rank : index + 1}
                </span>
                <span className="overlay-bar-label">{result.label}</span>
                <span className="overlay-bar-pct">{result.percentage.toFixed(1)}%</span>
              </div>
            )
          })}
        </div>
      ) : (
        phase !== 'running' && (
          <div className="overlay-stage">
            {options.map((option, index) => (
              <div key={option.id} className="overlay-bar">
                <span className="overlay-bar-alias">{index + 1}</span>
                <span className="overlay-bar-label">{option.label}</span>
              </div>
            ))}
          </div>
        )
      )}

      {toast && (
        <div className="overlay-toast-stack">
          <p key={toast.id} className="overlay-log-line">
            {showOptionInLog ? (
              <>
                <b>{toast.nickname}</b> → {toast.optionLabel}
              </>
            ) : (
              <>
                <b>{toast.nickname}</b>님이 투표했어요
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
