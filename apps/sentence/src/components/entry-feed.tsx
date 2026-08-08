'use client'

import type { SentenceFeedEntry } from '@stream/sentence'
import { colorForNickname } from '@stream/ui'
import { useEffect, useRef, useState } from 'react'

export interface EntryFeedProps {
  feed: SentenceFeedEntry[]
}

export function EntryFeed({ feed }: EntryFeedProps) {
  const [current, setCurrent] = useState<SentenceFeedEntry | null>(null)
  const lastSeenIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)
  const hideTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      lastSeenIdRef.current = feed.at(-1)?.id ?? null
      return
    }

    const latest = feed.at(-1)
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
  }, [feed])

  if (!current) return null

  const nickColor = colorForNickname(current.nickname)

  return (
    <div className="vote-feed" aria-live="polite">
      <p key={current.id} className="vote-log-line">
        <b className="log-nick" style={{ color: nickColor }}>
          {current.nickname}
        </b>{' '}
        → {current.sectionLabel} · {current.text}
      </p>
    </div>
  )
}
