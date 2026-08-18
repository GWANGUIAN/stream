'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaylistTrack } from './playlist'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null

function loadYoutubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}

export function useYoutubePlayer(playlist: PlaylistTrack[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const pendingIndexRef = useRef<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [volume, setVolumeState] = useState(100)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadYoutubeApi().then(() => {
      const firstTrack = playlist[0]
      if (cancelled || !containerRef.current || playerRef.current || !firstTrack) return
      // Pass real pixel dimensions (not '100%') so YouTube's internal control-bar
      // layout (volume slider popup, etc.) matches the actual rendered size.
      const rect = containerRef.current.getBoundingClientRect()
      playerRef.current = new window.YT.Player(containerRef.current, {
        width: Math.round(rect.width) || 320,
        height: Math.round(rect.height) || 180,
        videoId: firstTrack.id,
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            setIsReady(true)
            setVolumeState(playerRef.current.getVolume())
            setMuted(playerRef.current.isMuted())
            const index = pendingIndexRef.current
            pendingIndexRef.current = null
            const pendingTrack = index != null ? playlist[index] : undefined
            if (index != null && index !== 0 && pendingTrack) {
              playerRef.current.cueVideoById(pendingTrack.id)
              setCurrentIndex(index)
            } else {
              setCurrentIndex(0)
            }
          },
          onStateChange: (event: { data: number }) => {
            setIsPlaying(event.data === window.YT?.PlayerState?.PLAYING)
          },
        },
      })
    })
    return () => {
      cancelled = true
    }
    // playlist is static hardcoded data; player is created once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    // YT.setSize() re-layouts the internal player (dismissing open menus like the
    // volume slider), so only call it when the size actually changed - ResizeObserver
    // can otherwise fire on sub-pixel/unrelated reflows and reset the player mid-hover.
    let lastWidth = -1
    let lastHeight = -1
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect || rect.width <= 0 || rect.height <= 0) return
      const width = Math.round(rect.width)
      const height = Math.round(rect.height)
      if (width === lastWidth && height === lastHeight) return
      lastWidth = width
      lastHeight = height
      playerRef.current?.setSize?.(width, height)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setProgress(0)
  }, [currentIndex])

  useEffect(() => {
    if (!isPlaying) return
    const id = window.setInterval(() => {
      const player = playerRef.current
      if (!player?.getDuration) return
      const duration = player.getDuration()
      const current = player.getCurrentTime()
      setProgress(duration ? Math.min(1, current / duration) : 0)
    }, 400)
    return () => window.clearInterval(id)
  }, [isPlaying])

  const selectTrack = useCallback(
    (index: number, autoplay = true) => {
      const track = playlist[index]
      if (!track) return
      const player = playerRef.current
      if (!player || !isReady) {
        pendingIndexRef.current = index
        setCurrentIndex(index)
        return
      }
      setCurrentIndex(index)
      if (autoplay) player.loadVideoById(track.id)
      else player.cueVideoById(track.id)
    },
    [playlist, isReady],
  )

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current
    if (!player || !isReady) return
    if (currentIndex == null) {
      selectTrack(0, true)
      return
    }
    if (player.getPlayerState() === window.YT?.PlayerState?.PLAYING) player.pauseVideo()
    else player.playVideo()
  }, [currentIndex, isReady, selectTrack])

  const setVolume = useCallback((value: number) => {
    const player = playerRef.current
    if (!player) return
    const clamped = Math.max(0, Math.min(100, Math.round(value)))
    player.setVolume(clamped)
    setVolumeState(clamped)
    if (clamped > 0) {
      player.unMute()
      setMuted(false)
    }
  }, [])

  const toggleMute = useCallback(() => {
    const player = playerRef.current
    if (!player) return
    if (player.isMuted()) {
      player.unMute()
      setMuted(false)
    } else {
      player.mute()
      setMuted(true)
    }
  }, [])

  const next = useCallback(() => {
    selectTrack(currentIndex == null ? 0 : (currentIndex + 1) % playlist.length, true)
  }, [currentIndex, playlist.length, selectTrack])

  const prev = useCallback(() => {
    selectTrack(currentIndex == null ? 0 : (currentIndex - 1 + playlist.length) % playlist.length, true)
  }, [currentIndex, playlist.length, selectTrack])

  return {
    containerRef,
    isReady,
    isPlaying,
    currentIndex,
    progress,
    volume,
    muted,
    selectTrack,
    togglePlayPause,
    next,
    prev,
    setVolume,
    toggleMute,
  }
}
