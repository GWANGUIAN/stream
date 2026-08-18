'use client'

import { useCallback, useState } from 'react'
import { BGM_PLAYLIST } from '@/lib/playlist'
import type { PlaylistTrack } from '@/lib/playlist'
import { useYoutubePlayer } from '@/lib/use-youtube-player'
import { BgmBar } from './bgm-bar'
import { BgmPopover } from './bgm-popover'

export function BgmPlayer() {
  const [open, setOpen] = useState(false)
  const player = useYoutubePlayer(BGM_PLAYLIST)
  let currentTrack: PlaylistTrack | null = null
  if (player.currentIndex != null) {
    const track = BGM_PLAYLIST[player.currentIndex]
    if (track) currentTrack = track
  }

  const handleSelectTrack = useCallback(
    (index: number) => {
      player.selectTrack(index, true)
    },
    [player],
  )

  return (
    <div className="bgm-widget">
      <BgmBar
        isPlaying={player.isPlaying}
        progress={player.progress}
        currentTrack={currentTrack}
        open={open}
        onToggleOpen={() => setOpen((value) => !value)}
      />
      <BgmPopover
        open={open}
        onClose={() => setOpen(false)}
        containerRef={player.containerRef}
        playlist={BGM_PLAYLIST}
        currentIndex={player.currentIndex}
        isPlaying={player.isPlaying}
        volume={player.volume}
        muted={player.muted}
        onSelectTrack={handleSelectTrack}
        onTogglePlayPause={player.togglePlayPause}
        onNext={player.next}
        onPrev={player.prev}
        onVolumeChange={player.setVolume}
        onToggleMute={player.toggleMute}
      />
    </div>
  )
}
