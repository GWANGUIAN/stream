export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('ko-KR', { hour12: false })
}

export function formatDateTime(at: number): string {
  return new Date(at).toLocaleString('ko-KR', { hour12: false })
}
