'use client'

import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '/wakmenu'
const MUTED_KEY = 'wakmenu-ambient-muted'
const VOLUME_KEY = 'wakmenu-ambient-volume'
const DEFAULT_VOLUME = 100
const HIDE_DELAY_MS = 500

function loadMuted() {
  return window.localStorage.getItem(MUTED_KEY) === '1'
}

function loadVolume() {
  const stored = Number(window.localStorage.getItem(VOLUME_KEY))
  return Number.isFinite(stored) && stored > 0 ? Math.min(100, Math.max(0, stored)) : DEFAULT_VOLUME
}

export function AmbientBgm() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const hideTimer = useRef<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(DEFAULT_VOLUME)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setMuted(loadMuted())
    setVolume(loadVolume())
  }, [])

  const displayVolume = muted ? 0 : volume

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = displayVolume / 100
  }, [displayVolume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const events = ['pointerdown', 'keydown', 'touchstart'] as const
    const tryPlay = () => {
      if (audio.paused) void audio.play().catch(() => undefined)
    }
    const cleanup = () => events.forEach((type) => window.removeEventListener(type, tryPlay))
    const onPlaying = () => cleanup()
    tryPlay()
    events.forEach((type) => window.addEventListener(type, tryPlay))
    audio.addEventListener('playing', onPlaying)
    return () => {
      cleanup()
      audio.removeEventListener('playing', onPlaying)
    }
  }, [])

  const clearHideTimer = () => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const handleEnter = () => {
    clearHideTimer()
    setOpen(true)
  }

  const handleLeave = () => {
    clearHideTimer()
    hideTimer.current = window.setTimeout(() => setOpen(false), HIDE_DELAY_MS)
  }

  const toggleMuted = () => {
    setMuted((value) => {
      const next = !value
      window.localStorage.setItem(MUTED_KEY, next ? '1' : '0')
      if (!next && volume === 0) {
        setVolume(DEFAULT_VOLUME)
        window.localStorage.setItem(VOLUME_KEY, String(DEFAULT_VOLUME))
      }
      return next
    })
  }

  const handleVolumeChange = (value: number) => {
    if (value === 0) {
      setMuted(true)
      window.localStorage.setItem(MUTED_KEY, '1')
      return
    }
    setVolume(value)
    window.localStorage.setItem(VOLUME_KEY, String(value))
    if (muted) {
      setMuted(false)
      window.localStorage.setItem(MUTED_KEY, '0')
    }
  }

  const Icon = displayVolume === 0 ? VolumeX : displayVolume < 55 ? Volume1 : Volume2

  return (
    <div className="ambient-bgm" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <audio ref={audioRef} src={`${BASE}/bgm.mp3`} loop preload="auto" />
      <button
        type="button"
        className="ambient-bgm-toggle"
        onClick={toggleMuted}
        aria-pressed={!muted}
        aria-label={muted ? '배경음악 켜기' : '배경음악 끄기'}
      >
        <Icon size={23} />
        <span className="ambient-bgm-label">{muted ? '배경음악 OFF' : '배경음악 ON'}</span>
      </button>
      <div className={`ambient-bgm-popover ${open ? 'open' : ''}`}>
        <input
          type="range"
          className="ambient-bgm-slider"
          min={0}
          max={100}
          value={displayVolume}
          onChange={(event) => handleVolumeChange(Number(event.target.value))}
          aria-label="배경음악 볼륨"
        />
      </div>
    </div>
  )
}
