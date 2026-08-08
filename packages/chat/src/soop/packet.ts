/**
 * SOOP 채팅 패킷 포맷.
 *
 * 헤더 14바이트: `\x1b\t` + svc(4) + byteLength(6) + `00` + payload
 * - `\x1b\t` 는 필드 구분자가 아니라 패킷 시작자
 * - 필드 구분자는 `\f` (0x0C)
 * - 길이는 문자수가 아니라 UTF-8 바이트 길이 (한글 3바이트)
 */

export const STARTER = '\x1b\t'
export const SEPARATOR = '\f'
export const HEADER_TRAILER = '00'
export const HEADER_LENGTH = 14

export const SVC = {
  PING: '0000',
  CONNECT: '0001',
  ENTER: '0002',
  EXIT: '0004',
  CHAT: '0005',
  DISCONNECT: '0007',
  ENTER_INFO: '0012',
  TEXT_DONATION: '0018',
  AD_BALLOON: '0087',
  SUBSCRIBE: '0093',
  NOTIFICATION: '0104',
  VIDEO_DONATION: '0105',
  EMOTICON: '0109',
  VIEWER: '0127',
} as const

export function encodePacket(svc: string, payload: string): Buffer {
  const svcCode = svc.padStart(4, '0').slice(-4)
  const byteLength = Buffer.byteLength(payload, 'utf8')
  const lengthField = String(byteLength).padStart(6, '0')
  const header = `${STARTER}${svcCode}${lengthField}${HEADER_TRAILER}`
  return Buffer.concat([Buffer.from(header, 'utf8'), Buffer.from(payload, 'utf8')])
}

export interface DecodedPacket {
  svc: string
  payload: string
  fields: string[]
}

/**
 * 버퍼에서 완전한 패킷들을 잘라냅니다.
 * 불완전한 꼬리는 rest로 돌려줍니다.
 */
export function decodePackets(buffer: Buffer): { packets: DecodedPacket[]; rest: Buffer } {
  const packets: DecodedPacket[] = []
  let offset = 0

  while (offset + HEADER_LENGTH <= buffer.length) {
    if (buffer[offset] !== 0x1b || buffer[offset + 1] !== 0x09) {
      // 동기화 상실 — 다음 starter를 찾습니다.
      const next = buffer.indexOf(0x1b, offset + 1)
      if (next < 0) return { packets, rest: Buffer.alloc(0) }
      offset = next
      continue
    }

    const header = buffer.subarray(offset, offset + HEADER_LENGTH).toString('utf8')
    const svc = header.slice(2, 6)
    const length = Number(header.slice(6, 12))
    if (!Number.isFinite(length) || length < 0) {
      offset += 1
      continue
    }

    const total = HEADER_LENGTH + length
    if (offset + total > buffer.length) break

    const payload = buffer.subarray(offset + HEADER_LENGTH, offset + total).toString('utf8')
    // payload는 보통 \f 로 시작하므로 split 후 앞의 빈 칸을 버립니다.
    const fields = payload.split(SEPARATOR)
    if (fields[0] === '') fields.shift()

    packets.push({ svc, payload, fields })
    offset += total
  }

  return { packets, rest: buffer.subarray(offset) }
}

export function connectPayload(authTicket?: string): string {
  // 익명: \f\f\f16\f / 인증: \f{AuthTicket}\f\f16\f
  if (authTicket) return `${SEPARATOR}${authTicket}${SEPARATOR}${SEPARATOR}16${SEPARATOR}`
  return `${SEPARATOR}${SEPARATOR}${SEPARATOR}16${SEPARATOR}`
}

export function enterPayload(chatNo: string): string {
  return `${SEPARATOR}${chatNo}${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}`
}

export function pingPayload(): string {
  return SEPARATOR
}
