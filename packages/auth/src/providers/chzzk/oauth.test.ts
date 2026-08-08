import { describe, expect, it, vi } from 'vitest'
import { createSignedState } from '../../state'
import { ChzzkOAuthProvider } from './oauth'
import { parseChzzkTokenSet } from './schema'

const SECRET = 'test-auth-secret-at-least-16-chars'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('parseChzzkTokenSet', () => {
  it('숫자 expiresIn을 절대 시각으로 바꾼다', () => {
    const now = 1_700_000_000_000
    const tokens = parseChzzkTokenSet(
      {
        code: 200,
        message: null,
        content: {
          accessToken: 'a',
          refreshToken: 'r',
          tokenType: 'Bearer',
          expiresIn: 86400,
          scope: '유저 조회',
        },
      },
      now,
    )
    expect(tokens.expiresAt).toBe(now + 86400 * 1000)
    expect(tokens.scope).toBe('유저 조회')
  })

  it('문자열 expiresIn도 받는다', () => {
    const now = 1_700_000_000_000
    const tokens = parseChzzkTokenSet(
      {
        code: 200,
        content: {
          accessToken: 'a',
          tokenType: 'Bearer',
          expiresIn: '3600',
        },
      },
      now,
    )
    expect(tokens.expiresAt).toBe(now + 3600 * 1000)
  })
})

describe('ChzzkOAuthProvider', () => {
  it('인가 URL은 account-interlock에 clientId/redirectUri/state를 싣는다', () => {
    const provider = new ChzzkOAuthProvider({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost:3000/api/auth/chzzk/callback',
      secret: SECRET,
    })
    const auth = provider.createAuthorization()
    const url = new URL(auth.url)
    expect(url.origin + url.pathname).toBe('https://chzzk.naver.com/account-interlock')
    expect(url.searchParams.get('clientId')).toBe('cid')
    expect(url.searchParams.get('redirectUri')).toContain('/api/auth/chzzk/callback')
    expect(url.searchParams.get('state')).toBe(auth.state)
    expect(auth.stateCookie.name).toBe('stream_state_chzzk')
  })

  it('토큰 교환은 JSON 바디로 grantType을 보낸다', async () => {
    const signed = createSignedState(SECRET)
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body).toMatchObject({
        grantType: 'authorization_code',
        clientId: 'cid',
        clientSecret: 'csec',
        code: 'the-code',
        state: signed.value,
      })
      expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
      return jsonResponse({
        code: 200,
        content: {
          accessToken: 'atk',
          refreshToken: 'rtk',
          tokenType: 'Bearer',
          expiresIn: 100,
        },
      })
    })

    const provider = new ChzzkOAuthProvider({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost:3000/cb',
      secret: SECRET,
      fetch: fetchImpl as unknown as typeof fetch,
    })

    const tokens = await provider.exchangeCode({
      code: 'the-code',
      state: signed.value,
      storedState: signed.value,
    })
    expect(tokens.accessToken).toBe('atk')
    expect(tokens.refreshToken).toBe('rtk')
  })

  it('users/me는 Bearer + Client-Id + Client-Secret을 함께 보낸다', async () => {
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('authorization')).toBe('Bearer atk')
      expect(headers.get('client-id')).toBe('cid')
      expect(headers.get('client-secret')).toBe('csec')
      return jsonResponse({
        code: 200,
        content: { channelId: 'ch-1', channelName: '테스트채널' },
      })
    })

    const provider = new ChzzkOAuthProvider({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost:3000/cb',
      secret: SECRET,
      fetch: fetchImpl as unknown as typeof fetch,
    })

    const identity = await provider.getIdentity({
      kind: 'oauth',
      platform: 'chzzk',
      tokens: {
        accessToken: 'atk',
        expiresAt: Date.now() + 10_000,
        tokenType: 'Bearer',
      },
    })
    expect(identity).toMatchObject({ id: 'ch-1', nickname: '테스트채널', channelId: 'ch-1' })
  })
})
