import Link from 'next/link'
import { Scissors, Building2, User, ChevronRight, Star, MapPin, Clock } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: '#0F172A' }}>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-32 sm:pt-32">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            東京エリア・プロトタイプ公開中
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
            あなたの才能を、<br />
            <span style={{ color: '#60A5FA' }}>自由な場所で</span>輝かせよう
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            フリーランス美容師 × レンタルサロン × 消費者。<br />
            Chairly がすべてをつなぐ、新しい美容体験。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold text-base transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
            >
              美容師を探す
              <ChevronRight size={18} />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-slate-200 font-semibold text-base border border-slate-600 hover:border-slate-400 hover:text-white transition-all"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </section>

      {/* 3 User Types */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-4">
            3者をつなぐプラットフォーム
          </h2>
          <p className="text-center text-slate-400 mb-12">誰でも使える、シンプルな仕組み</p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Consumer */}
            <div className="rounded-2xl border border-slate-700/50 p-6 group hover:border-blue-500/50 transition-all hover:bg-slate-800/30" style={{ background: '#1E293B' }}>
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4 group-hover:bg-blue-500/25 transition-colors">
                <User size={22} className="text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">消費者</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                お気に入りの美容師を見つけて、好きな場所・時間で施術を予約。
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> エリア・メニューで検索</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> リアルタイム空き枠確認</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> 簡単予約リクエスト</li>
              </ul>
              <Link href="/signup?role=consumer" className="mt-6 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                消費者として登録 <ChevronRight size={14} />
              </Link>
            </div>

            {/* Hairdresser */}
            <div className="rounded-2xl border border-blue-500/40 p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1E293B)' }}>
              <div className="absolute top-4 right-4 text-xs bg-blue-500 text-white px-2.5 py-0.5 rounded-full font-medium">人気</div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Scissors size={22} className="text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">フリーランス美容師</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                サロン契約不要。好きな場所で、自分のペースで働こう。
              </p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> プロフィール・料金を自由設定</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> スケジュール管理</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> 予約リクエスト管理</li>
              </ul>
              <Link href="/signup?role=hairdresser" className="mt-6 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                美容師として登録 <ChevronRight size={14} />
              </Link>
            </div>

            {/* Salon */}
            <div className="rounded-2xl border border-slate-700/50 p-6 group hover:border-blue-500/50 transition-all hover:bg-slate-800/30" style={{ background: '#1E293B' }}>
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4 group-hover:bg-blue-500/25 transition-colors">
                <Building2 size={22} className="text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">レンタルサロン</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                遊休チェアを収益化。美容師に空き枠を提供して稼働率アップ。
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> スペース情報を掲載</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> 空き枠を一括管理</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> 稼働率サマリー確認</li>
              </ul>
              <Link href="/signup?role=salon" className="mt-6 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium">
                サロンとして登録 <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured hairdressers (static promo) */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white">注目の美容師</h2>
            <Link href="/search" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              すべて見る <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SAMPLE_HAIRDRESSERS.map((h) => (
              <div key={h.id} className="rounded-2xl border border-slate-700/50 overflow-hidden group cursor-pointer hover:border-slate-600 transition-all" style={{ background: '#1E293B' }}>
                <div className="h-40 flex items-center justify-center relative overflow-hidden" style={{ background: h.gradient }}>
                  <div className="text-5xl">{h.emoji}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-white">{h.name}</h3>
                    <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                      <Star size={11} fill="currentColor" />
                      <span className="text-slate-300">{h.rating}</span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mb-2">{h.specialty}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={10} />{h.area}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />¥{h.price.toLocaleString()}〜</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="max-w-2xl mx-auto text-center rounded-2xl border border-blue-500/30 p-12" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(96,165,250,0.05))' }}>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            今すぐ始めよう
          </h2>
          <p className="text-slate-400 mb-8">登録は無料。東京エリアで先行公開中。</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-3.5 rounded-full text-white font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
          >
            無料で登録する <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
              <Scissors size={12} className="text-white" />
            </div>
            <span className="font-bold text-white">Chairly</span>
          </div>
          <p className="text-slate-500 text-sm">© 2025 Chairly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

const SAMPLE_HAIRDRESSERS = [
  { id: 1, name: '田中 美咲', specialty: 'カット・カラー・ハイライト', area: '渋谷', price: 6000, rating: '4.9', emoji: '✂️', gradient: 'linear-gradient(135deg, #1e3a5f, #0f2440)' },
  { id: 2, name: '鈴木 健太', specialty: 'メンズカット・パーマ', area: '新宿', price: 5000, rating: '4.8', emoji: '💇', gradient: 'linear-gradient(135deg, #1a2f1a, #0f1f0f)' },
  { id: 3, name: '山田 花子', specialty: 'トリートメント・縮毛矯正', area: '表参道', price: 8000, rating: '5.0', emoji: '💆', gradient: 'linear-gradient(135deg, #3d1a4a, #1a0f2a)' },
]
