'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
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
    let query = supabase.from('hairdressers').select('*, profiles(id, name, avatar_url, role, created_at)')
    if (areaFilter !== 'すべて') query = query.eq('area', areaFilter)
    const { data } = await query.limit(20)
    setHairdressers((data || []) as HairdresserWithProfile[])
    setLoading(false)
  }

  const filtered = hairdressers.filter(h => {
    if (!keyword) return true
    const k = keyword.toLowerCase()
    return h.profiles?.name?.toLowerCase().includes(k) || h.bio?.toLowerCase().includes(k) || h.menus?.some(m => m.name.toLowerCase().includes(k))
  })

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>SEARCH</p>
          <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>美容師を探す</h1>
        </div>

        {/* Search */}
        <div className="mb-8 border-b pb-8" style={{ borderColor: '#e2dcd4' }}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="名前・メニューで検索..."
            className="w-full max-w-md px-0 py-2 text-sm border-0 border-b focus:outline-none bg-transparent"
            style={{ borderColor: '#e2dcd4', color: '#1a1410', borderBottom: '1px solid #e2dcd4' }}
          />
        </div>

        {/* Area filter */}
        <div className="flex gap-4 overflow-x-auto pb-4 mb-12 scrollbar-hide">
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

        {/* Results */}
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
                {/* Photo placeholder */}
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
                  {/* Area badge */}
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
                  {h.menus && h.menus.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {h.menus.slice(0, 3).map((m, i) => (
                        <span key={i} className="text-xs" style={{ color: '#c9b99a' }}>{m.name}</span>
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
