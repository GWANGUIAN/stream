import type { ChatUser } from '@stream/core'
import { describe, expect, it } from 'vitest'
import { DEFAULT_DONATION_RULE, type DonationRule, resolveDonation } from './rules'

function user(overrides: Partial<ChatUser> = {}): ChatUser {
  return {
    platform: 'chzzk',
    id: 'u1',
    nickname: '홍길동',
    role: 'viewer',
    badges: [],
    ...overrides,
  }
}

describe('resolveDonation', () => {
  it('multiple 모드: 단위 10에 별풍선 100 → 동일 아이템 10개', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, unitAmount: 10, mode: 'multiple' }
    const outcome = resolveDonation({ user: user(), amount: 100, text: '치킨' }, rule, true)
    expect(outcome).toMatchObject({ ok: true, label: '치킨', count: 10, remainder: 0 })
  })

  it('multiple 모드: 나머지가 있으면 remainder로 보고합니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, unitAmount: 10, mode: 'multiple' }
    const outcome = resolveDonation({ user: user(), amount: 105, text: '피자' }, rule, true)
    expect(outcome).toMatchObject({ ok: true, count: 10, remainder: 5 })
  })

  it('multiple 모드: 단위 미달이면 거절합니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, unitAmount: 10, mode: 'multiple' }
    const outcome = resolveDonation({ user: user(), amount: 5, text: '떡볶이' }, rule, true)
    expect(outcome).toEqual({ ok: false, reason: 'below-minimum' })
  })

  it('exact 모드: 정확히 일치할 때만 1개 등록합니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, unitAmount: 10, mode: 'exact' }
    expect(resolveDonation({ user: user(), amount: 10, text: 'A' }, rule, true)).toMatchObject({
      ok: true,
      count: 1,
    })
    expect(resolveDonation({ user: user(), amount: 100, text: 'A' }, rule, true)).toEqual({
      ok: false,
      reason: 'not-exact',
    })
  })

  it('atLeast 모드: 단위 이상이면 금액과 무관하게 1개', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, unitAmount: 10, mode: 'atLeast' }
    expect(resolveDonation({ user: user(), amount: 999, text: 'A' }, rule, true)).toMatchObject({
      ok: true,
      count: 1,
    })
  })

  it('maxPerDonation으로 폭탄 후원을 제한합니다', () => {
    const rule: DonationRule = {
      ...DEFAULT_DONATION_RULE,
      unitAmount: 10,
      mode: 'multiple',
      maxPerDonation: 5,
    }
    const outcome = resolveDonation({ user: user(), amount: 1000, text: 'A' }, rule, true)
    expect(outcome).toMatchObject({ ok: true, count: 5 })
  })

  it('접수가 닫혀있으면 거절합니다', () => {
    const outcome = resolveDonation(
      { user: user(), amount: 100, text: 'A' },
      DEFAULT_DONATION_RULE,
      false,
    )
    expect(outcome).toEqual({ ok: false, reason: 'closed' })
  })

  it('메시지가 없고 emptyText가 ignore면 거절합니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, emptyText: 'ignore' }
    const outcome = resolveDonation({ user: user(), amount: 100, text: '' }, rule, true)
    expect(outcome).toEqual({ ok: false, reason: 'empty-text' })
  })

  it('메시지가 없고 emptyText가 nickname이면 닉네임을 라벨로 씁니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, emptyText: 'nickname' }
    const outcome = resolveDonation({ user: user(), amount: 10, text: undefined }, rule, true)
    expect(outcome).toMatchObject({ ok: true, label: '홍길동' })
  })

  it('금지어가 포함되면 거절합니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, bannedWords: ['금지'] }
    const outcome = resolveDonation(
      { user: user(), amount: 100, text: '이건 금지 단어' },
      rule,
      true,
    )
    expect(outcome).toEqual({ ok: false, reason: 'banned-word' })
  })

  it('차단된 유저는 닉네임/아이디로 걸러집니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, blockedUsers: ['홍길동'] }
    const outcome = resolveDonation({ user: user(), amount: 100, text: 'A' }, rule, true)
    expect(outcome).toEqual({ ok: false, reason: 'blocked-user' })
  })

  it('라벨이 maxLabelLength를 넘으면 잘라냅니다', () => {
    const rule: DonationRule = { ...DEFAULT_DONATION_RULE, maxLabelLength: 5 }
    const outcome = resolveDonation(
      { user: user(), amount: 10, text: '가나다라마바사' },
      rule,
      true,
    )
    expect(outcome).toMatchObject({ ok: true, label: '가나다라마' })
  })

  it('금액이 0 이하거나 유효하지 않으면 거절합니다', () => {
    expect(
      resolveDonation({ user: user(), amount: 0, text: 'A' }, DEFAULT_DONATION_RULE, true),
    ).toEqual({
      ok: false,
      reason: 'invalid-amount',
    })
    expect(
      resolveDonation({ user: user(), amount: Number.NaN, text: 'A' }, DEFAULT_DONATION_RULE, true),
    ).toEqual({ ok: false, reason: 'invalid-amount' })
  })
})
