import type { Metadata, Viewport } from 'next'
import { Gowun_Dodum, JetBrains_Mono, Jua } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const display = Jua({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display-face',
  display: 'swap',
})

const body = Gowun_Dodum({
  subsets: ['latin'],
  weight: '400',
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
  title: '채팅 연동 테스트',
  description: 'SOOP · 치지직 채팅 프록시 연동 검증용 내부 도구',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0a0f18',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
