import { describe, expect, it } from 'vitest'
import { decodePackets, encodePacket, HEADER_LENGTH, SEPARATOR, STARTER, SVC } from './packet'

describe('SOOP packet encode/decode', () => {
  it('헤더는 14바이트이고 길이는 UTF-8 바이트 기준이다', () => {
    // 한글 "안녕" = 6바이트
    const payload = `${SEPARATOR}안녕${SEPARATOR}`
    const packet = encodePacket(SVC.CHAT, payload)
    const header = packet.subarray(0, HEADER_LENGTH).toString('utf8')

    expect(header.startsWith(STARTER)).toBe(true)
    expect(header.slice(2, 6)).toBe('0005')
    expect(header.slice(6, 12)).toBe(String(Buffer.byteLength(payload, 'utf8')).padStart(6, '0'))
    expect(header.slice(12, 14)).toBe('00')
    expect(packet.length).toBe(HEADER_LENGTH + Buffer.byteLength(payload, 'utf8'))
  })

  it('문자 길이로 계산하면 한글 패킷이 깨진다 (회귀 방지)', () => {
    const payload = `${SEPARATOR}안녕${SEPARATOR}`
    // 잘못된 방식: payload.length (문자 수 = 4) vs byteLength = 8
    expect(payload.length).not.toBe(Buffer.byteLength(payload, 'utf8'))
  })

  it('완전한 패킷을 디코드하고 필드를 \\f 로 나눈다', () => {
    const payload = `${SEPARATOR}hello${SEPARATOR}uid${SEPARATOR}`
    const encoded = encodePacket(SVC.CHAT, payload)
    const { packets, rest } = decodePackets(encoded)
    expect(rest.length).toBe(0)
    expect(packets).toHaveLength(1)
    expect(packets[0]?.svc).toBe('0005')
    expect(packets[0]?.fields[0]).toBe('hello')
    expect(packets[0]?.fields[1]).toBe('uid')
  })

  it('불완전한 패킷은 rest로 남긴다', () => {
    const payload = `${SEPARATOR}x${SEPARATOR}`
    const encoded = encodePacket(SVC.PING, payload)
    const partial = encoded.subarray(0, HEADER_LENGTH + 1)
    const { packets, rest } = decodePackets(partial)
    expect(packets).toHaveLength(0)
    expect(rest.length).toBe(partial.length)
  })

  it('이어 붙인 청크에서도 패킷을 복원한다', () => {
    const a = encodePacket(SVC.CONNECT, `${SEPARATOR}${SEPARATOR}${SEPARATOR}16${SEPARATOR}`)
    const b = encodePacket(
      SVC.ENTER,
      `${SEPARATOR}12345${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}${SEPARATOR}`,
    )
    const combined = Buffer.concat([a, b])
    const mid = Math.floor(combined.length / 2)

    const first = decodePackets(combined.subarray(0, mid))
    const second = decodePackets(Buffer.concat([first.rest, combined.subarray(mid)]))
    expect(first.packets.length + second.packets.length).toBe(2)
    expect(second.rest.length).toBe(0)
  })
})
