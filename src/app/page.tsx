import Link from 'next/link'

export default function HomePage() {
  return (
    <div style={{ background: '#ffffff', color: '#111111' }}>

      {/* Hero — full viewport, text-driven */}
      <section className="min-h-[100svh] flex flex-col justify-between px-8 pt-24 pb-16" style={{ background: '#ffffff' }}>
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
          <p className="text-xs tracking-[0.4em] mb-16" style={{ color: '#cccccc' }}>TOKYO — 2025</p>

          <h1
            className="leading-none mb-16"
            style={{
              fontSize: 'clamp(3.5rem, 12vw, 10rem)',
              fontWeight: 100,
              letterSpacing: '-0.02em',
              color: '#111111',
            }}
          >
            Chairly
          </h1>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl">
            <p style={{ color: '#999999', fontWeight: 300, lineHeight: 2, fontSize: '13px', letterSpacing: '0.06em' }}>
              フリーランス美容師と<br />
              レンタルサロンと<br />
              あなたをつなぐ場所。
            </p>
            <div className="flex flex-col justify-end gap-4">
              <Link
                href="/search"
                className="inline-block text-xs tracking-[0.25em] transition-colors hover:opacity-50"
                style={{ color: '#111111' }}
              >
                美容師を探す →
              </Link>
              <Link
                href="/signup"
                className="inline-block text-xs tracking-[0.25em] transition-colors hover:opacity-50"
                style={{ color: '#999999' }}
              >
                無料登録 →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto w-full flex items-end justify-between pt-12" style={{ borderTop: '1px solid #ebebeb' }}>
          <span className="text-xs tracking-widest" style={{ color: '#cccccc' }}>HAIR PLATFORM</span>
          <span className="text-xs tracking-widest" style={{ color: '#cccccc' }}>SCROLL</span>
        </div>
      </section>

      {/* About */}
      <section className="px-8 py-32" style={{ background: '#fafafa' }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-8">
          <div className="md:col-span-2">
            <p className="text-xs tracking-[0.35em]" style={{ color: '#cccccc' }}>ABOUT</p>
          </div>
          <div className="md:col-span-5">
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 100, letterSpacing: '0.04em', lineHeight: 1.5, color: '#111111' }}>
              才能を、<br />自由な場所で。
            </h2>
          </div>
          <div className="md:col-span-5 flex items-center">
            <p style={{ color: '#999999', fontWeight: 300, lineHeight: 2, fontSize: '13px' }}>
              サロン契約に縛られず働きたい美容師。
              遊休チェアを活かしたいサロンオーナー。
              お気に入りの美容師に任せたい消費者。
              Chairly は、三者が出会う場所です。
            </p>
          </div>
        </div>
      </section>

      {/* Three roles */}
      <section className="px-8 py-32">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <p className="text-xs tracking-[0.35em] mb-4" style={{ color: '#cccccc' }}>FOR EVERYONE</p>
          </div>

          <div className="grid md:grid-cols-3" style={{ borderTop: '1px solid #ebebeb' }}>
            <RoleBlock
              index="01"
              title="消費者"
              en="Consumer"
              desc="お気に入りの美容師を見つけて、好きな場所・時間で施術を予約できます。"
              href="/signup?role=consumer"
            />
            <RoleBlock
              index="02"
              title="美容師"
              en="Hairdresser"
              desc="サロン契約不要。好きな場所で、自分のペースで活動できます。"
              href="/signup?role=hairdresser"
            />
            <RoleBlock
              index="03"
              title="サロン"
              en="Salon"
              desc="空き時間のチェアを美容師に提供し、スペースを収益化できます。"
              href="/signup?role=salon"
            />
          </div>
        </div>
      </section>

      {/* Featured hairdressers */}
      <section className="px-8 py-32" style={{ background: '#fafafa' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-16">
            <div>
              <p className="text-xs tracking-[0.35em] mb-3" style={{ color: '#cccccc' }}>FEATURED</p>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 100, letterSpacing: '0.04em' }}>注目の美容師</h2>
            </div>
            <Link href="/search" className="text-xs tracking-widest transition-opacity hover:opacity-40" style={{ color: '#999999' }}>
              ALL →
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-px" style={{ background: '#ebebeb' }}>
            {SAMPLE_HAIRDRESSERS.map((h) => (
              <Link key={h.id} href="/search" className="group block" style={{ background: '#ffffff' }}>
                <div
                  className="aspect-[3/4] flex items-center justify-center overflow-hidden"
                  style={{ background: h.bg }}
                >
                  <span
                    className="text-7xl transition-transform duration-700 group-hover:scale-95"
                    style={{ opacity: 0.15 }}
                  >
                    {h.emoji}
                  </span>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm mb-1" style={{ color: '#111111', fontWeight: 300 }}>{h.name}</p>
                  <p className="text-xs" style={{ color: '#cccccc' }}>{h.area}　{h.specialty}</p>
                  <p className="text-xs mt-2" style={{ color: '#999999' }}>¥{h.price.toLocaleString()}–</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-40">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-end">
            <h2 style={{ fontSize: 'clamp(2rem, 6vw, 5rem)', fontWeight: 100, letterSpacing: '-0.01em', lineHeight: 1.2, color: '#111111' }}>
              今すぐ<br />始めよう。
            </h2>
            <div>
              <p className="mb-10" style={{ color: '#999999', fontWeight: 300, lineHeight: 2, fontSize: '13px' }}>
                登録は無料。<br />東京エリア先行公開中。
              </p>
              <Link
                href="/signup"
                className="inline-block text-xs tracking-[0.25em] pb-1 transition-all hover:opacity-40"
                style={{ color: '#111111', borderBottom: '1px solid #111111' }}
              >
                無料登録
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-10" style={{ borderTop: '1px solid #ebebeb' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs tracking-[0.25em]" style={{ color: '#111111', fontWeight: 200 }}>CHAIRLY</span>
          <p className="text-xs tracking-widest" style={{ color: '#cccccc' }}>© 2025 CHAIRLY TOKYO</p>
        </div>
      </footer>

    </div>
  )
}

function RoleBlock({ index, title, en, desc, href }: { index: string; title: string; en: string; desc: string; href: string }) {
  return (
    <div
      className="px-8 py-12 group"
      style={{ borderBottom: '1px solid #ebebeb', borderRight: '1px solid #ebebeb' }}
    >
      <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#dddddd' }}>{index}</p>
      <h3 className="mb-1" style={{ fontSize: '1.4rem', fontWeight: 100, color: '#111111', letterSpacing: '0.06em' }}>{title}</h3>
      <p className="text-xs tracking-widest mb-8" style={{ color: '#cccccc' }}>{en.toUpperCase()}</p>
      <p className="text-xs leading-loose mb-10" style={{ color: '#999999' }}>{desc}</p>
      <Link
        href={href}
        className="text-xs tracking-widest transition-opacity hover:opacity-40"
        style={{ color: '#111111', borderBottom: '1px solid #ebebeb', paddingBottom: '2px' }}
      >
        登録する →
      </Link>
    </div>
  )
}

const SAMPLE_HAIRDRESSERS = [
  { id: 1, name: '田中 美咲', specialty: 'カラー / ハイライト', area: '渋谷', price: 6000, emoji: '✂', bg: '#f5f5f5' },
  { id: 2, name: '鈴木 健太', specialty: 'メンズカット / パーマ', area: '新宿', price: 5000, emoji: '✂', bg: '#f0f0f0' },
  { id: 3, name: '山田 花子', specialty: '縮毛矯正 / トリートメント', area: '表参道', price: 8000, emoji: '✂', bg: '#ebebeb' },
]
