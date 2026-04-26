export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Chairly | あなただけの美容師と、空間を。',
  description: 'フリーランス美容師・レンタルサロン・消費者をつなぐ、新しい美容体験。東京エリア。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ background: '#ffffff', color: '#111111' }}>
        <Nav />
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}
