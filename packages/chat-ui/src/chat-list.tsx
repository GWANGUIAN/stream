import { useEffect, useRef } from 'react'
import { ChatLine } from './chat-line'
import type { ChatLineModel } from './format'

export function ChatList({
  lines,
  compact = false,
  maxLines = 200,
  autoScroll = true,
}: {
  lines: ChatLineModel[]
  compact?: boolean
  maxLines?: number
  autoScroll?: boolean
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const visible = lines.length > maxLines ? lines.slice(-maxLines) : lines

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visible, autoScroll])

  return (
    <div className={`stream-chat-list${compact ? ' is-compact' : ''}`}>
      {visible.map((line) => (
        <ChatLine key={line.id} line={line} compact={compact} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
