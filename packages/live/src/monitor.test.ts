import type { StreamApi } from '@stream/api'
import type { ChannelLiveState } from '@stream/core'
import { describe, expect, it, vi } from 'vitest'
import { LiveMonitor } from './monitor'

function liveState(live: boolean, title = 't'): ChannelLiveState {
  return {
    platform: 'chzzk',
    channelId: 'c1',
    live,
    title,
  }
}

describe('LiveMonitor', () => {
  it('라이브 전환을 감지합니다', async () => {
    const getLive = vi
      .fn<StreamApi['getLive']>()
      .mockResolvedValueOnce(liveState(false))
      .mockResolvedValueOnce(liveState(true, 'on'))

    const api = { platform: 'chzzk', getLive } as unknown as StreamApi
    const onChange = vi.fn()
    const monitor = new LiveMonitor({
      channels: [{ platform: 'chzzk', channelId: 'c1', api }],
      onChange,
    })

    await monitor.tick()
    await monitor.tick()

    expect(onChange).toHaveBeenCalled()
    expect(monitor.getMerged().anyLive).toBe(true)
    expect(monitor.formatUptime()).not.toBe('오프라인')
  })
})
