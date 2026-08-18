'use client'

import { Music4 } from 'lucide-react'
import type { PlaylistTrack } from '@/lib/playlist'

export interface BgmBarProps {
  isPlaying: boolean
  progress: number
  currentTrack: PlaylistTrack | null
  open: boolean
  onToggleOpen: () => void
}

export function BgmBar({ isPlaying, progress, currentTrack, open, onToggleOpen }: BgmBarProps) {
  const label = currentTrack ? currentTrack.title : '플레이리스트'
  return (
    <button
      type="button"
      className={`bgm-bar ${isPlaying ? 'playing' : ''} ${open ? 'open' : ''}`}
      onClick={onToggleOpen}
      aria-expanded={open}
    >
      <span className="bgm-ring" style={{ '--bgm-progress': progress } as React.CSSProperties}>
        <span className="bgm-ring-icon"><Music4 size={13} /></span>
      </span>
      <span className="bgm-marquee">
        <span className={`bgm-marquee-track ${currentTrack ? 'scroll' : ''}`}>
          <span>{label}</span>
          <span>{label}</span>
        </span>
      </span>
    </button>
  )
}
