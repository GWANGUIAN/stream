import { AuthError, ReauthorizationRequiredError } from '@stream/core'
import { describe, expect, it, vi } from 'vitest'
import { MemoryTokenStore } from './store/memory'
import { TokenManager } from './token-manager'
import type { OAuthProvider, TokenSet } from './types'

function tokens(overrides: Partial<TokenSet> = {}): TokenSet {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresAt: Date.now() + 3_600_000,
    tokenType: 'Bearer',
    ...overrides,
  }
}

function mockProvider(overrides: Partial<OAuthProvider> = {}): OAuthProvider {
  return {
    platform: 'chzzk',
    configured: true,
    supportsRevoke: true,
    createAuthorization: vi.fn(),
    exchangeCode: vi.fn(),
    refresh: vi.fn(async (t) =>
      tokens({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        expiresAt: Date.now() + 3_600_000,
        raw: { from: t.refreshToken },
      }),
    ),
    revoke: vi.fn(async () => undefined),
    getIdentity: vi.fn(),
    ...overrides,
  }
}

describe('TokenManager', () => {
  it('유효한 토큰은 갱신 없이 그대로 돌려준다', async () => {
    const store = new MemoryTokenStore()
    const provider = mockProvider()
    const manager = new TokenManager({ provider, store })
    const key = manager.key()
    const current = tokens()
    await store.set(key, current)

    await expect(manager.get(key)).resolves.toEqual(current)
    expect(provider.refresh).not.toHaveBeenCalled()
  })

  it('만료 임박 시 선제 갱신한다', async () => {
    const store = new MemoryTokenStore()
    const provider = mockProvider()
    const now = Date.now()
    const manager = new TokenManager({
      provider,
      store,
      refreshSkewMs: 60_000,
      now: () => now,
    })
    const key = manager.key()
    await store.set(key, tokens({ expiresAt: now + 30_000 }))

    const next = await manager.get(key)
    expect(next?.accessToken).toBe('access-2')
    expect(provider.refresh).toHaveBeenCalledOnce()
    await expect(store.get(key)).resolves.toMatchObject({ accessToken: 'access-2' })
  })

  it('동시 갱신은 single-flight로 한 번만 호출한다', async () => {
    let resolveRefresh!: (value: TokenSet) => void
    const refreshPromise = new Promise<TokenSet>((resolve) => {
      resolveRefresh = resolve
    })
    const provider = mockProvider({
      refresh: vi.fn(() => refreshPromise),
    })
    const store = new MemoryTokenStore()
    const now = Date.now()
    const manager = new TokenManager({
      provider,
      store,
      now: () => now,
    })
    const key = manager.key()
    await store.set(key, tokens({ expiresAt: now - 1 }))

    const a = manager.get(key)
    const b = manager.get(key)
    const c = manager.refresh(key)

    // store.get 마이크로태스크가 끝난 뒤에야 refresh가 시작됩니다.
    await Promise.resolve()
    await Promise.resolve()
    expect(provider.refresh).toHaveBeenCalledOnce()

    resolveRefresh(
      tokens({
        accessToken: 'access-shared',
        refreshToken: 'refresh-shared',
        expiresAt: now + 3_600_000,
      }),
    )

    const [ra, rb, rc] = await Promise.all([a, b, c])
    expect(ra?.accessToken).toBe('access-shared')
    expect(rb?.accessToken).toBe('access-shared')
    expect(rc.accessToken).toBe('access-shared')
    expect(provider.refresh).toHaveBeenCalledOnce()
  })

  it('갱신 AuthError면 저장소를 비우고 ReauthorizationRequiredError를 던진다', async () => {
    const store = new MemoryTokenStore()
    const provider = mockProvider({
      refresh: vi.fn(async () => {
        throw new AuthError('INVALID_TOKEN', { platform: 'chzzk' })
      }),
    })
    const manager = new TokenManager({ provider, store })
    const key = manager.key()
    await store.set(key, tokens({ expiresAt: Date.now() - 1 }))

    await expect(manager.get(key)).rejects.toBeInstanceOf(ReauthorizationRequiredError)
    await expect(store.get(key)).resolves.toBeUndefined()
  })

  it('리프레시 토큰이 없으면 재인가를 요구한다', async () => {
    const store = new MemoryTokenStore()
    const provider = mockProvider()
    const manager = new TokenManager({ provider, store })
    const key = manager.key()
    await store.set(key, tokens({ refreshToken: undefined, expiresAt: Date.now() - 1 }))

    await expect(manager.get(key)).rejects.toBeInstanceOf(ReauthorizationRequiredError)
    await expect(store.get(key)).resolves.toBeUndefined()
  })

  it('revoke는 로컬 저장소를 먼저 비운다', async () => {
    const store = new MemoryTokenStore()
    const provider = mockProvider()
    const manager = new TokenManager({ provider, store })
    const key = manager.key()
    await store.set(key, tokens())

    await manager.revoke(key)
    await expect(store.get(key)).resolves.toBeUndefined()
    expect(provider.revoke).toHaveBeenCalledOnce()
  })
})
