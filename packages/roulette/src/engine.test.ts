import type { ChatDonationEvent, ChatUser } from '@stream/chat'
import { createEventBus } from '@stream/events'
import { describe, expect, it } from 'vitest'
import { RouletteEngine } from './engine'

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

function donation(overrides: Partial<ChatDonationEvent> = {}): ChatDonationEvent {
  return {
    type: 'donation',
    platform: 'chzzk',
    user: user(),
    amount: 100,
    currency: 'cheese',
    text: '치킨',
    at: Date.now(),
    ...overrides,
  }
}

describe('RouletteEngine — 도네 등록', () => {
  it('접수가 열려 있을 때 배수만큼 아이템을 등록합니다', () => {
    const engine = new RouletteEngine({ rule: { unitAmount: 10, mode: 'multiple' } })
    engine.openRegistration()
    engine.registerDonation(donation({ amount: 100, text: '치킨' }))

    const snapshot = engine.getSnapshot()
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0]).toMatchObject({ label: '치킨', count: 10 })
    expect(snapshot.log.at(-1)?.kind).toBe('registered')
  })

  it('접수가 닫혀 있으면 등록되지 않고 거절 로그가 남습니다', () => {
    const engine = new RouletteEngine()
    engine.registerDonation(donation())
    const snapshot = engine.getSnapshot()
    expect(snapshot.items).toHaveLength(0)
    expect(snapshot.log.at(-1)?.kind).toBe('rejected')
  })

  it('같은 라벨의 도네는 하나의 아이템으로 병합됩니다(normalize)', () => {
    const engine = new RouletteEngine({ rule: { unitAmount: 10 } })
    engine.openRegistration()
    engine.registerDonation(donation({ amount: 10, text: '치킨' }))
    engine.registerDonation(donation({ amount: 10, text: ' 치킨 ' }))

    const snapshot = engine.getSnapshot()
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0]?.count).toBe(2)
    expect(snapshot.items[0]?.contributors).toContain('홍길동')
  })

  it('타이머가 지나면 자동으로 접수가 마감됩니다', () => {
    let now = 1000
    const engine = new RouletteEngine({ now: () => now })
    engine.openRegistration(5000)
    expect(engine.isRegistrationOpen()).toBe(true)

    now += 6000
    expect(engine.isRegistrationOpen()).toBe(false)
    engine.registerDonation(donation({ amount: 10 }))
    expect(engine.getSnapshot().items).toHaveLength(0)
  })

  it('EventBus에 붙으면 donation 이벤트를 자동으로 처리합니다', () => {
    const engine = new RouletteEngine({ rule: { unitAmount: 10 } })
    engine.openRegistration()
    const bus = createEventBus()
    engine.attachEventBus(bus)

    bus.emit(donation({ amount: 20, text: '피자' }))

    const snapshot = engine.getSnapshot()
    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.items[0]).toMatchObject({ label: '피자', count: 2 })
  })
})

describe('RouletteEngine — 수동 편집', () => {
  it('아이템 추가/이름변경/개수변경/삭제가 동작합니다', () => {
    const engine = new RouletteEngine()
    const item = engine.addItem('커피', 3)
    expect(engine.getSnapshot().items).toHaveLength(1)

    engine.renameItem(item.id, '아메리카노')
    expect(engine.getSnapshot().items[0]?.label).toBe('아메리카노')

    engine.setItemCount(item.id, 10)
    expect(engine.getSnapshot().items[0]?.count).toBe(10)

    engine.removeItem(item.id)
    expect(engine.getSnapshot().items).toHaveLength(0)
  })

  it('여러 줄 텍스트를 일괄 등록할 수 있습니다(x개수 지정 포함)', () => {
    const engine = new RouletteEngine()
    const count = engine.addItemsFromText('치킨 x3\n피자\n\n떡볶이 x2')
    expect(count).toBe(3)
    const items = engine.getSnapshot().items
    expect(items.find((i) => i.label === '치킨')?.count).toBe(3)
    expect(items.find((i) => i.label === '피자')?.count).toBe(1)
    expect(items.find((i) => i.label === '떡볶이')?.count).toBe(2)
  })

  it('undo는 마지막 수동 추가/삭제/도네 등록을 취소합니다', () => {
    const engine = new RouletteEngine({ rule: { unitAmount: 10 } })
    expect(engine.canUndo()).toBe(false)

    engine.addItem('커피', 2)
    expect(engine.canUndo()).toBe(true)
    engine.undo()
    expect(engine.getSnapshot().items).toHaveLength(0)

    engine.addItem('커피', 2)
    engine.removeItem(engine.getSnapshot().items[0]!.id)
    engine.undo()
    expect(engine.getSnapshot().items).toHaveLength(1)
    expect(engine.getSnapshot().items[0]?.label).toBe('커피')

    engine.openRegistration()
    engine.registerDonation(donation({ amount: 10, text: '커피' }))
    expect(engine.getSnapshot().items[0]?.count).toBe(3)
    engine.undo()
    expect(engine.getSnapshot().items[0]?.count).toBe(2)
  })

  it('resetAll은 아이템/접수/결과를 초기화합니다', () => {
    const engine = new RouletteEngine()
    engine.addItem('A')
    engine.openRegistration()
    engine.resetAll()
    const snapshot = engine.getSnapshot()
    expect(snapshot.items).toHaveLength(0)
    expect(snapshot.timer.isOpen).toBe(false)
  })
})

describe('RouletteEngine — 스핀', () => {
  it('스핀 결과에 따라 keep/decrement/remove 처리를 다르게 합니다', () => {
    const keepEngine = new RouletteEngine({ winnerAction: 'keep' })
    keepEngine.addItem('A', 1)
    keepEngine.spin(() => 0.1)
    expect(keepEngine.getSnapshot().items[0]?.count).toBe(1)

    const decEngine = new RouletteEngine({ winnerAction: 'decrement' })
    decEngine.addItem('A', 2)
    decEngine.spin(() => 0.1)
    expect(decEngine.getSnapshot().items[0]?.count).toBe(1)

    const removeEngine = new RouletteEngine({ winnerAction: 'remove' })
    removeEngine.addItem('A', 1)
    removeEngine.spin(() => 0.1)
    expect(removeEngine.getSnapshot().items).toHaveLength(0)
  })

  it('아이템이 없으면 스핀 결과가 없습니다', () => {
    const engine = new RouletteEngine()
    expect(engine.spin()).toBeUndefined()
  })

  it('onChange는 즉시 현재 스냅샷을 전달하고 이후 변경을 알립니다', () => {
    const engine = new RouletteEngine({ title: '제목' })
    const seen: string[] = []
    const unsubscribe = engine.onChange((snapshot) => seen.push(snapshot.title))
    engine.setTitle('바뀐 제목')
    unsubscribe()
    engine.setTitle('구독 끊긴 뒤 제목')

    expect(seen).toEqual(['제목', '바뀐 제목'])
  })
})
