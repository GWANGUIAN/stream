'use client'

import { useCallback, useState } from 'react'
import { BGM_PLAYLIST } from '@/lib/playlist'
import { useYoutubePlayer } from '@/lib/use-youtube-player'
import { BgmBar } from './bgm-bar'
import { BgmPopover } from './bgm-popover'

export function BgmPlayer() {
  const [open, setOpen] = useState(false)
  const player = useYoutubePlayer(BGM_PLAYLIST)
  const currentTrack = player.currentIndex != null ? BGM_PLAYLIST[player.currentIndex] : null

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
        onSelectTrack={handleSelectTrack}
        onTogglePlayPause={player.togglePlayPause}
        onNext={player.next}
        onPrev={player.prev}
      />
    </div>
  )
}
