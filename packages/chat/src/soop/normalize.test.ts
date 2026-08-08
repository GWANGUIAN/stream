import { describe, expect, it } from 'vitest'
import { normalizeSoopPacket } from './normalize'
import { SVC, type DecodedPacket } from './packet'

function packet(svc: string, fields: string[]): DecodedPacket {
  return { svc, payload: fields.join('\f'), fields }
}

describe('normalizeSoopPacket', () => {
  it('실방송 CHAT 필드에서 text/userId/nickname을 파싱한다', () => {
    const events = normalizeSoopPacket(
      packet(SVC.CHAT, [
        '페인터 여기서 잘하면 인정해줄게',
        'fladl222',
        '0',
        '0',
        '3',
        'blomma',
        '82464|33587200',
        '-1',
        '047143',
        '45A48D',
      ]),
    )
    expect(events).toHaveLength(1)
    const event = events[0]
    expect(event?.type).toBe('message')
    if (event?.type !== 'message') return
    expect(event.text).toBe('페인터 여기서 잘하면 인정해줄게')
    expect(event.user.id).toBe('fladl222')
    expect(event.user.nickname).toBe('blomma')
  })

  it('TEXT_DONATION은 to/from/nick/amount 순서이다', () => {
    const events = normalizeSoopPacket(
      packet(SVC.TEXT_DONATION, ['phonics1', 'donor01', '후원자닉', '100', '0']),
    )
    expect(events[0]).toMatchObject({
      type: 'donation',
      amount: 100,
      currency: 'balloon',
      user: { id: 'donor01', nickname: '후원자닉' },
    })
  })

  it('VIDEO_DONATION은 선행 빈 필드를 건너뛴다', () => {
    const events = normalizeSoopPacket(
      packet(SVC.VIDEO_DONATION, ['', '243000', 'donor02', '영상닉', '50', '0']),
    )
    expect(events[0]).toMatchObject({
      type: 'donation',
      amount: 50,
      user: { id: 'donor02', nickname: '영상닉' },
    })
  })

  it('AD_BALLOON은 뒤쪽 amount 인덱스를 사용한다', () => {
    const events = normalizeSoopPacket(
      packet(SVC.AD_BALLOON, [
        '',
        'phonics1',
        'donor03',
        '애드닉',
        'x',
        'x',
        'x',
        'x',
        'x',
        '30',
        '0',
      ]),
    )
    expect(events[0]).toMatchObject({
      type: 'donation',
      amount: 30,
      user: { id: 'donor03', nickname: '애드닉' },
    })
  })

  it('SUBSCRIBE는 nickname과 months를 파싱한다', () => {
    const events = normalizeSoopPacket(
      packet(SVC.SUBSCRIBE, ['phonics1', 'sub01', '구독닉', '3', '', '', '', '1']),
    )
    expect(events[0]).toMatchObject({
      type: 'subscription',
      months: 3,
      user: { id: 'sub01', nickname: '구독닉' },
    })
  })

  it('NOTIFICATION은 본문 텍스트를 고른다', () => {
    const events = normalizeSoopPacket(
      packet(SVC.NOTIFICATION, [
        '9940',
        '1',
        '1',
        '- 다운로드링크\nhttps://example.com\r\n',
        '',
      ]),
    )
    expect(events[0]).toMatchObject({
      type: 'system',
      text: '- 다운로드링크\nhttps://example.com\r\n',
    })
  })
})
