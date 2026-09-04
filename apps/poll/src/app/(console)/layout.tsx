import { AdSenseScript, AdSlot } from '@stream/ui'
import type { Metadata, Viewport } from 'next'
import { Gowun_Dodum, JetBrains_Mono, Jua } from 'next/font/google'
import type { ReactNode } from 'react'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import '../globals.css'

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
  title: '채팅 투표',
  description: 'SOOP · 치지직 채팅으로 진행하는 방송용 실시간 투표',
  applicationName: '채팅 투표',
  other: {
    'google-adsense-account': 'ca-pub-2941605563798614',
    'naver-site-verification': 'c49084db4ba89efa1b92be0ea31a2878d5be0eff',
  },
}

export const viewport: Viewport = {
  themeColor: '#ff5d73',
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
