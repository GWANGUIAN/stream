import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { AuthError, ProviderError, RateLimitError, SchemaError } from './errors'
import { buildForm, buildQuery, HttpClient, parseRetryAfter, serializeCookies } from './http'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('직렬화 헬퍼', () => {
  it('빈 값을 쿼리에서 제외하고 배열은 반복 키로 편다', () => {
    expect(buildQuery({ a: 1, b: undefined, c: null, d: ['x', 'y'], e: false })).toBe(
      'a=1&d=x&d=y&e=false',
    )
  })

  it('폼 바디도 같은 규칙으로 만든다', () => {
    expect(buildForm({ grant_type: 'refresh_token', code: undefined })).toBe(
      'grant_type=refresh_token',
    )
  })

  it('빈 문자열 쿠키는 헤더에 넣지 않는다', () => {
    expect(serializeCookies({ NID_AUT: 'a', NID_SES: '', other: undefined })).toBe('NID_AUT=a')
  })

  it('Retry-After를 초와 HTTP-date 양쪽으로 읽는다', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('3')).toBe(3000)
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:05 GMT', now)).toBe(5000)
    expect(parseRetryAfter(null)).toBeUndefined()
  })
})

describe('HttpClient', () => {
  it('baseUrl과 절대 URL을 함께 다룬다', () => {
    const client = new HttpClient({ baseUrl: 'https://openapi.chzzk.naver.com/' })
    expect(client.resolveUrl('/open/v1/users/me')).toBe(
      'https://openapi.chzzk.naver.com/open/v1/users/me',
    )
    expect(client.resolveUrl('https://other.example/x')).toBe('https://other.example/x')
    expect(client.resolveUrl('/a', { q: 1 })).toBe('https://openapi.chzzk.naver.com/a?q=1')
  })

  it('json 옵션은 JSON 바디와 content-type을 세팅한다 (치지직 토큰 엔드포인트)', async () => {
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.body).toBe('{"grantType":"authorization_code"}')
      expect(new Headers(init?.headers).get('content-type')).toBe('application/json')
      return jsonResponse({ ok: true })
    })
    const client = new HttpClient({ fetch: fetchImpl as unknown as typeof fetch })
    await client.json('https://example.test/token', { json: { grantType: 'authorization_code' } })
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('form 옵션은 urlencoded 바디를 만든다 (SOOP 토큰 엔드포인트)', async () => {
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.body).toBe('grant_type=refresh_token&refresh_token=r1')
      expect(new Headers(init?.headers).get('content-type')).toBe(
        'application/x-www-form-urlencoded',
      )
      return jsonResponse({ ok: true })
    })
    const client = new HttpClient({ fetch: fetchImpl as unknown as typeof fetch })
    await client.json('https://example.test/token', {
      form: { grant_type: 'refresh_token', refresh_token: 'r1' },
    })
  })

  it('5xx는 재시도하고 성공하면 그 결과를 돌려준다', async () => {
    let calls = 0
    const fetchImpl = vi.fn(async () => {
      calls += 1
      if (calls < 3) return new Response('boom', { status: 503 })
      return jsonResponse({ value: 'ok' })
    })
    const client = new HttpClient({
      fetch: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 3, baseDelayMs: 1, maxDelayMs: 2, jitter: false },
    })
    await expect(client.json('https://example.test/x')).resolves.toEqual({ value: 'ok' })
    expect(calls).toBe(3)
  })

  it('4xx는 재시도하지 않고 ProviderError로 올린다', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: '없는 채널' }, { status: 404 }))
    const client = new HttpClient({
      fetch: fetchImpl as unknown as typeof fetch,
      retry: { baseDelayMs: 1 },
    })
    await expect(client.json('https://example.test/x')).rejects.toBeInstanceOf(ProviderError)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('401은 AuthError로 바꾼다', async () => {
    const client = new HttpClient({
      fetch: (async () =>
        jsonResponse({ code: 401, message: 'INVALID_TOKEN' }, { status: 401 })) as typeof fetch,
    })
    await expect(client.json('https://example.test/x')).rejects.toBeInstanceOf(AuthError)
  })

  it('재시도를 모두 소진한 429는 RateLimitError가 된다', async () => {
    const client = new HttpClient({
      fetch: (async () =>
        new Response('slow down', {
          status: 429,
          headers: { 'retry-after': '0' },
        })) as typeof fetch,
      retry: { attempts: 2, baseDelayMs: 1, maxDelayMs: 1, jitter: false },
    })
    const error = await client.json('https://example.test/x').catch((e) => e)
    expect(error).toBeInstanceOf(RateLimitError)
    expect((error as RateLimitError).retryAfterMs).toBe(0)
  })

  it('스키마가 맞지 않으면 SchemaError를 던진다', async () => {
    const client = new HttpClient({
      fetch: (async () => jsonResponse({ channelName: 42 })) as typeof fetch,
    })
    await expect(
      client.json('https://example.test/x', {
        schema: z.object({ channelName: z.string() }),
        label: 'users/me',
      }),
    ).rejects.toBeInstanceOf(SchemaError)
  })

  it('호출자가 중단하면 재시도하지 않는다', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () => {
      controller.abort(new Error('사용자 취소'))
      throw new Error('aborted')
    })
    const client = new HttpClient({
      fetch: fetchImpl as unknown as typeof fetch,
      retry: { attempts: 5, baseDelayMs: 1 },
    })
    await expect(
      client.json('https://example.test/x', { signal: controller.signal }),
    ).rejects.toThrow('사용자 취소')
    expect(fetchImpl).toHaveBeenCalledOnce()
  })
})
