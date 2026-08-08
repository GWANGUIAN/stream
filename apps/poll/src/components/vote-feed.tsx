'use client'

import type { PollFeedEntry } from '@stream/poll'
import { colorForNickname } from '@stream/ui'
import { useEffect, useRef, useState } from 'react'

export interface VoteFeedProps {
  feed: PollFeedEntry[]
  /** false면 어디에 투표했는지 숨깁니다(실시간 결과 비공개). */
  showOption: boolean
}

/**
 * 페이지 맨 아래 최신 투표 로그만 한 줄로 보여줍니다.
 * 새 로그가 오면 이전 로그는 바로 교체됩니다.
 */
export function VoteFeed({ feed, showOption }: VoteFeedProps) {
  const [current, setCurrent] = useState<PollFeedEntry | null>(null)
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
        {showOption ? (
          <>
            <b className="log-nick" style={{ color: nickColor }}>
              {current.nickname}
            </b>{' '}
            → {current.optionLabel}
          </>
        ) : (
          <>
            <b className="log-nick" style={{ color: nickColor }}>
              {current.nickname}
            </b>
            님이 투표했어요
          </>
        )}
      </p>
    </div>
  )
}
