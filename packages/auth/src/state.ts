import { createHmac, randomBytes } from 'node:crypto'
import { type Platform, StateMismatchError } from '@stream/core'
import { base64url, deriveKey, fromBase64url, safeEqual } from './crypto'
import type { StateCookie } from './types'

const STATE_PURPOSE = 'oauth-state'
export const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000

interface StatePayload {
  /** nonce */
  n: string
  /** 만료 epoch ms */
  x: number
  /** 부가 데이터 */
  d?: Record<string, string>
}

export interface SignedState {
  value: string
  expiresAt: number
  nonce: string
}

export interface CreateStateOptions {
  ttlMs?: number
  data?: Record<string, string>
  now?: number
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', deriveKey(secret, STATE_PURPOSE)).update(payload).digest('base64url')
}

/**
 * CSRF 방어용 서명 state를 만듭니다.
 *
 * SOOP은 인가 요청에 state 파라미터가 아예 없어서 값을 왕복시킬 수 없습니다.
 * 그래서 이 값을 httpOnly 쿠키에 심어두고 콜백에서 쿠키만으로 검증합니다.
 * 치지직은 정상적으로 왕복하므로 쿼리와 쿠키를 함께 대조합니다.
 */
export function createSignedState(secret: string, options: CreateStateOptions = {}): SignedState {
  const now = options.now ?? Date.now()
  const nonce = randomBytes(16).toString('base64url')
  const expiresAt = now + (options.ttlMs ?? DEFAULT_STATE_TTL_MS)
  const payload: StatePayload = { n: nonce, x: expiresAt }
  if (options.data && Object.keys(options.data).length > 0) payload.d = options.data

  const encoded = base64url(JSON.stringify(payload))
  return { value: `${encoded}.${sign(secret, encoded)}`, expiresAt, nonce }
}

export interface VerifiedState {
  nonce: string
  expiresAt: number
  data: Record<string, string>
}

export function verifySignedState(
  secret: string,
  value: string | undefined,
  now = Date.now(),
): VerifiedState {
  if (!value) {
    throw new StateMismatchError('state 쿠키가 없습니다. 인가 요청부터 다시 시작하세요.')
  }

  const separator = value.lastIndexOf('.')
  if (separator <= 0) throw new StateMismatchError('state 형식이 올바르지 않습니다.')

  const encoded = value.slice(0, separator)
  const signature = value.slice(separator + 1)
  if (!safeEqual(signature, sign(secret, encoded))) {
    throw new StateMismatchError('state 서명이 일치하지 않습니다.')
  }

  let payload: StatePayload
  try {
    payload = JSON.parse(fromBase64url(encoded).toString('utf8')) as StatePayload
  } catch {
    throw new StateMismatchError('state 내용을 읽을 수 없습니다.')
  }

  if (typeof payload.x !== 'number' || payload.x < now) {
    throw new StateMismatchError('state가 만료되었습니다. 인가 요청부터 다시 시작하세요.')
  }

  return { nonce: payload.n, expiresAt: payload.x, data: payload.d ?? {} }
}

export interface AssertStateParams {
  secret: string
  platform: Platform
  /** 콜백 쿼리의 state. SOOP은 undefined입니다. */
  queryState?: string
  /** 쿠키에 저장해 둔 state. */
  cookieState?: string
  /** true면 쿼리 state가 반드시 있어야 합니다. 치지직이 여기 해당합니다. */
  requireQueryState: boolean
  now?: number
}

export function assertState(params: AssertStateParams): VerifiedState {
  const verified = verifySignedState(params.secret, params.cookieState, params.now)

  if (params.requireQueryState) {
    if (!params.queryState) {
      throw new StateMismatchError(`${params.platform} 콜백에 state가 없습니다.`, {
        platform: params.platform,
      })
    }
    if (!safeEqual(params.queryState, params.cookieState ?? '')) {
      throw new StateMismatchError(`${params.platform} state가 쿠키와 일치하지 않습니다.`, {
        platform: params.platform,
      })
    }
  }

  return verified
}

export function stateCookieName(platform: Platform): string {
  return `stream_state_${platform}`
}

export function toStateCookie(
  platform: Platform,
  state: SignedState,
  now = Date.now(),
): StateCookie {
  return {
    name: stateCookieName(platform),
    value: state.value,
    maxAgeSeconds: Math.max(1, Math.ceil((state.expiresAt - now) / 1000)),
  }
}
