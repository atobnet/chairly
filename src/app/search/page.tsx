'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { Hairdresser, Profile } from '@/types'

interface RankingData {
  rankings: { hairdresser_id: string; rank: number; count: number }[]
  trending: string[]
}

const AREAS = ['すべて', '渋谷区', '新宿区', '港区', '中央区', '千代田区', '世田谷区', '目黒区', '品川区', '豊島区', '文京区', '台東区', '杉並区', '中野区']
const SPECIALTY_TAGS = ['縮毛矯正', '髪質改善', 'カラー', 'ハイライト', 'パーマ', 'ヘアセット', 'くせ毛', 'ショート', 'ロング', 'バージン毛', 'ダメージケア', 'メンズカット', '白髪染め', 'ブリーチ', 'トリートメント']

interface HairdresserWithProfile extends Hairdresser {
  profiles: Profile
}

function RankingBadge({ hairdresserId, ranking }: { hairdresserId: string; ranking: RankingData | null }) {
  if (!ranking) return null
  const entry = ranking.rankings.find(r => r.hairdresser_id === hairdresserId)
  const isTrending = ranking.trending.includes(hairdresserId)
  if (!entry && !isTrending) return null

  let bg = '#B8962E'
  let label = 'RANKING #1'
  if (entry?.rank === 2) { bg = '#8A8A8A'; label = 'RANKING #2' }
  else if (entry?.rank === 3) { bg = '#9C6B3C'; label = 'RANKING #3' }
  else if (!entry && isTrending) { bg = '#6B4E9C'; label = 'TRENDING' }

  return (
    <span
      className="absolute top-3 left-3 px-2 py-1 font-medium"
      style={{ background: bg, color: '#fff', fontSize: '0.6rem', letterSpacing: '0.1em' }}
    >
      {label}
    </span>
  )
}

export default function SearchPage() {
  const [hairdressers, setHairdressers] = useState<HairdresserWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [areaFilter, setAreaFilter] = useState('すべて')
  const [keyword, setKeyword] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadHairdressers()
  }, [areaFilter])

  useEffect(() => {
    fetch('/api/hairdresser-ranking')
      .then(r => r.json())
      .then(setRankingData)
      .catch(() => {})
  }, [])

  const loadHairdressers = async () => {
    setLoading(true)
    let query = supabase.from('hairdressers').select('*, profiles(id, name, avatar_url, role, created_at)')
    if (areaFilter !== 'すべて') query = query.eq('area', areaFilter)
    const { data } = await query.limit(50)
    setHairdressers((data || []) as HairdresserWithProfile[])
    setLoading(false)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const filtered = hairdressers.filter(h => {
    if (keyword) {
      const k = keyword.toLowerCase()
      if (!h.profiles?.name?.toLowerCase().includes(k) && !h.bio?.toLowerCase().includes(k) && !h.menus?.some(m => m.name.toLowerCase().includes(k))) return false
    }
    if (selectedTags.length > 0) {
      const tags = h.specialty_tags || []
      if (!selectedTags.some(t => tags.includes(t))) return false
    }
    return true
  })

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-5xl mx-auto">

        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>SEARCH</p>
          <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>美容師を探す</h1>
        </div>

        {/* キーワード検索 */}
        <div className="mb-6 border-b pb-6" style={{ borderColor: '#e2dcd4' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="名前・メニューで検索..."
            className="w-full max-w-md px-0 py-2 text-sm border-0 border-b focus:outline-none bg-transparent"
            style={{ borderColor: '#e2dcd4', color: '#1a1410', borderBottom: '1px solid #e2dcd4' }}
          />
        </div>

        {/* エリアフィルター */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {AREAS.map(area => (
            <button
              key={area}
              onClick={() => setAreaFilter(area)}
              className="whitespace-nowrap text-xs tracking-widest pb-1 border-b-2 transition-all"
              style={{
                borderColor: areaFilter === area ? '#1a1410' : 'transparent',
                color: areaFilter === area ? '#1a1410' : '#a09890',
              }}
            >
              {area}
            </button>
          ))}
        </div>

        {/* 得意分野タグフィルター */}
        <div className="mb-10 pb-8 border-b" style={{ borderColor: '#e2dcd4' }}>
          <p className="text-xs tracking-widest mb-3" style={{ color: '#a09890' }}>得意分野</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_TAGS.map(tag => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="text-xs px-3 py-1 transition-all"
                  style={{
                    border: active ? '1px solid #1a1410' : '1px solid #d4cec7',
                    background: active ? '#1a1410' : 'transparent',
                    color: active ? '#ffffff' : '#6b6459',
                    fontWeight: 300,
                    letterSpacing: '0.04em',
                  }}
                >
                  {tag}
                </button>
              )
            })}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs px-3 py-1"
                style={{ border: '1px solid transparent', color: '#a09890', fontWeight: 300, textDecoration: 'underline' }}
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* 結果 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin" size={20} style={{ color: '#6b7c5c' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-xs tracking-widest" style={{ color: '#a09890' }}>NO RESULTS FOUND</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map(h => (
              <Link key={h.id} href={`/hairdressers/${h.id}`} className="group block">
                <div
                  className="aspect-[4/5] mb-4 overflow-hidden flex items-center justify-center relative"
                  style={{ background: '#f0ece4' }}
                >
                  {h.profiles?.avatar_url ? (
                    <img src={h.profiles.avatar_url} alt={h.profiles.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="text-center">
                      <div className="font-serif text-6xl mb-2" style={{ color: '#e2dcd4', fontWeight: 300 }}>
                        {h.profiles?.name?.[0] || '?'}
                      </div>
                      <p className="text-xs tracking-widest" style={{ color: '#c9b99a' }}>NO PHOTO</p>
                    </div>
                  )}
                  <RankingBadge hairdresserId={h.id} ranking={rankingData} />
                  <div className="absolute bottom-3 left-3">
                    <span className="text-xs px-2 py-1 tracking-wider" style={{ background: 'rgba(247,244,239,0.9)', color: '#6b6459' }}>
                      {h.area}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-sm font-medium" style={{ color: '#1a1410' }}>{h.profiles?.name || '未設定'}</h3>
                    {h.menus && h.menus.length > 0 && (
                      <span className="text-xs" style={{ color: '#6b7c5c' }}>
                        ¥{Math.min(...h.menus.map(m => m.price)).toLocaleString()}–
                      </span>
                    )}
                  </div>
                  {h.bio && (
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#a09890' }}>{h.bio}</p>
                  )}
                  {h.specialty_tags && h.specialty_tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {h.specialty_tags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-0.5" style={{ background: '#ece8e1', color: '#6b6459', fontSize: '0.65rem' }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
