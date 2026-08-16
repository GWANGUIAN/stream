import './globals.css'
import './refinements.css'
import './interactions.css'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: '우왁굳의 밥을 맞춰라', description: '우왁굳 오늘의 밥 맞추기' }
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html> }
