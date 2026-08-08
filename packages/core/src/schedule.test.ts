import { describe, expect, it, vi } from 'vitest'
import { createScheduleFlush } from './schedule'

describe('createScheduleFlush', () => {
  it('같은 틱에서 여러 번 호출해도 flush는 한 번만 실행합니다', async () => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) => {
        queueMicrotask(() => cb(0))
        return 1
      },
    )

    const flush = vi.fn()
    const schedule = createScheduleFlush(flush)
    schedule()
    schedule()
    schedule()

    await new Promise<void>((resolve) => queueMicrotask(resolve))
    await new Promise<void>((resolve) => queueMicrotask(resolve))

    expect(flush).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
