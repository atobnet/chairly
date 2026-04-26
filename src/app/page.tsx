import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div style={{ background: '#f7f4ef', color: '#1a1410' }}>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Decorative lines */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/3 w-px h-full" style={{ background: 'linear-gradient(to bottom, transparent, #e2dcd4 30%, #e2dcd4 70%, transparent)' }} />
          <div className="absolute top-0 right-1/3 w-px h-full" style={{ background: 'linear-gradient(to bottom, transparent, #e2dcd4 30%, #e2dcd4 70%, transparent)' }} />
        </div>

        <div className="relative text-center max-w-3xl mx-auto">
          <p className="text-xs tracking-[0.3em] mb-10" style={{ color: '#a09890' }}>
            TOKYO — EST. 2025
          </p>

          <h1
            className="font-serif leading-tight mb-8"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 300, letterSpacing: '0.05em', color: '#1a1410' }}
          >
            あなただけの<br />
            <em style={{ fontStyle: 'italic', color: '#6b7c5c' }}>美容師</em>と、<br />
            空間を。
          </h1>

          <div className="divider mb-8" />

          <p
            className="text-sm leading-loose max-w-md mx-auto mb-12"
            style={{ color: '#6b6459', letterSpacing: '0.08em', fontWeight: 300 }}
          >
            フリーランス美容師・レンタルサロン・消費者。<br />
            三者が出会う、新しい美容の場所。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-8 py-3 text-xs tracking-[0.2em] border transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef]"
              style={{ borderColor: '#1a1410', color: '#1a1410' }}
            >
              美容師を探す
              <ChevronRight size={12} />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3 text-xs tracking-[0.2em] transition-all hover:opacity-70"
              style={{ color: '#6b6459' }}
            >
              無料で始める →
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs tracking-[0.3em]" style={{ color: '#a09890' }}>SCROLL</span>
          <div className="w-px h-10 animate-pulse" style={{ background: 'linear-gradient(to bottom, #a09890, transparent)' }} />
        </div>
      </section>

      {/* Concept */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div>
            <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>CONCEPT</p>
            <h2 className="font-serif text-4xl leading-relaxed mb-8" style={{ fontWeight: 300 }}>
              才能を、<br />
              <em style={{ fontStyle: 'italic', color: '#6b7c5c' }}>自由な場所</em>で。
            </h2>
            <div className="w-10 h-px mb-8" style={{ background: '#e2dcd4' }} />
            <p className="text-sm leading-loose" style={{ color: '#6b6459', fontWeight: 300 }}>
              サロン契約に縛られず、自分のペースで働きたい美容師。
              遊休チェアを活かしたいサロンオーナー。
              お気に入りの美容師に施術してもらいたい消費者。
              Chairly は、その三者をつなぐ場所です。
            </p>
          </div>
          <div
            className="aspect-square rounded-none flex items-center justify-center"
            style={{ background: '#f0ece4', border: '1px solid #e2dcd4' }}
          >
            <div className="text-center p-12">
              <div className="font-serif text-8xl mb-4" style={{ color: '#e2dcd4', fontWeight: 300 }}>✂</div>
              <p className="text-xs tracking-[0.3em]" style={{ color: '#c9b99a' }}>HAIRDRESSER × SALON × YOU</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Roles */}
      <section className="py-24 px-6" style={{ background: '#faf9f7', borderTop: '1px solid #e2dcd4', borderBottom: '1px solid #e2dcd4' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-xs tracking-[0.3em] mb-4" style={{ color: '#a09890' }}>FOR EVERYONE</p>
            <h2 className="font-serif text-3xl" style={{ fontWeight: 300 }}>三者をつなぐプラットフォーム</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-0 border" style={{ borderColor: '#e2dcd4' }}>
            {/* Consumer */}
            <RoleCard
              number="01"
              title="消費者"
              subtitle="Consumer"
              description="お気に入りの美容師を見つけて、好きな場所・時間で施術を予約。"
              features={['エリア・メニューで検索', 'リアルタイム空き枠確認', '簡単予約リクエスト']}
              href="/signup?role=consumer"
              bordered
            />
            {/* Hairdresser */}
            <RoleCard
              number="02"
              title="美容師"
              subtitle="Hairdresser"
              description="サロン契約不要。好きな場所で、自分のペースで働こう。"
              features={['プロフィール・料金を自由設定', 'スケジュール管理', '予約リクエスト管理']}
              href="/signup?role=hairdresser"
              highlighted
              bordered
            />
            {/* Salon */}
            <RoleCard
              number="03"
              title="サロン"
              subtitle="Salon"
              description="遊休チェアを収益化。美容師に空き枠を提供して稼働率アップ。"
              features={['スペース情報を掲載', '空き枠を一括管理', '稼働率サマリー確認']}
              href="/signup?role=salon"
            />
          </div>
        </div>
      </section>

      {/* Featured hairdressers */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-16">
            <div>
              <p className="text-xs tracking-[0.3em] mb-4" style={{ color: '#a09890' }}>FEATURED</p>
              <h2 className="font-serif text-3xl" style={{ fontWeight: 300 }}>注目の美容師</h2>
            </div>
            <Link href="/search" className="text-xs tracking-widest transition-opacity hover:opacity-50" style={{ color: '#6b6459' }}>
              ALL ARTISTS →
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {SAMPLE_HAIRDRESSERS.map((h) => (
              <Link key={h.id} href="/search" className="group block">
                <div
                  className="aspect-[3/4] mb-4 overflow-hidden flex items-center justify-center"
                  style={{ background: h.bg }}
                >
                  <span className="text-6xl opacity-30 group-hover:scale-110 transition-transform duration-500">{h.emoji}</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium mb-0.5" style={{ color: '#1a1410' }}>{h.name}</p>
                    <p className="text-xs" style={{ color: '#a09890' }}>{h.area} — {h.specialty}</p>
                  </div>
                  <p className="text-xs" style={{ color: '#6b7c5c' }}>¥{h.price.toLocaleString()}〜</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6" style={{ background: '#1a1410' }}>
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs tracking-[0.3em] mb-8" style={{ color: '#6b7c5c' }}>JOIN CHAIRLY</p>
          <h2
            className="font-serif mb-8 leading-relaxed"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 300, color: '#f7f4ef' }}
          >
            今すぐ始めよう
          </h2>
          <p className="text-xs leading-loose mb-12" style={{ color: '#6b6459', letterSpacing: '0.08em' }}>
            登録は無料。東京エリア先行公開中。
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-10 py-3.5 text-xs tracking-[0.2em] border transition-all hover:bg-[#f7f4ef] hover:text-[#1a1410]"
            style={{ borderColor: '#f7f4ef', color: '#f7f4ef' }}
          >
            無料登録
            <ChevronRight size={12} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t" style={{ borderColor: '#e2dcd4' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif text-lg tracking-[0.2em]" style={{ color: '#1a1410' }}>CHAIRLY</span>
          <p className="text-xs tracking-widest" style={{ color: '#a09890' }}>© 2025 CHAIRLY. TOKYO.</p>
        </div>
      </footer>
    </div>
  )
}

function RoleCard({
  number, title, subtitle, description, features, href, highlighted, bordered
}: {
  number: string
  title: string
  subtitle: string
  description: string
  features: string[]
  href: string
  highlighted?: boolean
  bordered?: boolean
}) {
  return (
    <div
      className="p-10 flex flex-col gap-6"
      style={{
        background: highlighted ? '#1a1410' : 'transparent',
        borderRight: bordered ? '1px solid #e2dcd4' : 'none',
      }}
    >
      <div>
        <span className="text-xs tracking-[0.3em]" style={{ color: highlighted ? '#6b7c5c' : '#a09890' }}>
          {number}
        </span>
        <h3 className="font-serif text-2xl mt-2" style={{ fontWeight: 300, color: highlighted ? '#f7f4ef' : '#1a1410' }}>
          {title}
        </h3>
        <p className="text-xs tracking-widest mt-1" style={{ color: highlighted ? '#6b7c5c' : '#a09890' }}>
          {subtitle.toUpperCase()}
        </p>
      </div>

      <div className="w-8 h-px" style={{ background: highlighted ? '#6b7c5c' : '#e2dcd4' }} />

      <p className="text-xs leading-loose" style={{ color: highlighted ? '#a09890' : '#6b6459', fontWeight: 300 }}>
        {description}
      </p>

      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: highlighted ? '#6b6459' : '#a09890' }}>
            <span style={{ color: highlighted ? '#6b7c5c' : '#c9b99a', marginTop: '1px' }}>—</span>
            {f}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-auto text-xs tracking-widest transition-opacity hover:opacity-60 inline-flex items-center gap-2"
        style={{ color: highlighted ? '#f7f4ef' : '#6b7c5c' }}
      >
        登録する →
      </Link>
    </div>
  )
}

const SAMPLE_HAIRDRESSERS = [
  { id: 1, name: '田中 美咲', specialty: 'カラー・ハイライト', area: '渋谷', price: 6000, emoji: '✂️', bg: '#f0ece4' },
  { id: 2, name: '鈴木 健太', specialty: 'メンズカット', area: '新宿', price: 5000, emoji: '💇', bg: '#ede9e2' },
  { id: 3, name: '山田 花子', specialty: '縮毛矯正', area: '表参道', price: 8000, emoji: '💆', bg: '#e8e3dc' },
]
