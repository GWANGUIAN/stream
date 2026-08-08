import type { Metadata, Viewport } from 'next'
import { Black_Han_Sans, JetBrains_Mono, Noto_Sans_KR } from 'next/font/google'
import type { ReactNode } from 'react'
import '../globals.css'

const display = Black_Han_Sans({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display-face',
  display: 'swap',
})

const body = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-body-face',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono-face',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '랜덤 문장 만들기 · 오버레이',
  description: 'OBS 브라우저 소스용 투명 배경 오버레이',
  applicationName: '랜덤 문장 만들기',
}

export const viewport: Viewport = {
  themeColor: '#c8f542',
}

export default function OverlayLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      data-theme="dark"
      className={`overlay-transparent ${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
