'use client'

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtor) return null
  ctx ??= new AudioCtor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function playTick(strength = 1): void {
  const audio = getContext()
  if (!audio) return

  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'square'
  osc.frequency.value = 720 + strength * 200
  gain.gain.value = 0.0001
  osc.connect(gain)
  gain.connect(audio.destination)

  const now = audio.currentTime
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)
  osc.start(now)
  osc.stop(now + 0.05)
}

export function playLock(): void {
  const audio = getContext()
  if (!audio) return

  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 523.25
  gain.gain.value = 0.0001
  osc.connect(gain)
  gain.connect(audio.destination)

  const now = audio.currentTime
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)
  osc.start(now)
  osc.stop(now + 0.3)
}

export function playRevealFanfare(): void {
  const audio = getContext()
  if (!audio) return

  const notes = [392, 493.88, 587.33, 784]
  const now = audio.currentTime

  notes.forEach((freq, index) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const start = now + index * 0.09
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(audio.destination)
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
    osc.start(start)
    osc.stop(start + 0.4)
  })
}
