'use client'

import type { LogEntry } from '@stream/roulette'
import { useEffect, useRef, useState } from 'react'
import { useOverlaySnapshot } from '@/lib/hooks'
import { Wheel } from './wheel'

/**
 * OBS 브라우저 소스에 그대로 붙여넣는 읽기 전용 화면.
 * 조작 페이지가 소유한 엔진 스냅샷을 BroadcastChannel/localStorage로만 미러링합니다.
 */
export function OverlayView() {
  const snapshot = useOverlaySnapshot()
  const [toast, setToast] = useState<LogEntry | null>(null)
  const lastSeenIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const hideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!snapshot) return
    const relevant = snapshot.log.filter((entry) => entry.kind === 'registered')

    // 로그는 최근 N개짜리 링버퍼라 길이가 한도에 도달하면 더 이상 늘어나지 않으므로,
    // 길이 대신 마지막으로 본 id를 기준으로 새 항목을 감지합니다.
    if (!initializedRef.current) {
      initializedRef.current = true
      lastSeenIdRef.current = relevant.at(-1)?.id ?? null
      return
    }

    const latest = relevant.at(-1)
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
        <p className="overlay-empty">룰렛을 불러오는 중…</p>
      </div>
    )
  }

  return (
    <div className="overlay-root">
      <h1 className="overlay-title">{snapshot.title}</h1>
      <div className="overlay-wheel-shell">
        <Wheel
          items={snapshot.items}
          weightMode={snapshot.weightMode}
          lastResult={snapshot.lastResult}
          interactive={false}
          maxWidth={560}
        />
      </div>
      {toast && (
        <div className="overlay-toast-stack" aria-live="polite">
          <p key={toast.id} className="overlay-log-line">
            {toast.message}
          </p>
        </div>
      )}
    </div>
  )
}
