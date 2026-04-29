'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface FavoritedHairdresser {
  favoriteId: string
  id: string
  area: string
  bio: string | null
  portfolio_urls: string[] | null
  profiles: { name: string; avatar_url: string | null }
  avgRating: number | null
  reviewCount: number
}

export default function FavoritesPage() {
  const [hairdressers, setHairdressers] = useState<FavoritedHairdresser[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: favs } = await supabase
        .from('favorites')
        .select('id, hairdresser_id')
        .eq('consumer_id', user.id)
        .order('created_at', { ascending: false })

      if (!favs || favs.length === 0) { setLoading(false); return }

      const hairdresserIds = favs.map((f: { hairdresser_id: string }) => f.hairdresser_id)
      const { data: reviews } = await supabase
        .from('reviews')
        .select('hairdresser_id, rating')
        .in('hairdresser_id', hairdresserIds)

      // 美容師プロフィールを別途取得
      const { data: hairdresserData } = await supabase
        .from('hairdressers')
        .select('id, area, bio, portfolio_urls, profiles(name, avatar_url)')
        .in('id', hairdresserIds)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hdMap: Record<string, any> = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(hairdresserData || []).forEach((h: any) => { hdMap[h.id] = h })

      const ratingMap: Record<string, { sum: number; count: number }> = {}
      ;(reviews || []).forEach((r: { hairdresser_id: string; rating: number }) => {
        if (!ratingMap[r.hairdresser_id]) ratingMap[r.hairdresser_id] = { sum: 0, count: 0 }
        ratingMap[r.hairdresser_id].sum += r.rating
        ratingMap[r.hairdresser_id].count++
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list = (favs as any[]).map((f) => ({
        favoriteId: f.id,
        ...hdMap[f.hairdresser_id],
        avgRating: ratingMap[f.hairdresser_id]
          ? ratingMap[f.hairdresser_id].sum / ratingMap[f.hairdresser_id].count
          : null,
        reviewCount: ratingMap[f.hairdresser_id]?.count || 0,
      }))

      setHairdressers(list as FavoritedHairdresser[])
      setLoading(false)
    }
    load()
  }, [])

  const handleUnfavorite = async (favoriteId: string, hairdresserId: string) => {
    await supabase.from('favorites').delete().eq('id', favoriteId)
    setHairdressers(prev => prev.filter(h => h.favoriteId !== favoriteId))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-16">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>MY FAVORITES</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>お気に入り</h1>
        </div>

        {hairdressers.length === 0 ? (
          <div style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center', border: '1px solid #ebebeb' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1rem', fontWeight: 300 }}>NO FAVORITES YET</p>
            <Link href="/search" style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, borderBottom: '1px solid #999999', textDecoration: 'none', paddingBottom: '2px', letterSpacing: '0.04em' }}>
              美容師を探す →
            </Link>
          </div>
        ) : (
          <div style={{ border: '1px solid #ebebeb' }}>
            {hairdressers.map((h, i) => (
              <div key={h.favoriteId} className="px-6 py-6 flex items-start gap-5"
                style={{ borderBottom: i < hairdressers.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                <Link href={`/hairdressers/${h.id}`} style={{ flexShrink: 0, textDecoration: 'none' }}>
                  <div style={{ width: '4rem', height: '4rem', background: '#f5f5f5', overflow: 'hidden' }}>
                    {h.profiles.avatar_url ? (
                      <img src={h.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 100, color: '#cccccc' }}>
                        {h.profiles.name?.[0]}
                      </div>
                    )}
                  </div>
                </Link>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/hairdressers/${h.id}`} style={{ textDecoration: 'none' }}>
                    <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300, marginBottom: '0.25rem' }}>{h.profiles.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#cccccc', fontWeight: 300, marginBottom: '0.5rem', letterSpacing: '0.15em' }}>{h.area}</p>
                  </Link>
                  {h.avgRating !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span style={{ color: '#c9b99a', fontSize: '0.7rem' }}>{'★'.repeat(Math.round(h.avgRating))}{'☆'.repeat(5 - Math.round(h.avgRating))}</span>
                      <span style={{ fontSize: '0.7rem', color: '#999999', fontWeight: 300 }}>{h.avgRating.toFixed(1)}（{h.reviewCount}件）</span>
                    </div>
                  )}
                  {h.bio && (
                    <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, marginTop: '0.5rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                      {h.bio}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleUnfavorite(h.favoriteId, h.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', flexShrink: 0, color: '#c9b99a' }}
                  title="お気に入り解除"
                >
                  <Heart size={18} style={{ fill: '#c9b99a' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
