import type { ChatDonationEvent } from '@stream/chat'

/**
 * 도네 금액 → 등록 개수 변환 방식.
 *
 * - `multiple`: 단위 금액의 배수만큼 등록. 단위 10에 별풍선 100 → 동일 아이템 10개.
 * - `exact`: 금액이 단위와 정확히 일치할 때만 1개 등록.
 * - `atLeast`: 단위 이상이면 금액과 무관하게 1개 등록.
 */
export type RegisterMode = 'multiple' | 'exact' | 'atLeast'

export interface DonationRule {
  /** 최소/단위 도네값. */
  unitAmount: number
  mode: RegisterMode
  /** 한 번의 후원으로 등록될 수 있는 최대 개수(폭탄 후원 방어). */
  maxPerDonation?: number
  /** 후원 메시지가 빈 경우 처리. */
  emptyText: 'ignore' | 'nickname'
  maxLabelLength: number
  /** true면 대소문자/공백을 통일해 같은 아이템으로 병합합니다. */
  normalize: boolean
  blockedUsers: string[]
  bannedWords: string[]
}

export const DEFAULT_DONATION_RULE: DonationRule = {
  unitAmount: 10,
  mode: 'multiple',
  maxPerDonation: 50,
  emptyText: 'nickname',
  maxLabelLength: 20,
  normalize: true,
  blockedUsers: [],
  bannedWords: [],
}

export type RejectReason =
  | 'closed'
  | 'invalid-amount'
  | 'below-minimum'
  | 'not-exact'
  | 'empty-text'
  | 'blocked-user'
  | 'banned-word'

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  closed: '접수 마감',
  'invalid-amount': '잘못된 금액',
  'below-minimum': '최소 금액 미달',
  'not-exact': '금액 불일치',
  'empty-text': '메시지 없음',
  'blocked-user': '차단된 유저',
  'banned-word': '금지어 포함',
}

export interface RegisterAccepted {
  ok: true
  label: string
  count: number
  /** `multiple` 모드에서 단위로 나누어지지 않고 남은 금액. */
  remainder: number
}

export interface RegisterRejected {
  ok: false
  reason: RejectReason
}

export type RegisterOutcome = RegisterAccepted | RegisterRejected

export type DonationInput = Pick<ChatDonationEvent, 'user' | 'amount' | 'text'>

export function normalizeLabel(text: string, rule: Pick<DonationRule, 'maxLabelLength'>): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  return trimmed.length > rule.maxLabelLength ? trimmed.slice(0, rule.maxLabelLength) : trimmed
}

function matchesBannedWord(text: string, bannedWords: string[]): boolean {
  const lower = text.toLowerCase()
  return bannedWords.some((word) => word.trim() && lower.includes(word.trim().toLowerCase()))
}

function isBlocked(user: DonationInput['user'], blockedUsers: string[]): boolean {
  return blockedUsers.some(
    (blocked) => blocked === user.id || blocked.toLowerCase() === user.nickname.toLowerCase(),
  )
}

/**
 * 후원 이벤트를 룰에 따라 "아이템 라벨 몇 개 등록"으로 변환합니다.
 * 순수 함수라 UI/네트워크 없이 테스트할 수 있습니다.
 */
export function resolveDonation(
  event: DonationInput,
  rule: DonationRule,
  isRegistrationOpen: boolean,
): RegisterOutcome {
  if (!isRegistrationOpen) {
    return { ok: false, reason: 'closed' }
  }

  if (!Number.isFinite(event.amount) || event.amount <= 0) {
    return { ok: false, reason: 'invalid-amount' }
  }

  if (isBlocked(event.user, rule.blockedUsers)) {
    return { ok: false, reason: 'blocked-user' }
  }

  const rawText = event.text?.trim() ?? ''
  let label: string

  if (rawText) {
    if (matchesBannedWord(rawText, rule.bannedWords)) {
      return { ok: false, reason: 'banned-word' }
    }
    label = normalizeLabel(rawText, rule)
  } else if (rule.emptyText === 'nickname') {
    label = normalizeLabel(event.user.nickname, rule)
  } else {
    return { ok: false, reason: 'empty-text' }
  }

  if (!label) {
    return { ok: false, reason: 'empty-text' }
  }

  let count: number
  let remainder = 0

  if (rule.mode === 'exact') {
    if (event.amount !== rule.unitAmount) {
      return { ok: false, reason: 'not-exact' }
    }
    count = 1
  } else if (rule.mode === 'atLeast') {
    if (event.amount < rule.unitAmount) {
      return { ok: false, reason: 'below-minimum' }
    }
    count = 1
  } else {
    if (event.amount < rule.unitAmount) {
      return { ok: false, reason: 'below-minimum' }
    }
    count = Math.floor(event.amount / rule.unitAmount)
    remainder = event.amount - count * rule.unitAmount
  }

  if (rule.maxPerDonation != null) {
    count = Math.min(count, rule.maxPerDonation)
  }

  return { ok: true, label, count, remainder }
}
