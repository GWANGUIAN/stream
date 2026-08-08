import type { ReactNode } from 'react'

/**
 * OBS Browser Source용 투명 배경 호스트.
 * 씬 전체를 덮는 edge-to-edge 평면으로 씁니다.
 */
export function OverlayRoot({
  theme,
  children,
  className,
}: {
  theme?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={['stream-overlay-root', className].filter(Boolean).join(' ')}
      data-theme={theme || 'default'}
    >
      {children}
    </div>
  )
}
