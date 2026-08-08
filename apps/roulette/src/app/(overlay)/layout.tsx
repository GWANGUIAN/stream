import type { Metadata } from 'next'
import { Black_Han_Sans, JetBrains_Mono, Noto_Sans_KR } from 'next/font/google'
import type { ReactNode } from 'react'
import { withBasePath } from '@/lib/base-path'
import '../globals.css'

const display = Black_Han_Sans({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
})

const body = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-body',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '도네이션 랜덤 룰렛 · 오버레이',
  description: 'OBS 브라우저 소스용 투명 배경 오버레이',
  applicationName: '도네이션 랜덤 룰렛',
  manifest: withBasePath('/manifest.json'),
  themeColor: '#ffb443',
  icons: {
    icon: [
      { url: withBasePath('/favicon.ico') },
      { url: withBasePath('/favicon-16x16.png'), sizes: '16x16', type: 'image/png' },
      { url: withBasePath('/favicon-32x32.png'), sizes: '32x32', type: 'image/png' },
      { url: withBasePath('/favicon-96x96.png'), sizes: '96x96', type: 'image/png' },
      { url: withBasePath('/android-icon-192x192.png'), sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: withBasePath('/apple-icon.png') },
      { url: withBasePath('/apple-icon-180x180.png'), sizes: '180x180', type: 'image/png' },
    ],
  },
}

/**
 * OBS 브라우저 소스는 실제 body 배경이 투명해야만 알파 채널로 합성됩니다.
 * 조작 페이지와 배경(dark 그라디언트)이 다르므로, Next.js의 "다중 루트 레이아웃"
 * 패턴으로 이 라우트 그룹만 별도의 html/body를 씁니다.
 */
export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className={`overlay-transparent ${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
