'use client'

import type { LogEntry } from '@stream/roulette'
import { useEffect, useRef, useState } from 'react'

export interface LogFeedProps {
  log: LogEntry[]
}

/**
 * 페이지 맨 아래 최신 로그만 한 줄로 보여줍니다.
 * 새 로그가 오면 이전 로그는 바로 교체됩니다. (poll VoteFeed와 동일 패턴)
 */
export function LogFeed({ log }: LogFeedProps) {
  const [current, setCurrent] = useState<LogEntry | null>(null)
  const lastSeenIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const hideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    // 첫 마운트 시점에는 localStorage에서 복원된 과거 로그를 다시 띄우지 않고,
    // 그 이후에 새로 추가되는 항목만 감지합니다.
    if (!initializedRef.current) {
      initializedRef.current = true
      lastSeenIdRef.current = log.at(-1)?.id ?? null
      return
    }

    const latest = log.at(-1)
    if (!latest || latest.id === lastSeenIdRef.current) return

    lastSeenIdRef.current = latest.id
    setCurrent(latest)

    if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => {
      setCurrent((prev) => (prev?.id === latest.id ? null : prev))
      hideTimerRef.current = null
    }, 2800)

    return () => {
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }
  }, [log])

  if (!current) return null

  return (
    <div className="log-feed" aria-live="polite">
      <p key={current.id} className={`log-line ${current.kind}`}>
        {current.message}
      </p>
    </div>
  )
}
