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
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase.from('profiles').select('role, name, stripe_account_id').eq('id', user.id).single()
      if (!profile) { setLoading(false); return }
      setRole(profile.role as UserRole)
      setName(profile.name)
      setStripeAccountId(profile.stripe_account_id || null)

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
          .select('*, slots(*, hairdressers(profiles(name, id, role, avatar_url, created_at))), profiles!consumer_id(name, id, role, avatar_url, created_at)')
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

        {/* Stripe Connect バナー（美容師・サロンのみ） */}
        {(role === 'hairdresser' || role === 'salon') && !stripeAccountId && (
          <div style={{ padding: '1.25rem 1.5rem', border: '1px solid #e5c97e', background: '#fffbf0', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#c9a84c', fontWeight: 300, marginBottom: '0.25rem' }}>ACTION REQUIRED</p>
              <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>報酬を受け取るにはStripe口座の連携が必要です</p>
            </div>
            <button
              onClick={async () => {
                setConnectingStripe(true)
                try {
                  const res = await fetch('/api/stripe/connect', { method: 'POST' })
                  const data = await res.json()
                  if (!res.ok || !data.url) {
                    alert('Stripe連携の開始に失敗しました。しばらく後に再試行してください。')
                    setConnectingStripe(false)
                    return
                  }
                  window.location.href = data.url
                } catch {
                  alert('ネットワークエラーが発生しました。')
                  setConnectingStripe(false)
                }
              }}
              disabled={connectingStripe}
              style={{ padding: '0.5rem 1.25rem', background: '#111111', color: '#ffffff', border: 'none', cursor: connectingStripe ? 'not-allowed' : 'pointer', fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: 300, opacity: connectingStripe ? 0.5 : 1, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {connectingStripe ? '接続中...' : 'Stripe口座を連携する'}
            </button>
          </div>
        )}
        {(role === 'hairdresser' || role === 'salon') && stripeAccountId && (
          <div style={{ padding: '0.75rem 1.5rem', border: '1px solid #d4edda', background: '#f8fff9', marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.7rem', color: '#4a7c59', fontWeight: 300, letterSpacing: '0.1em' }}>Stripe口座連携済み ✓</p>
          </div>
        )}

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
