'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, MapPin, Star, Clock, ChevronRight, Loader2, Filter } from 'lucide-react'
import Link from 'next/link'
import type { Hairdresser, Profile } from '@/types'

const AREAS = ['すべて', '渋谷区', '新宿区', '港区', '中央区', '千代田区', '世田谷区', '目黒区', '品川区', '豊島区', '文京区', '台東区', '杉並区', '中野区']

interface HairdresserWithProfile extends Hairdresser {
  profiles: Profile
}

export default function SearchPage() {
  const [hairdressers, setHairdressers] = useState<HairdresserWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [areaFilter, setAreaFilter] = useState('すべて')
  const [keyword, setKeyword] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadHairdressers()
  }, [areaFilter])

  const loadHairdressers = async () => {
    setLoading(true)
    let query = supabase
      .from('hairdressers')
      .select('*, profiles(id, name, avatar_url, role, created_at)')

    if (areaFilter !== 'すべて') {
      query = query.eq('area', areaFilter)
    }

    const { data } = await query.limit(20)
    setHairdressers((data || []) as HairdresserWithProfile[])
    setLoading(false)
  }

  const filtered = hairdressers.filter(h => {
    if (!keyword) return true
    const k = keyword.toLowerCase()
    return (
      h.profiles?.name?.toLowerCase().includes(k) ||
      h.bio?.toLowerCase().includes(k) ||
      h.menus?.some(m => m.name.toLowerCase().includes(k))
    )
  })

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#0F172A' }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">美容師を探す</h1>
        <p className="text-slate-400 mb-6">東京エリアの美容師を検索できます</p>

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="名前・メニューで検索"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors"
              style={{ background: '#1E293B' }}
            />
          </div>
        </div>

        {/* Area filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {AREAS.map(area => (
            <button
              key={area}
              onClick={() => setAreaFilter(area)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm border transition-all ${
                areaFilter === area
                  ? 'border-blue-500 bg-blue-500/15 text-blue-300 font-medium'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-400" size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p>該当する美容師が見つかりませんでした</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(h => (
              <Link
                key={h.id}
                href={`/hairdressers/${h.id}`}
                className="rounded-2xl border border-slate-700 overflow-hidden group hover:border-blue-500/50 hover:-translate-y-0.5 transition-all"
                style={{ background: '#1E293B' }}
              >
                {/* Avatar / header */}
                <div className="h-36 flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2440)' }}>
                  {h.profiles?.avatar_url ? (
                    <img src={h.profiles.avatar_url} alt={h.profiles.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-500/30 flex items-center justify-center text-2xl font-bold text-blue-300">
                      {h.profiles?.name?.[0] || '?'}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {h.profiles?.name || '未設定'}
                    </h3>
                  </div>

                  {h.bio && (
                    <p className="text-slate-400 text-xs mb-2 line-clamp-2">{h.bio}</p>
                  )}

                  {h.menus && h.menus.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {h.menus.slice(0, 3).map((m, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
                          {m.name}
                        </span>
                      ))}
                      {h.menus.length > 3 && (
                        <span className="text-xs text-slate-500">+{h.menus.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {h.area || '東京'}
                    </span>
                    {h.menus && h.menus.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        ¥{Math.min(...h.menus.map(m => m.price)).toLocaleString()}〜
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
