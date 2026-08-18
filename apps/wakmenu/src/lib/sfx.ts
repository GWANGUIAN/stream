let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, startOffset: number, duration: number, gainValue: number, type: OscillatorType = 'square') {
  const audioCtx = getCtx()
  if (!audioCtx) return
  const start = audioCtx.currentTime + startOffset
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(gainValue, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(start)
  osc.stop(start + duration)
}

let spinTimer: number | null = null

/** Rapid ticking loop mimicking a roulette wheel clicking past each label. */
export function startSpinSound() {
  if (spinTimer != null) return
  const tick = () => tone(620 + Math.random() * 180, 0, 0.045, 0.05)
  tick()
  spinTimer = window.setInterval(tick, 90)
}

export function stopSpinSound() {
  if (spinTimer != null) { window.clearInterval(spinTimer); spinTimer = null }
}

/** Short bright chime for an individual answer reveal (paired with confetti). */
export function playRevealChime() {
  tone(880, 0, 0.16, 0.07, 'sine')
  tone(1318.5, 0.07, 0.22, 0.07, 'sine')
}

/** Single warning beep, once per second, for the 6-10s window before time runs out. */
export function playCountdownWarn() {
  tone(700, 0, 0.05, 0.035, 'square')
}

/** Sharper double-beep once 5 seconds or less remain. */
export function playCountdownUrgent() {
  tone(1400, 0, 0.09, 0.08, 'square')
  tone(1400, 0.12, 0.09, 0.08, 'square')
}
