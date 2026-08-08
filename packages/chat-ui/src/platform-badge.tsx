import type { Platform } from '@stream/core'
import type { CSSProperties } from 'react'

const LABELS: Record<Platform, string> = {
  chzzk: 'CHZZK',
  soop: 'SOOP',
}

const COLORS: Record<Platform, CSSProperties> = {
  chzzk: { background: '#00FFA3', color: '#0B0B0B' },
  soop: { background: '#0182FF', color: '#FFFFFF' },
}

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={className ?? 'stream-platform-badge'} style={COLORS[platform]}>
      {LABELS[platform]}
    </span>
  )
}
