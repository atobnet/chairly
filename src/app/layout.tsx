export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Chairly | フリーランス美容師 × レンタルサロン マッチング',
  description: '美容師・サロン・消費者をつなぐ、次世代の美容プラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen" style={{ background: '#0F172A' }}>
        <Nav />
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  )
}
