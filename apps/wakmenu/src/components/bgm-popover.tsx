'use client'

import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { PlaylistTrack } from '@/lib/playlist'

export interface BgmPopoverProps {
  open: boolean
  onClose: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
  playlist: PlaylistTrack[]
  currentIndex: number | null
  isPlaying: boolean
  volume: number
  muted: boolean
  onSelectTrack: (index: number) => void
  onTogglePlayPause: () => void
  onNext: () => void
  onPrev: () => void
  onVolumeChange: (value: number) => void
  onToggleMute: () => void
}

export function BgmPopover({
  open,
  onClose,
  containerRef,
  playlist,
  currentIndex,
  isPlaying,
  volume,
  muted,
  onSelectTrack,
  onTogglePlayPause,
  onNext,
  onPrev,
  onVolumeChange,
  onToggleMute,
}: BgmPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onClose()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  const current = currentIndex != null ? playlist[currentIndex] : null
  const volumePercent = muted ? 0 : volume

  return (
    <div ref={rootRef} className={`bgm-popover ${open ? 'open' : ''}`}>
      <div className="bgm-popover-head">
        <h2>왁타버스 플레이리스트</h2>
        <button type="button" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>
      </div>
      <div className="bgm-video">
        <div ref={containerRef} />
      </div>
      <div className="bgm-volume">
        <button type="button" onClick={onToggleMute} aria-label={muted || volume === 0 ? '음소거 해제' : '음소거'}>
          {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <input
          type="range"
          className="bgm-volume-slider"
          min={0}
          max={100}
          value={volumePercent}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          style={{ background: `linear-gradient(to right, #b9e743 ${volumePercent}%, #f1ead7 ${volumePercent}%)` }}
          aria-label="볼륨"
        />
      </div>
      <div className="bgm-track-info">
        <strong>{current ? current.title : '재생목록에서 곡을 선택하세요'}</strong>
        {current && <span>{current.channel}</span>}
      </div>
      <div className="bgm-transport">
        <button type="button" onClick={onPrev} aria-label="이전 곡">
          <SkipBack size={16} />
        </button>
        <button type="button" className="bgm-transport-play" onClick={onTogglePlayPause} aria-label={isPlaying ? '일시정지' : '재생'}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button type="button" onClick={onNext} aria-label="다음 곡">
          <SkipForward size={16} />
        </button>
      </div>
      <ol className="bgm-playlist">
        {playlist.map((track, index) => (
          <li key={track.id} className={index === currentIndex ? 'active' : ''}>
            <button type="button" onClick={() => onSelectTrack(index)}>
              <img src={`https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`} alt="" loading="lazy" />
              <span className="bgm-playlist-text">
                <b>{track.title}</b>
                <small>{track.channel}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
