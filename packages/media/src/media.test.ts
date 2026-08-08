import { describe, expect, it } from 'vitest'
import { channelPageUrl, playerCandidateUrls, vodListHint } from './media'

describe('media helpers', () => {
  it('플랫폼별 URL을 만듭니다', () => {
    expect(channelPageUrl('chzzk', 'abc')).toContain('chzzk.naver.com/abc')
    expect(playerCandidateUrls('soop', 'me')[0]).toContain('sooplive')
    expect(vodListHint('chzzk', 'abc').listUrl).toContain('/videos')
  })
})
