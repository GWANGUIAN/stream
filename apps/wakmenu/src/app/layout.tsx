import './globals.css'
import './refinements.css'
import './interactions.css'
import type { Metadata } from 'next'
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '/wakmenu'
const ogImage = `${BASE}/og-image.webp`
export const metadata: Metadata = {
  title: '우왁굳의 밥을 맞춰라',
  description: '우왁굳 오늘의 밥 맞추기',
  openGraph: { title: '우왁굳의 밥을 맞춰라', description: '우왁굳 오늘의 밥 맞추기', images: [ogImage] },
  twitter: { card: 'summary_large_image', title: '우왁굳의 밥을 맞춰라', description: '우왁굳 오늘의 밥 맞추기', images: [ogImage] },
  icons: {
    icon: [
      { url: `${BASE}/favicon.ico`, sizes: 'any' },
      { url: `${BASE}/favicon-16x16.png`, sizes: '16x16', type: 'image/png' },
      { url: `${BASE}/favicon-32x32.png`, sizes: '32x32', type: 'image/png' },
    ],
    apple: `${BASE}/apple-icon.png`,
  },
}
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body>{children}</body></html> }
