export type BrandPlatform = 'chzzk' | 'soop'

export const brandTokens = {
  chzzk: {
    primary: '#00FFA3',
    onPrimary: '#0B0B0B',
    label: '치지직',
  },
  soop: {
    primary: '#0182FF',
    onPrimary: '#FFFFFF',
    label: 'SOOP',
  },
} as const satisfies Record<BrandPlatform, { primary: string; onPrimary: string; label: string }>

export function platformLabel(platform: BrandPlatform): string {
  return brandTokens[platform].label
}
