'use client'

import type { SentenceFeedEntry } from '@stream/sentence'
import { colorForNickname } from '@stream/ui'
import confetti from 'canvas-confetti'
import { CheckCircle2, Circle, Dices, Lock, Play } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { exampleCommands } from '@/lib/examples'
import { formatCountdown } from '@/lib/format'
import { useOverlaySnapshot } from '@/lib/hooks'
import type { SentenceStore, SentenceStoreSnapshot } from '@/lib/store'
import { ReelStage } from './reel-stage'

const PHASE_ICON = {
  idle: Circle,
  collecting: Play,
  closed: Lock,
  spinning: Dices,
  revealed: CheckCircle2,
} as const

function maxSpinSeq(snapshot: SentenceStoreSnapshot): number {
  return Math.max(0, ...snapshot.sections.map((s) => snapshot.picks[s.id]?.spinSeq ?? 0))
}

/**
 * OBS 브라우저 소스용 읽기 전용 화면.
 * 조작 페이지 스냅샷을 BroadcastChannel/localStorage로만 미러링합니다.
 */
export function OverlayView() {
  const snapshot = useOverlaySnapshot()
  const [, forceTick] = useState(0)
  const [toast, setToast] = useState<SentenceFeedEntry | null>(null)
  const [reelsAnimating, setReelsAnimating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<number | null>(null)
  const lastSeenIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const wasAnimatingRef = useRef(false)
  const hideTimerRef = useRef<number | null>(null)

  const dummyStore = useMemo(
    () =>
      ({
        engine: {
          spinSection: () => false,
          close: () => {},
        },
      }) as unknown as SentenceStore,
    [],
  )

  const handleAnimatingChange = useCallback((animating: boolean) => {
    setReelsAnimating(animating)
  }, [])

  useEffect(() => {
    if (snapshot?.phase !== 'collecting') return
    const id = window.setInterval(() => forceTick((t) => t + 1), 250)
    return () => window.clearInterval(id)
  }, [snapshot?.phase])

  const currentKey = snapshot ? maxSpinSeq(snapshot) : 0

  useEffect(() => {
    if (!snapshot || revealedKey != null) return
    setRevealedKey(currentKey)
  }, [snapshot, currentKey, revealedKey])

  useEffect(() => {
    if (reelsAnimating) {
      wasAnimatingRef.current = true
      return
    }
    if (revealedKey == null) return
    if (currentKey !== revealedKey) setRevealedKey(currentKey)
  }, [reelsAnimating, currentKey, revealedKey])

  const displaySentence =
    snapshot && revealedKey != null && currentKey === revealedKey && !reelsAnimating
      ? (snapshot.result?.sentence ?? null)
      : null

  useEffect(() => {
    if (reelsAnimating) return
    if (!wasAnimatingRef.current) return
    wasAnimatingRef.current = false
    if (!displaySentence) return

    void confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#c8f542', '#3ecfff', '#ffcb57'],
    })
  }, [reelsAnimating, displaySentence])

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
        <p className="overlay-empty">랜덤 문장 만들기를 불러오는 중…</p>
      </div>
    )
  }

  const { phase, title, endsAt, sections } = snapshot
  const remainingMs =
    phase === 'collecting' && endsAt != null ? Math.max(0, endsAt - Date.now()) : null
  const isHot = remainingMs != null && remainingMs <= 10_000
  const Icon = PHASE_ICON[phase]
  const examples = exampleCommands(sections)

  return (
    <div className="overlay-root">
      <h1 className="overlay-title">{title}</h1>

      <div className="overlay-phase-row">
        <Icon size={22} color="#fff" />
        {phase === 'collecting' && remainingMs != null && (
          <span className={`overlay-timer ${isHot ? 'hot' : ''}`}>
            {formatCountdown(remainingMs)}
          </span>
        )}
      </div>

      {phase === 'collecting' && (
        <p className="overlay-instruction">
          채팅에{' '}
          {examples.slice(0, 3).map((example, index) => (
            <span key={example}>
              {index > 0 ? ' · ' : null}
              <code>{example}</code>
            </span>
          ))}
        </p>
      )}

      <ReelStage
        store={dummyStore}
        snapshot={snapshot}
        compact
        onAnimatingChange={handleAnimatingChange}
      />

      {displaySentence && <p className="overlay-sentence">{displaySentence}</p>}

      {toast && (
        <div className="overlay-toast-stack">
          <p key={toast.id} className="overlay-log-line">
            <b className="log-nick" style={{ color: colorForNickname(toast.nickname) }}>
              {toast.nickname}
            </b>{' '}
            → {toast.sectionLabel} · {toast.text}
          </p>
        </div>
      )}
    </div>
  )
}
