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
      try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase.from('profiles').select('role, name').eq('id', user.id).single()
      if (!profile) { setLoading(false); return }
      setRole(profile.role as UserRole)
      setName(profile.name)

      if (profile.role === 'hairdresser') {
        const { data: slotData } = await supabase.from('slots').select('id').eq('hairdresser_id', user.id)
        const slotIds = (slotData || []).map((s: { id: string }) => s.id)
        if (slotIds.length > 0) {
          const { data } = await supabase.from('bookings')
            .select('*, slots(*), profiles!consumer_id(name, id, role, avatar_url, created_at)')
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
            .select('*, slots(*), profiles!consumer_id(name, id, role, avatar_url, created_at)')
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })
            .limit(8)
          setBookings((data || []) as BookingWithDetails[])
        }
      } else {
        const { data } = await supabase.from('bookings')
          .select('*, slots(*, hairdressers(profiles!consumer_id(name, id, role, avatar_url, created_at))), profiles!consumer_id(name, id, role, avatar_url, created_at)')
          .eq('consumer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8)
        setBookings((data || []) as BookingWithDetails[])
      }
      setLoading(false)
      } catch { setLoading(false) }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
        <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
      </div>
    )
  }

  const statusLabel: Record<string, string> = {
    pending: '確認待ち',
    confirmed: '確定',
    cancelled: 'キャンセル',
  }

  const quickLinks = role === 'consumer'
    ? [{ href: '/search', label: '美容師を探す', sub: 'FIND ARTISTS' }, { href: '/bookings', label: '予約一覧', sub: 'MY BOOKINGS' }]
    : role === 'hairdresser'
    ? [{ href: '/schedule', label: 'スケジュール', sub: 'SCHEDULE' }, { href: '/requests', label: 'リクエスト', sub: 'REQUESTS' }, { href: '/profile/edit', label: 'プロフィール', sub: 'PROFILE' }]
    : [{ href: '/slots', label: '空き枠管理', sub: 'SLOTS' }, { href: '/space/edit', label: 'スペース編集', sub: 'SPACE' }]

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-16">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>DASHBOARD</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>
            こんにちは、{name}
          </h1>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 mb-16" style={{ border: '1px solid #ebebeb' }}>
          {quickLinks.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className="p-8 group"
              style={{
                borderRight: i < quickLinks.length - 1 ? '1px solid #ebebeb' : 'none',
                background: 'transparent',
                display: 'block',
                textDecoration: 'none',
              }}
            >
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>{l.sub}</p>
              <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{l.label}</p>
              <p style={{ fontSize: '0.75rem', marginTop: '0.75rem', color: '#999999', fontWeight: 300 }}>→</p>
            </Link>
          ))}
        </div>

        {/* Bookings */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 100, color: '#111111', marginBottom: '1.5rem', letterSpacing: '0.04em' }}>最近の予約</h2>

          {bookings.length === 0 ? (
            <div style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center', border: '1px solid #ebebeb' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', fontWeight: 300 }}>NO BOOKINGS YET</p>
              {role === 'consumer' && (
                <Link
                  href="/search"
                  style={{
                    display: 'inline-block',
                    marginTop: '1rem',
                    fontSize: '0.75rem',
                    color: '#999999',
                    fontWeight: 300,
                    borderBottom: '1px solid #999999',
                    textDecoration: 'none',
                    paddingBottom: '2px',
                    letterSpacing: '0.04em',
                  }}
                >
                  美容師を探す →
                </Link>
              )}
            </div>
          ) : (
            <div style={{ border: '1px solid #ebebeb' }}>
              {bookings.map((b, i) => (
                <div
                  key={b.id}
                  className="px-6 py-5 flex items-center justify-between gap-4"
                  style={{ borderBottom: i < bookings.length - 1 ? '1px solid #ebebeb' : 'none' }}
                >
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{b.menu || '未指定'}</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#999999', fontWeight: 300 }}>
                      {b.slots?.date} {b.slots?.start_time?.slice(0, 5)}–{b.slots?.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#999999', fontWeight: 300 }}>
                    {statusLabel[b.status] || statusLabel.pending}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
