import { colorForIndex } from './palette'
import type { RouletteItem, WeightMode } from './types'

/** 원판 위 한 칸. 각도는 12시 방향(포인터)을 0°로 두고 시계 방향으로 누적됩니다. */
export interface Segment {
  itemId: string
  label: string
  color: string
  weight: number
  startAngle: number
  endAngle: number
}

/**
 * 아이템 목록으로 원판 칸을 만듭니다.
 * `proportional`은 개수에 비례한 칸 크기, `even`은 아이템 수만큼 균등 분할합니다.
 */
export function buildSegments(items: RouletteItem[], weightMode: WeightMode): Segment[] {
  if (items.length === 0) return []

  const weights = items.map((item) => (weightMode === 'even' ? 1 : Math.max(1, item.count)))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  let cursor = 0
  return items.map((item, index) => {
    const weight = weights[index] ?? 1
    const sweep = total > 0 ? (weight / total) * 360 : 360 / items.length
    const startAngle = cursor
    const endAngle = cursor + sweep
    cursor = endAngle
    return {
      itemId: item.id,
      label: item.label,
      color: item.color ?? colorForIndex(index),
      weight,
      startAngle,
      endAngle,
    }
  })
}

/** 가중치 목록에서 랜덤 인덱스를 뽑습니다(가중치 클수록 잘 뽑힘). */
export function pickWeightedIndex(weights: number[], random: () => number = Math.random): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0 || weights.length === 0) return 0

  let cursor = random() * total
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index] ?? 0
    if (cursor <= 0) return index
  }
  return weights.length - 1
}

export interface TargetRotationOptions {
  random?: () => number
  /** 애니메이션 시작점(이전 회전 각도). 매 스핀 앞으로만 돌게 만듭니다. */
  currentRotation?: number
  /** 최소 회전 바퀴 수(연출용). */
  turns?: number
}

/**
 * 승자가 이미 정해진 상태에서, 그 칸이 포인터(12시, 0°) 위에 정확히 멈추도록
 * 최종 회전 각도(도, 항상 currentRotation보다 큼)를 계산합니다.
 */
export function targetRotation(
  segments: Segment[],
  winnerId: string,
  options: TargetRotationOptions = {},
): number {
  const segment = segments.find((s) => s.itemId === winnerId)
  if (!segment) {
    throw new Error(`알 수 없는 승자 id: ${winnerId}`)
  }

  const random = options.random ?? Math.random
  const turns = options.turns ?? 6
  const currentRotation = options.currentRotation ?? 0

  const span = segment.endAngle - segment.startAngle
  const margin = Math.min(4, span / 4)
  const low = segment.startAngle + margin
  const high = segment.endAngle - margin
  const pointInSegment =
    high > low ? low + random() * (high - low) : (segment.startAngle + segment.endAngle) / 2

  // (pointInSegment + rotation) mod 360 === 0 이 되도록 rotation의 mod 360 성분을 구합니다.
  const targetMod = (((360 - pointInSegment) % 360) + 360) % 360
  const currentMod = ((currentRotation % 360) + 360) % 360
  let delta = targetMod - currentMod
  if (delta <= 0) delta += 360

  return currentRotation + turns * 360 + delta
}
