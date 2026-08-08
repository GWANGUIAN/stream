import type { ChatLineModel } from './format'
import { PlatformBadge } from './platform-badge'

export function ChatLine({
  line,
  compact = false,
  showPlatform = true,
}: {
  line: ChatLineModel
  compact?: boolean
  showPlatform?: boolean
}) {
  const kindClass =
    line.kind === 'donation'
      ? 'is-donation'
      : line.kind === 'subscription'
        ? 'is-subscription'
        : line.kind === 'status' || line.kind === 'system'
          ? 'is-system'
          : ''

  return (
    <div className={`stream-chat-line ${kindClass}${compact ? ' is-compact' : ''}`}>
      {showPlatform ? <PlatformBadge platform={line.platform} /> : null}
      {line.nick ? <strong className="stream-chat-nick">{line.nick}</strong> : null}
      {line.kind === 'donation' ? (
        <span className="stream-chat-amount">
          {line.amount}
          {line.currency ? ` ${line.currency}` : ''}
        </span>
      ) : null}
      <span className="stream-chat-text">{line.text}</span>
    </div>
  )
}
