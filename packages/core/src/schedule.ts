/**
 * Coalesce repeated calls into a single flush on the next animation frame
 * (or microtask when `requestAnimationFrame` is unavailable).
 */
export function createScheduleFlush(flush: () => void): () => void {
  let pending = false

  return () => {
    if (pending) return
    pending = true

    const run = () => {
      pending = false
      flush()
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run)
      return
    }

    queueMicrotask(run)
  }
}
