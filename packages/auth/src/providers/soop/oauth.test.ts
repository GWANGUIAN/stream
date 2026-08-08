import { describe, expect, it, vi } from 'vitest'
import { createSignedState } from '../../state'
import { SoopOAuthProvider } from './oauth'
import { parseSoopTokenSet } from './schema'

const SECRET = 'test-auth-secret-at-least-16-chars'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('parseSoopTokenSet', () => {
  it('snake_case 토큰 응답을 TokenSet으로 바꾼다', () => {
    const now = 1_700_000_000_000
    const tokens = parseSoopTokenSet(
      {
        access_token: 'a',
        expires_in: 28800,
        token_type: 'Bearer',
        scope: null,
        refresh_token: 'r',
      },
      now,
    )
    expect(tokens.accessToken).toBe('a')
    expect(tokens.refreshToken).toBe('r')
    expect(tokens.expiresAt).toBe(now + 28800 * 1000)
    expect(tokens.scope).toBeUndefined()
  })
})

describe('SoopOAuthProvider', () => {
  it('인가 URL에 client_id만 싣고 state는 URL에 넣지 않는다', () => {
    const provider = new SoopOAuthProvider({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost:3000/api/auth/soop/callback',
      secret: SECRET,
    })
    const auth = provider.createAuthorization()
    const url = new URL(auth.url)
    expect(url.origin + url.pathname).toBe('https://openapi.sooplive.com/auth/code')
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.has('state')).toBe(false)
    expect(url.searchParams.has('redirect_uri')).toBe(false)
    expect(auth.stateCookie.name).toBe('stream_state_soop')
    expect(auth.state).toBeTruthy()
  })

  it('토큰 교환은 form-urlencoded이고 쿠키 state만 검증한다', async () => {
    const signed = createSignedState(SECRET)
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(new Headers(init?.headers).get('content-type')).toBe(
        'application/x-www-form-urlencoded',
      )
      const body = new URLSearchParams(String(init?.body))
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('code')).toBe('the-code')
      expect(body.get('client_id')).toBe('cid')
      expect(body.get('redirect_uri')).toBe('http://localhost:3000/cb')
      return jsonResponse({
        access_token: 'atk',
        refresh_token: 'rtk',
        expires_in: 100,
        token_type: 'Bearer',
        scope: null,
      })
    })

    const provider = new SoopOAuthProvider({
      clientId: 'cid',
      clientSecret: 'csec',
      redirectUri: 'http://localhost:3000/cb',
      secret: SECRET,
      fetch: fetchImpl as unknown as typeof fetch,
    })

    const tokens = await provider.exchangeCode({
      code: 'the-code',
      storedState: signed.value,
    })
    expect(tokens.accessToken).toBe('atk')
  })

  it('stationinfo는 access_token을 form 필드로 보낸다', async () => {
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = new URLSearchParams(String(init?.body))
      expect(body.get('access_token')).toBe('atk')
      expect(new Headers(init?.headers).get('authorization')).toBeNull()
      return jsonResponse({
        result: 1,
        data: {
          user_nick: '숲닉',
          station_name: '스테이션',
          profile_image: 'https://img.example/p.png',
        },
      })
    })

    const provider = new SoopOAuthProvider({
      clientId: 'cid',
      clientSecret: 'csec',
      secret: SECRET,
      fetch: fetchImpl as unknown as typeof fetch,
    })

    const identity = await provider.getIdentity({
      kind: 'oauth',
      platform: 'soop',
      tokens: {
        accessToken: 'atk',
        expiresAt: Date.now() + 10_000,
        tokenType: 'Bearer',
      },
    })
    expect(identity.nickname).toBe('숲닉')
  })

  it('configured가 false면 인가를 거부한다', () => {
    const provider = new SoopOAuthProvider({
      clientId: '',
      clientSecret: '',
      secret: SECRET,
    })
    expect(provider.configured).toBe(false)
    expect(() => provider.createAuthorization()).toThrow(/설정되지 않았습니다/)
  })
})
