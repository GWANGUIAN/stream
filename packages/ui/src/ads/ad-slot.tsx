'use client'

import { useEffect } from 'react'
import { cn } from '../lib/utils'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

/**
 * 구글 애드센스 게시자 ID(`ca-pub-...`). 애드센스 가입 후 발급받은 값을
 * `NEXT_PUBLIC_ADSENSE_CLIENT_ID`로 주입하세요. 비어 있으면 광고 스크립트/슬롯이
 * 전혀 렌더링되지 않습니다(심사 전 기본 상태).
 */
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? ''
/** 애드센스 대시보드에서 만든 광고 단위 ID. `NEXT_PUBLIC_ADSENSE_SLOT`으로 주입합니다. */
const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? ''

const SCRIPT_ID = 'adsbygoogle-loader'

/** 앱 루트 레이아웃에 한 번만 렌더링하는 애드센스 사이트 연결 스크립트. */
export function AdSenseScript() {
  useEffect(() => {
    if (!ADSENSE_CLIENT_ID) return
    if (document.getElementById(SCRIPT_ID)) return
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)
  }, [])

  return null
}

export interface AdSlotProps {
  className?: string
}

/** 광고 영역. 환경변수가 비어 있으면 아무것도 렌더링하지 않습니다. */
export function AdSlot({ className }: AdSlotProps) {
  const enabled = Boolean(ADSENSE_CLIENT_ID && ADSENSE_SLOT)

  useEffect(() => {
    if (!enabled) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      // 스크립트가 아직 로드되지 않았어도 큐에는 항상 쌓입니다.
    }
  }, [])

  if (!enabled) return null

  return (
    <ins
      className={cn('adsbygoogle', className)}
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={ADSENSE_SLOT}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}
