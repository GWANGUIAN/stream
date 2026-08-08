import type { ZodType } from 'zod'
import { AuthError, NetworkError, ProviderError, RateLimitError } from './errors'
import { parseWith } from './schema'
import type { Platform } from './types'

export type QueryValue = string | number | boolean | null | undefined
export type QueryInput = Record<string, QueryValue | readonly QueryValue[]>
export type FormInput = Record<string, QueryValue>

export interface RetryOptions {
  /** 최초 시도를 포함한 총 시도 횟수. */
  attempts: number
  baseDelayMs: number
  maxDelayMs: number
  /** thundering herd 방지. 실제 대기는 [delay/2, delay] 범위에서 뽑습니다. */
  jitter: boolean
  retryOnStatus: readonly number[]
}

export const DEFAULT_RETRY: RetryOptions = {
  attempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 8_000,
  jitter: true,
  retryOnStatus: [408, 425, 429, 500, 502, 503, 504],
}

export interface HttpClientOptions {
  baseUrl?: string
  headers?: Record<string, string>
  timeoutMs?: number
  retry?: Partial<RetryOptions>
  platform?: Platform
  /** 테스트에서 주입하기 위한 훅. */
  fetch?: typeof globalThis.fetch
}

export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  query?: QueryInput
  /** JSON 바디. 치지직 토큰 엔드포인트가 이걸 씁니다. */
  json?: unknown
  /** application/x-www-form-urlencoded 바디. SOOP이 이걸 씁니다. */
  form?: FormInput
  body?: BodyInit
  /** Cookie 헤더로 직렬화됩니다. 비공식 API 인증에 씁니다. */
  cookies?: Record<string, string | undefined>
  timeoutMs?: number
  retry?: Partial<RetryOptions> | false
  signal?: AbortSignal
}

export interface JsonRequestOptions<T> extends RequestOptions {
  schema?: ZodType<T>
  /** 스키마 컨텍스트 라벨. 에러 메시지에 들어갑니다. */
  label?: string
}

export function buildQuery(query: QueryInput): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue
        params.append(key, String(item))
      }
    } else {
      params.append(key, String(value))
    }
  }
  return params.toString()
}

export function buildForm(form: FormInput): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(form)) {
    if (value === undefined || value === null) continue
    params.append(key, String(value))
  }
  return params.toString()
}

export function serializeCookies(cookies: Record<string, string | undefined>): string {
  return Object.entries(cookies)
    .filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '')
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

/** Set-Cookie 헤더들에서 name=value 만 추출합니다. 속성(Path, HttpOnly 등)은 버립니다. */
export function parseSetCookies(response: Response): Record<string, string> {
  const jar: Record<string, string> = {}
  const raw = response.headers.getSetCookie?.() ?? []
  for (const line of raw) {
    const pair = line.split(';', 1)[0]
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq <= 0) continue
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
  }
  return jar
}

/** Retry-After는 초 단위 정수 또는 HTTP-date 두 형태로 옵니다. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, date - now)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason ?? new Error('aborted'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function backoffDelay(attempt: number, options: RetryOptions): number {
  const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** attempt)
  return options.jitter ? exponential / 2 + Math.random() * (exponential / 2) : exponential
}

/**
 * 재시도와 타임아웃을 갖춘 얇은 fetch 래퍼.
 *
 * 치지직과 SOOP 모두 수치 쿼터를 공개하지 않기 때문에 지수 백오프가 사실상 유일한
 * 방어 수단입니다. 429는 Retry-After를 우선 존중합니다.
 */
export class HttpClient {
  private readonly baseUrl?: string
  private readonly defaultHeaders: Record<string, string>
  private readonly timeoutMs: number
  private readonly retry: RetryOptions
  private readonly platform?: Platform
  private readonly fetchImpl: typeof globalThis.fetch

  constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl
    this.defaultHeaders = options.headers ?? {}
    this.timeoutMs = options.timeoutMs ?? 10_000
    this.retry = { ...DEFAULT_RETRY, ...options.retry }
    this.platform = options.platform
    // globalThis.fetch를 그대로 넘기면 illegal invocation이 나므로 바인딩합니다.
    this.fetchImpl = options.fetch ?? ((input, init) => globalThis.fetch(input, init))
  }

  /** 기본 헤더/베이스 URL만 바꾼 파생 클라이언트. */
  extend(options: HttpClientOptions): HttpClient {
    return new HttpClient({
      baseUrl: options.baseUrl ?? this.baseUrl,
      headers: { ...this.defaultHeaders, ...options.headers },
      timeoutMs: options.timeoutMs ?? this.timeoutMs,
      retry: { ...this.retry, ...options.retry },
      platform: options.platform ?? this.platform,
      fetch: options.fetch ?? this.fetchImpl,
    })
  }

  resolveUrl(path: string, query?: QueryInput): string {
    const base = this.baseUrl
    let url =
      /^https?:\/\//i.test(path) || !base
        ? path
        : `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
    if (query) {
      const qs = buildQuery(query)
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
    }
    return url
  }

  async send(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = this.resolveUrl(path, options.query)
    const headers = new Headers({ ...this.defaultHeaders, ...options.headers })

    let body = options.body
    if (options.json !== undefined) {
      body = JSON.stringify(options.json)
      if (!headers.has('content-type')) headers.set('content-type', 'application/json')
    } else if (options.form !== undefined) {
      body = buildForm(options.form)
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/x-www-form-urlencoded')
      }
    }

    if (options.cookies) {
      const cookie = serializeCookies(options.cookies)
      if (cookie) headers.set('cookie', cookie)
    }

    const method = options.method ?? (body === undefined ? 'GET' : 'POST')
    const retry =
      options.retry === false ? { ...this.retry, attempts: 1 } : { ...this.retry, ...options.retry }
    const timeoutMs = options.timeoutMs ?? this.timeoutMs

    let lastError: unknown
    for (let attempt = 0; attempt < retry.attempts; attempt++) {
      const timeoutSignal = AbortSignal.timeout(timeoutMs)
      const signal = options.signal
        ? AbortSignal.any([options.signal, timeoutSignal])
        : timeoutSignal

      let response: Response
      try {
        response = await this.fetchImpl(url, { method, headers, body, signal, redirect: 'manual' })
      } catch (cause) {
        // 호출자가 직접 중단한 경우는 재시도하지 않습니다.
        if (options.signal?.aborted) throw options.signal.reason
        lastError = new NetworkError(`${method} ${url} 요청 실패`, {
          platform: this.platform,
          cause,
        })
        if (attempt === retry.attempts - 1) break
        await sleep(backoffDelay(attempt, retry), options.signal)
        continue
      }

      if (response.ok || !retry.retryOnStatus.includes(response.status)) {
        return response
      }

      const isLast = attempt === retry.attempts - 1
      if (isLast) return response

      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      await sleep(retryAfter ?? backoffDelay(attempt, retry), options.signal)
    }

    throw lastError ?? new NetworkError(`${method} ${url} 요청 실패`, { platform: this.platform })
  }

  /**
   * 응답을 JSON으로 파싱합니다. 비-2xx는 상태코드에 맞는 에러로 변환합니다.
   * 리다이렉트(3xx)는 SOOP 인가 흐름에서 정상 신호이므로 그대로 통과시키지 않고
   * ProviderError로 올립니다. 필요하면 `send`를 직접 쓰세요.
   */
  async json<T = unknown>(path: string, options: JsonRequestOptions<T> = {}): Promise<T> {
    const response = await this.send(path, options)
    const raw = await response.text()
    const parsed = raw ? safeJsonParse(raw) : undefined

    if (!response.ok) {
      throw this.toError(response, parsed ?? raw, this.resolveUrl(path, options.query))
    }

    if (!options.schema) return parsed as T
    return parseWith(options.schema, parsed, {
      label: options.label ?? `${response.status} ${this.resolveUrl(path)}`,
      platform: this.platform,
    })
  }

  async text(path: string, options: RequestOptions = {}): Promise<string> {
    const response = await this.send(path, options)
    const raw = await response.text()
    if (!response.ok) throw this.toError(response, raw, this.resolveUrl(path, options.query))
    return raw
  }

  private toError(response: Response, body: unknown, url: string) {
    const message = extractMessage(body) ?? response.statusText ?? 'unknown error'
    const shared = { platform: this.platform, status: response.status, body, url }

    if (response.status === 429) {
      return new RateLimitError(`요청 한도 초과: ${message}`, {
        platform: this.platform,
        retryAfterMs: parseRetryAfter(response.headers.get('retry-after')),
      })
    }
    if (response.status === 401 || response.status === 403) {
      return new AuthError(`인증 실패(${response.status}): ${message}`, {
        platform: this.platform,
        cause: new ProviderError(message, shared),
      })
    }
    return new ProviderError(`${response.status} ${message}`, shared)
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body.slice(0, 300)
  if (body && typeof body === 'object') {
    for (const key of ['message', 'msg', 'error_description', 'error']) {
      const value = (body as Record<string, unknown>)[key]
      if (typeof value === 'string' && value) return value
    }
  }
  return undefined
}
