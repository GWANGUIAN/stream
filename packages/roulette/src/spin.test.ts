import { describe, expect, it } from 'vitest'
import { buildSegments, pickWeightedIndex, targetRotation } from './spin'
import type { RouletteItem } from './types'

function item(overrides: Partial<RouletteItem>): RouletteItem {
  return {
    id: overrides.id ?? 'i',
    label: overrides.label ?? 'label',
    count: overrides.count ?? 1,
    source: 'manual',
    contributors: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('buildSegments', () => {
  it('proportional 모드는 개수에 비례한 칸을 만듭니다', () => {
    const items = [item({ id: 'a', count: 1 }), item({ id: 'b', count: 3 })]
    const segments = buildSegments(items, 'proportional')
    expect(segments).toHaveLength(2)
    expect(segments[0]?.endAngle).toBeCloseTo(90, 5)
    expect(segments[1]?.endAngle).toBeCloseTo(360, 5)
  })

  it('even 모드는 아이템 수만큼 균등 분할합니다', () => {
    const items = [item({ id: 'a', count: 1 }), item({ id: 'b', count: 99 })]
    const segments = buildSegments(items, 'even')
    expect(segments[0]?.endAngle).toBeCloseTo(180, 5)
    expect(segments[1]?.endAngle).toBeCloseTo(360, 5)
  })

  it('빈 목록이면 빈 배열을 반환합니다', () => {
    expect(buildSegments([], 'proportional')).toEqual([])
  })

  it('인접한 칸끼리 색이 겹치지 않습니다', () => {
    const items = Array.from({ length: 6 }, (_, i) => item({ id: `i${i}` }))
    const segments = buildSegments(items, 'even')
    const colors = segments.map((s) => s.color)
    for (let i = 1; i < colors.length; i += 1) {
      expect(colors[i]).not.toBe(colors[i - 1])
    }
  })
})

describe('pickWeightedIndex', () => {
  it('가중치가 큰 쪽이 더 잘 뽑힙니다(고정 random)', () => {
    expect(pickWeightedIndex([1, 99], () => 0.99)).toBe(1)
    expect(pickWeightedIndex([99, 1], () => 0.01)).toBe(0)
  })

  it('가중치 합이 0이면 0번 인덱스를 반환합니다', () => {
    expect(pickWeightedIndex([0, 0], () => 0.5)).toBe(0)
  })
})

describe('targetRotation', () => {
  it('회전 후 승자 칸이 포인터(0도) 위에 오도록 계산합니다', () => {
    const items = [
      item({ id: 'a', count: 1 }),
      item({ id: 'b', count: 1 }),
      item({ id: 'c', count: 1 }),
    ]
    const segments = buildSegments(items, 'even')

    for (const winner of items) {
      const rotation = targetRotation(segments, winner.id, {
        random: () => 0.5,
        currentRotation: 0,
      })
      const segment = segments.find((s) => s.itemId === winner.id)
      if (!segment) throw new Error('segment not found')

      // (임의 지점 + rotation) mod 360 이 0deg(포인터) 근방이어야 합니다.
      const pointInSegment = segment.startAngle + 0.5 * (segment.endAngle - segment.startAngle)
      const landed = (((pointInSegment + rotation) % 360) + 360) % 360
      expect(landed).toBeLessThan(1e-6 + 0.001)
      expect(rotation).toBeGreaterThan(0)
    }
  })

  it('매 스핀마다 이전 회전각보다 항상 앞으로 더 돕니다', () => {
    const items = [item({ id: 'a', count: 1 }), item({ id: 'b', count: 1 })]
    const segments = buildSegments(items, 'even')

    const first = targetRotation(segments, 'a', { random: () => 0.5, currentRotation: 0 })
    const second = targetRotation(segments, 'b', { random: () => 0.5, currentRotation: first })
    expect(second).toBeGreaterThan(first)
  })

  it('존재하지 않는 승자 id면 에러를 던집니다', () => {
    const segments = buildSegments([item({ id: 'a' })], 'even')
    expect(() => targetRotation(segments, 'missing')).toThrow()
  })
})
