'use client'

/**
 * 음원 파일 없이 WebAudio로 합성한 투표 효과음.
 * 마감 임박 틱 소리와 결과 공개 팡파레를 만듭니다.
 */
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
  osc.frequency.value = 760 + strength * 180
  gain.gain.value = 0.0001
  osc.connect(gain)
  gain.connect(audio.destination)

  const now = audio.currentTime
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
  osc.start(now)
  osc.stop(now + 0.06)
}

export function playRevealFanfare(): void {
  const audio = getContext()
  if (!audio) return

  const notes = [493.88, 587.33, 739.99, 987.77]
  const now = audio.currentTime

  notes.forEach((freq, index) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const start = now + index * 0.1
    gain.gain.value = 0.0001
    osc.connect(gain)
    gain.connect(audio.destination)
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4)
    osc.start(start)
    osc.stop(start + 0.45)
  })
}
