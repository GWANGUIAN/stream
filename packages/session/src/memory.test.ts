import { describe, expect, it } from 'vitest'
import { createEmptyProfile, upsertLinkedAccount } from './helpers'
import { MemorySessionStore } from './memory'
import { SessionTokenStore } from './token-adapter'

describe('MemorySessionStore', () => {
  it('프로필과 토큰을 저장합니다', async () => {
    const store = new MemorySessionStore()
    let profile = createEmptyProfile('creator-1', 'Test')
    profile = upsertLinkedAccount(profile, {
      platform: 'chzzk',
      userId: 'hash',
      channelId: 'hash',
    })
    await store.saveProfile(profile)

    const loaded = await store.getProfile('creator-1')
    expect(loaded?.accounts).toHaveLength(1)

    const tokens = new SessionTokenStore(store)
    await tokens.set('chzzk:hash', {
      accessToken: 'a',
      refreshToken: 'r',
      expiresAt: Date.now() + 1000,
      tokenType: 'Bearer',
    })
    expect((await tokens.get('chzzk:hash'))?.accessToken).toBe('a')
  })
})
