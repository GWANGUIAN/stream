import type { Metadata } from 'next'
import { Black_Han_Sans, JetBrains_Mono, Noto_Sans_KR } from 'next/font/google'
import type { ReactNode } from 'react'
import { withBasePath } from '@/lib/base-path'
import { themeInitScript } from '@/lib/theme'
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
  title: '도네이션 랜덤 룰렛',
  description: 'SOOP · 치지직 도네이션으로 아이템이 등록되는 방송용 랜덤 룰렛',
  applicationName: '도네이션 랜덤 룰렛',
  manifest: withBasePath('/manifest.json'),
  themeColor: '#ffb443',
  icons: {
    icon: [{ url: withBasePath('/favicon.ico') }],
  },
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className={`dark ${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
