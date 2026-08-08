import type { Platform } from '@stream/core'

export interface OverlayParams {
  platform?: Platform
  channelId?: string
  theme?: string
  compact?: boolean
}

/** OBS Browser Source URL 쿼리에서 오버레이 설정을 읽습니다. */
export function parseOverlayParams(
  search: string | URLSearchParams = typeof window !== 'undefined' ? window.location.search : '',
): OverlayParams {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  const platformRaw = params.get('platform')
  const platform = platformRaw === 'chzzk' || platformRaw === 'soop' ? platformRaw : undefined

  return {
    platform,
    channelId: params.get('channelId')?.trim() || undefined,
    theme: params.get('theme')?.trim() || undefined,
    compact: params.get('compact') === '1' || params.get('compact') === 'true',
  }
}

export function buildOverlaySearch(params: OverlayParams): string {
  const search = new URLSearchParams()
  if (params.platform) search.set('platform', params.platform)
  if (params.channelId) search.set('channelId', params.channelId)
  if (params.theme) search.set('theme', params.theme)
  if (params.compact) search.set('compact', '1')
  const value = search.toString()
  return value ? `?${value}` : ''
}
