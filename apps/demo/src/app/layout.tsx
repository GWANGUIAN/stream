import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'stream demo',
  description: 'SOOP · 치지직 OAuth 로그인 / 채널 조회 / 채팅 데모',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body>
        <div className="app-shell">
          <header className="topnav">
            <a className="brand" href="/">
              stream<span>.</span>demo
            </a>
            <nav className="nav-links">
              <a href="/">홈</a>
              <a href="/dashboard">내 계정</a>
              <a href="/channel">채널</a>
              <a href="/chat">채팅</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
