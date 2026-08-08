import type { ChatLineModel } from '@stream/chat-ui'
import { ChatLine } from '@stream/chat-ui'

/** 최근 채팅을 아래에서 쌓아 올리는 티커. */
export function ChatTicker({
  lines,
  max = 8,
  className,
}: {
  lines: ChatLineModel[]
  max?: number
  className?: string
}) {
  const visible = lines.slice(-max)
  return (
    <div className={['stream-chat-ticker', className].filter(Boolean).join(' ')}>
      {visible.map((line) => (
        <ChatLine key={line.id} line={line} compact showPlatform />
      ))}
    </div>
  )
}
