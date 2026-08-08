import { StateMismatchError } from '@stream/core'
import { describe, expect, it } from 'vitest'
import { assertState, createSignedState, verifySignedState } from './state'

const SECRET = 'test-auth-secret-at-least-16-chars'

describe('createSignedState / verifySignedState', () => {
  it('서명된 state를 만들고 검증한다', () => {
    const signed = createSignedState(SECRET, { data: { returnTo: '/dashboard' } })
    const verified = verifySignedState(SECRET, signed.value)
    expect(verified.nonce).toBeTruthy()
    expect(verified.data.returnTo).toBe('/dashboard')
    expect(verified.expiresAt).toBe(signed.expiresAt)
  })

  it('만료된 state는 거부한다', () => {
    const signed = createSignedState(SECRET, { ttlMs: 1, now: 1000 })
    expect(() => verifySignedState(SECRET, signed.value, 2000)).toThrow(StateMismatchError)
  })

  it('변조된 서명은 거부한다', () => {
    const signed = createSignedState(SECRET)
    const tampered = `${signed.value.slice(0, -4)}xxxx`
    expect(() => verifySignedState(SECRET, tampered)).toThrow(StateMismatchError)
  })

  it('빈 값은 거부한다', () => {
    expect(() => verifySignedState(SECRET, undefined)).toThrow(StateMismatchError)
  })
})

describe('assertState', () => {
  it('치지직은 쿼리 state와 쿠키 state가 같아야 한다', () => {
    const signed = createSignedState(SECRET)
    const verified = assertState({
      secret: SECRET,
      platform: 'chzzk',
      queryState: signed.value,
      cookieState: signed.value,
      requireQueryState: true,
    })
    expect(verified.nonce).toBe(signed.nonce)
  })

  it('치지직에서 쿼리 state가 없으면 실패한다', () => {
    const signed = createSignedState(SECRET)
    expect(() =>
      assertState({
        secret: SECRET,
        platform: 'chzzk',
        cookieState: signed.value,
        requireQueryState: true,
      }),
    ).toThrow(StateMismatchError)
  })

  it('치지직에서 쿼리와 쿠키가 다르면 실패한다', () => {
    const a = createSignedState(SECRET)
    const b = createSignedState(SECRET)
    expect(() =>
      assertState({
        secret: SECRET,
        platform: 'chzzk',
        queryState: a.value,
        cookieState: b.value,
        requireQueryState: true,
      }),
    ).toThrow(StateMismatchError)
  })

  it('SOOP은 쿠키만으로 검증한다 (쿼리 state 없음)', () => {
    const signed = createSignedState(SECRET)
    const verified = assertState({
      secret: SECRET,
      platform: 'soop',
      cookieState: signed.value,
      requireQueryState: false,
    })
    expect(verified.nonce).toBe(signed.nonce)
  })
})
