/**
 * 황금각(약 137.5°) 기반 색상 생성.
 * 인접 인덱스끼리 색이 겹치지 않아 칸이 몇 개든 구분하기 쉽습니다.
 */
const GOLDEN_ANGLE = 137.50776405003785

export interface PaletteOptions {
  saturation?: number
  lightness?: number
  hueOffset?: number
}

export function colorForIndex(index: number, options: PaletteOptions = {}): string {
  const saturation = options.saturation ?? 72
  const lightness = options.lightness ?? 56
  const hueOffset = options.hueOffset ?? 18
  const hue = (index * GOLDEN_ANGLE + hueOffset) % 360
  return `hsl(${hue.toFixed(1)} ${saturation}% ${lightness}%)`
}

export function buildPalette(count: number, options: PaletteOptions = {}): string[] {
  return Array.from({ length: count }, (_, index) => colorForIndex(index, options))
}
