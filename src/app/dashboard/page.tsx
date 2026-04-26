'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole, Slot, Profile, Booking } from '@/types'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface BookingWithDetails extends Booking {
  slots: Slot & { hairdressers?: { profiles: Profile } | null }
  profiles: Profile
}

export default function DashboardPage() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
      if (!profile) return
      setRole(profile.role as UserRole)
      setName(profile.name)

      if (profile.role === 'hairdresser') {
        const { data: slotData } = await supabase.from('slots').select('id').eq('hairdresser_id', user.id)
        const slotIds = (slotData || []).map((s: { id: string }) => s.id)
        if (slotIds.length > 0) {
          const { data } = await supabase.from('bookings')
            .select('*, slots(*), profiles(name, id, role, avatar_url, created_at)')
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })
            .limit(8)
          setBookings((data || []) as BookingWithDetails[])
        }
      } else if (profile.role === 'salon') {
        const { data: slotData } = await supabase.from('slots').select('id').eq('salon_id', user.id)
        const slotIds = (slotData || []).map((s: { id: string }) => s.id)
        if (slotIds.length > 0) {
          const { data } = await supabase.from('bookings')
            .select('*, slots(*), profiles(name, id, role, avatar_url, created_at)')
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })
            .limit(8)
          setBookings((data || []) as BookingWithDetails[])
        }
      } else {
        const { data } = await supabase.from('bookings')
          .select('*, slots(*, hairdressers(profiles(name, id, role, avatar_url, created_at))), profiles(name, id, role, avatar_url, created_at)')
          .eq('consumer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8)
        setBookings((data || []) as BookingWithDetails[])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#6b7c5c' }} />
      </div>
    )
  }

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: '確認待ち', color: '#c9b99a' },
    confirmed: { label: '確定', color: '#6b7c5c' },
    cancelled: { label: 'キャンセル', color: '#85403b' },
  }

  const quickLinks = role === 'consumer'
    ? [{ href: '/search', label: '美容師を探す', sub: 'Find Artists' }, { href: '/bookings', label: '予約一覧', sub: 'My Bookings' }]
    : role === 'hairdresser'
    ? [{ href: '/schedule', label: 'スケジュール', sub: 'Schedule' }, { href: '/requests', label: 'リクエスト', sub: 'Requests' }, { href: '/profile/edit', label: 'プロフィール', sub: 'Profile' }]
    : [{ href: '/slots', label: '空き枠管理', sub: 'Slots' }, { href: '/space/edit', label: 'スペース編集', sub: 'Space' }]

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>DASHBOARD</p>
          <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>
            こんにちは、{name}
          </h1>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-0 border mb-16" style={{ borderColor: '#e2dcd4' }}>
          {quickLinks.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className="p-8 transition-colors group"
              style={{
                borderRight: i < quickLinks.length - 1 ? '1px solid #e2dcd4' : 'none',
                background: 'transparent',
              }}
            >
              <p className="text-xs tracking-widest mb-1" style={{ color: '#a09890' }}>{l.sub.toUpperCase()}</p>
              <p className="text-base" style={{ color: '#1a1410' }}>{l.label}</p>
              <p className="text-xs mt-3 transition-opacity opacity-0 group-hover:opacity-100" style={{ color: '#6b7c5c' }}>→</p>
            </Link>
          ))}
        </div>

        {/* Bookings */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl" style={{ fontWeight: 300 }}>最近の予約</h2>
          </div>

          {bookings.length === 0 ? (
            <div className="py-20 text-center border" style={{ borderColor: '#e2dcd4' }}>
              <p className="text-xs tracking-widest" style={{ color: '#a09890' }}>NO BOOKINGS YET</p>
              {role === 'consumer' && (
                <Link href="/search" className="inline-block mt-4 text-xs underline underline-offset-4" style={{ color: '#6b7c5c' }}>
                  美容師を探す →
                </Link>
              )}
            </div>
          ) : (
            <div className="border" style={{ borderColor: '#e2dcd4' }}>
              {bookings.map((b, i) => {
                const s = statusLabel[b.status] || statusLabel.pending
                return (
                  <div
                    key={b.id}
                    className="px-6 py-5 flex items-center justify-between gap-4"
                    style={{ borderBottom: i < bookings.length - 1 ? '1px solid #ede9e2' : 'none' }}
                  >
                    <div>
                      <p className="text-sm" style={{ color: '#1a1410' }}>{b.menu || '未指定'}</p>
                      <p className="text-xs mt-1" style={{ color: '#a09890' }}>
                        {b.slots?.date} {b.slots?.start_time?.slice(0, 5)}–{b.slots?.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <span className="text-xs tracking-widest" style={{ color: s.color }}>{s.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
