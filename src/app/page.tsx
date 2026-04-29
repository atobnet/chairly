import Link from 'next/link'
import Image from 'next/image'
import { Check, Scissors, MapPin, ShieldCheck, CreditCard, User, Building2 } from 'lucide-react'

export default function HomePage() {
  return (
    <div style={{ background: '#ffffff', color: '#111111' }}>

      {/* ① ヒーロー */}
      <section className="min-h-[100svh] flex flex-col justify-between px-8 pt-24 pb-16" style={{ background: '#ffffff' }}>
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center items-center text-center">
          <div className="mb-6">
            <Image
              src="/chairly-logo.png"
              alt="Chairly"
              width={400}
              height={120}
              priority
              className="w-[180px] sm:w-[280px] md:w-[400px] h-auto"
            />
          </div>

          <h1
            className="leading-tight mb-5"
            style={{
              fontSize: 'clamp(1.2rem, 3.5vw, 3rem)',
              fontWeight: 100,
              letterSpacing: '-0.01em',
              color: '#111111',
            }}
          >
            あなただけの美容師を、<br />
            あなたの近くで。
          </h1>

          <p className="mb-8" style={{ fontSize: '14px', fontWeight: 300, letterSpacing: '0.08em', color: '#444444' }}>
            Your Chair, Anywhere.
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/search"
              className="inline-block text-xs tracking-[0.25em] px-8 py-3 text-center transition-opacity hover:opacity-70"
              style={{ background: '#111111', color: '#ffffff', width: '240px' }}
            >
              美容師を探す →
            </Link>
            <Link
              href="/signup?role=hairdresser"
              className="inline-block text-xs tracking-[0.25em] px-8 py-3 text-center transition-opacity hover:opacity-50"
              style={{ border: '1px solid #ebebeb', color: '#999999', width: '240px' }}
            >
              美容師の方はこちら →
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full flex items-end justify-between pt-12" style={{ borderTop: '1px solid #ebebeb' }}>
          <span className="text-xs tracking-widest" style={{ color: '#cccccc' }}>HAIR PLATFORM</span>
          <span className="text-xs tracking-widest" style={{ color: '#cccccc' }}>SCROLL</span>
        </div>
      </section>

      {/* ② How it works */}
      <section className="px-8 py-32" style={{ background: '#fafafa' }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-xs tracking-[0.35em] mb-3" style={{ color: '#cccccc' }}>HOW IT WORKS</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 100, letterSpacing: '0.04em' }}>予約の流れ</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-px" style={{ background: '#ebebeb' }}>
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="px-8 py-12" style={{ background: '#fafafa' }}>
                <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#aaaaaa' }}>{step.step}</p>
                <h3 className="mb-4" style={{ fontSize: '1rem', fontWeight: 300, color: '#111111', letterSpacing: '0.04em' }}>{step.title}</h3>
                <p className="text-xs leading-loose" style={{ color: '#999999' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 3者訴求 */}
      <section className="px-8 py-32" style={{ background: '#ffffff' }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-xs tracking-[0.35em] mb-3" style={{ color: '#cccccc' }}>FOR EVERYONE</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 100, letterSpacing: '0.04em' }}>Chairlyを使う3者へ</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-px" style={{ background: '#ebebeb' }}>
            {FOR_EVERYONE.map((card) => (
              <div key={card.role} className="px-8 py-12 flex flex-col" style={{ background: '#ffffff' }}>
                <div className="mb-6" style={{ color: '#cccccc' }}>
                  <card.Icon size={24} strokeWidth={1} />
                </div>
                <p className="text-xs tracking-[0.3em] mb-4" style={{ color: '#cccccc' }}>{card.role}</p>
                <h3 className="mb-4" style={{ fontSize: '1rem', fontWeight: 300, color: '#111111', letterSpacing: '0.04em', lineHeight: 1.7 }}>{card.title}</h3>
                <p className="text-xs leading-loose mb-10 flex-1" style={{ color: '#999999' }}>{card.desc}</p>
                <Link
                  href={card.href}
                  className="text-xs tracking-widest transition-opacity hover:opacity-40 self-start"
                  style={{ color: '#111111', borderBottom: '1px solid #ebebeb', paddingBottom: '2px' }}
                >
                  {card.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ④ Why Chairly */}
      <section className="px-8 py-32" style={{ background: '#fafafa' }}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-xs tracking-[0.35em] mb-3" style={{ color: '#cccccc' }}>WHY CHAIRLY</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 100, letterSpacing: '0.04em' }}>選ばれる理由</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: '#ebebeb' }}>
            {WHY_CHAIRLY.map((item) => (
              <div key={item.title} className="px-8 py-10" style={{ background: '#fafafa' }}>
                <div className="mb-5" style={{ color: '#111111' }}>
                  <item.Icon size={18} strokeWidth={1.5} />
                </div>
                <h3 className="mb-3" style={{ fontSize: '0.875rem', fontWeight: 300, color: '#111111', letterSpacing: '0.04em' }}>{item.title}</h3>
                <p className="text-xs leading-loose" style={{ color: '#999999' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ⑤ 最終CTA */}
      <section className="px-8 py-40" style={{ background: '#0F172A' }}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs tracking-[0.4em] mb-8" style={{ color: '#475569' }}>GET STARTED</p>
          <h2
            className="mb-12"
            style={{
              fontSize: 'clamp(1.8rem, 5vw, 4rem)',
              fontWeight: 100,
              letterSpacing: '-0.01em',
              color: '#f8fafc',
              lineHeight: 1.4,
            }}
          >
            まず、美容師を<br />
            探してみませんか？
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/search"
              className="inline-block text-xs tracking-[0.25em] px-8 py-3 text-center transition-opacity hover:opacity-70"
              style={{ background: '#f8fafc', color: '#0F172A', width: '240px' }}
            >
              美容師を探す →
            </Link>
            <Link
              href="/signup?role=hairdresser"
              className="inline-block text-xs tracking-[0.25em] px-8 py-3 text-center transition-opacity hover:opacity-50"
              style={{ border: '1px solid #334155', color: '#94a3b8', width: '240px' }}
            >
              美容師として登録する →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-10" style={{ borderTop: '1px solid #1e293b', background: '#0F172A' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-xs tracking-[0.25em]" style={{ color: '#f8fafc', fontWeight: 200 }}>CHAIRLY</span>
          <p className="text-xs tracking-widest" style={{ color: '#475569' }}>© 2026 CHAIRLY TOKYO</p>
        </div>
      </footer>

    </div>
  )
}

// ---- データ ----

const HOW_IT_WORKS = [
  {
    step: '01',
    title: '好きな美容師を選ぶ',
    desc: 'スキルやスタイルからお気に入りの美容師を見つける。',
  },
  {
    step: '02',
    title: '近くのサロンと日時を選ぶ',
    desc: '美容師が利用できるサロンから、近くて都合のいい場所・時間を選択。',
  },
  {
    step: '03',
    title: '予約完了・当日を楽しみに',
    desc: '確認メールが届いたら準備完了。当日サロンで施術を受けるだけ。',
  },
]

const FOR_EVERYONE = [
  {
    role: 'GUEST',
    Icon: User,
    title: 'お気に入りの美容師が、いつでも近くに',
    desc: '好きな美容師を指名して、最寄りのサロンで施術が受けられる。美容師との関係を、場所を超えて続けられる。',
    cta: 'ゲスト登録はこちら',
    href: '/signup',
  },
  {
    role: 'HAIRDRESSER',
    Icon: Scissors,
    title: '場所を選ばず、あなたの技術で働く',
    desc: '全国のサロンを自由に使って独立・副業をスタート。自分のペースで、自分のお客様と向き合える。',
    cta: '美容師登録はこちら',
    href: '/signup?role=hairdresser',
  },
  {
    role: 'SALON',
    Icon: Building2,
    title: '空き席を、収益に変える',
    desc: '稼働していない席をフリーランス美容師に開放するだけ。新たな集客や設備投資は不要。',
    cta: 'サロン登録はこちら',
    href: '/signup?role=salon',
  },
]

const WHY_CHAIRLY = [
  {
    Icon: Check,
    title: '厳選されたフリーランス美容師',
    desc: '審査を通過した美容師のみが登録。安心して指名できる。',
  },
  {
    Icon: MapPin,
    title: '全国のサロンから近くを選べる',
    desc: '美容師の活動エリアにあるサロンを地図から選択できる。',
  },
  {
    Icon: ShieldCheck,
    title: '安心のキャンセルポリシー',
    desc: '3日前までは全額返金。前日30%・当日50%のキャンセル料。ポリシーを明示。',
  },
  {
    Icon: CreditCard,
    title: 'Stripe決済で安全・簡単',
    desc: 'クレジットカード決済に対応。支払いは予約確定時に安全に処理。',
  },
]
