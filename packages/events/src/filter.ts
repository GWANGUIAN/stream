import type { StreamEvent, StreamEventFilter, SubscribeOptions } from './types'

export function buildFilter(options: SubscribeOptions = {}): StreamEventFilter {
  const types = options.types ? new Set(options.types) : null
  const platforms = options.platforms ? new Set(options.platforms) : null
  const keywords = options.keywords?.map((k) => k.toLowerCase()) ?? null

  return (event) => {
    if (types && !types.has(event.type)) return false
    if (platforms && 'platform' in event && !platforms.has(event.platform)) return false

    if (options.minDonationAmount != null && event.type === 'donation') {
      if (event.amount < options.minDonationAmount) return false
    }

    if (keywords && keywords.length > 0) {
      if (event.type !== 'message') return false
      const text = event.text.toLowerCase()
      if (!keywords.some((k) => text.includes(k))) return false
    }

    if (options.filter && !options.filter(event)) return false
    return true
  }
}

export function defaultDedupeKey(event: StreamEvent): string | undefined {
  switch (event.type) {
    case 'message':
      return `message:${event.platform}:${event.user.id}:${event.text}`
    case 'donation':
      return `donation:${event.platform}:${event.user.id}:${event.amount}:${event.text ?? ''}`
    case 'subscription':
      return `subscription:${event.platform}:${event.user.id}:${event.months}`
    case 'system':
      return `system:${event.platform}:${event.text}`
    case 'status':
      return `status:${event.platform}:${event.status}:${event.text ?? ''}`
    case 'live':
      return `live:${event.platform}:${event.channelId}:${event.live.live}:${event.live.title ?? ''}`
    default:
      return undefined
  }
}
