import { AdSenseScript, AdSlot } from '@stream/ui'
import type { Metadata, Viewport } from 'next'
import { Black_Han_Sans, JetBrains_Mono, Noto_Sans_KR } from 'next/font/google'
import type { ReactNode } from 'react'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
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
  title: '랜덤 문장 만들기',
  description: '채팅으로 누가·어디서·어떻게·무엇을·왜를 모아 랜덤 문장을 만드는 방송용 툴',
  applicationName: '랜덤 문장 만들기',
  other: {
    'google-adsense-account': 'ca-pub-2941605563798614',
  },
}

export const viewport: Viewport = {
  themeColor: '#c8f542',
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AdSenseScript />
      </head>
      <body>
        {children}
        <AdSlot className="mx-auto my-4 max-w-3xl" />
      </body>
    </html>
  )
}
