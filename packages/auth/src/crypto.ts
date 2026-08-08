import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

const HKDF_SALT = 'stream-auth-v1'

/**
 * 하나의 AUTH_SECRET에서 용도별 키를 갈라 씁니다.
 *
 * state 서명 키와 쿠키 암호화 키를 같은 바이트로 쓰면 한쪽의 오라클이 다른 쪽을
 * 약화시킬 수 있으므로 info 라벨로 분리합니다.
 */
export function deriveKey(secret: string, purpose: string, length = 32): Buffer {
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET은 최소 16자 이상이어야 합니다. 32바이트 랜덤 hex를 권장합니다.')
  }
  return Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), HKDF_SALT, purpose, length))
}

export function base64url(input: Buffer | string): string {
  return Buffer.from(input as never).toString('base64url')
}

export function fromBase64url(input: string): Buffer {
  return Buffer.from(input, 'base64url')
}

/** 길이가 달라도 타이밍 누출 없이 비교합니다. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    // 길이가 다르면 어차피 불일치지만, 조기 반환 타이밍을 감추기 위해 동일 길이로 한 번 비교합니다.
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

const IV_LENGTH = 12
const TAG_LENGTH = 16

/**
 * AES-256-GCM 봉인. 쿠키에 토큰을 담을 때 씁니다.
 * 출력 형식: base64url(iv | ciphertext | authTag)
 */
export function seal(secret: string, purpose: string, plaintext: string): string {
  const key = deriveKey(secret, purpose)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return base64url(Buffer.concat([iv, encrypted, cipher.getAuthTag()]))
}

/** 봉인 해제. 변조되었거나 다른 키로 만든 값이면 undefined. */
export function unseal(secret: string, purpose: string, sealed: string): string | undefined {
  try {
    const raw = fromBase64url(sealed)
    if (raw.length <= IV_LENGTH + TAG_LENGTH) return undefined
    const iv = raw.subarray(0, IV_LENGTH)
    const tag = raw.subarray(raw.length - TAG_LENGTH)
    const ciphertext = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH)
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret, purpose), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch {
    return undefined
  }
}
