'use client'

import type { LogEntry, LogKind } from '@stream/roulette'
import { useEffect, useRef, useState } from 'react'

const DURATIONS: Record<LogKind, number> = {
  registered: 6000,
  rejected: 5000,
  manual: 4200,
  spin: 7000,
  system: 4200,
}

interface VisibleEntry extends LogEntry {
  leaving?: boolean
}

export interface LogFeedProps {
  log: LogEntry[]
}

/**
 * 최근 로그를 토스트로 떴다가 사라지게 보여줍니다.
 * 엔진의 링버퍼(log)에 새로 추가된 항목만 감지해 토스트로 추가합니다.
 */
export function LogFeed({ log }: LogFeedProps) {
  const [visible, setVisible] = useState<VisibleEntry[]>([])
  const lastSeenIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    // 첫 마운트 시점에는 localStorage에서 복원된 과거 로그를 다시 토스트로 띄우지 않고,
    // 그 이후에 새로 추가되는 항목만 감지합니다. 로그는 최근 N개짜리 링버퍼라 길이가
    // 한도에 도달하면 더 이상 늘어나지 않으므로, 길이 대신 마지막으로 본 id를 기준으로 판단합니다.
    if (!initializedRef.current) {
      initializedRef.current = true
      lastSeenIdRef.current = log.at(-1)?.id ?? null
      return
    }

    const lastSeenIndex = lastSeenIdRef.current
      ? log.findIndex((entry) => entry.id === lastSeenIdRef.current)
      : -1
    const fresh = lastSeenIndex === -1 ? log : log.slice(lastSeenIndex + 1)
    if (fresh.length === 0) return

    lastSeenIdRef.current = log.at(-1)?.id ?? lastSeenIdRef.current
    setVisible((prev) => [...prev, ...fresh])

    const timers = fresh.map((entry) => {
      const duration = DURATIONS[entry.kind] ?? 5000
      return window.setTimeout(() => {
        setVisible((prev) => prev.map((v) => (v.id === entry.id ? { ...v, leaving: true } : v)))
        window.setTimeout(() => {
          setVisible((prev) => prev.filter((v) => v.id !== entry.id))
        }, 280)
      }, duration)
    })

    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [log])

  const shown = visible.slice(-6)

  return (
    <div className="log-feed">
      {shown.map((entry) => (
        <div key={entry.id} className={`log-toast ${entry.kind} ${entry.leaving ? 'leaving' : ''}`}>
          {entry.message}
        </div>
      ))}
    </div>
  )
}
