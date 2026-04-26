'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, XCircle, AlertCircle, Calendar, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface BookingWithDetails {
  id: string
  slot_id: string
  consumer_id: string
  menu: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  slots: {
    date: string
    start_time: string
    end_time: string
    hairdressers?: {
      profiles?: { name: string }
    } | null
  } | null
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          slots(
            date,
            start_time,
            end_time,
            hairdressers(profiles(name))
          )
        `)
        .eq('consumer_id', user.id)
        .order('created_at', { ascending: false })

      setBookings((data || []) as BookingWithDetails[])
      setLoading(false)
    }
    load()
  }, [])

  const handleCancel = async (bookingId: string, slotId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)

    if (!error) {
      await supabase.from('slots').update({ status: 'available' }).eq('id', slotId)
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: '確認待ち', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: <AlertCircle size={12} /> },
      confirmed: { label: '確定', color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: <CheckCircle size={12} /> },
      cancelled: { label: 'キャンセル', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: <XCircle size={12} /> },
    }
    const s = map[status] || map.pending
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${s.color}`}>
        {s.icon}{s.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <Loader2 className="animate-spin text-blue-400" size={32} />
      </div>
    )
  }

  const upcoming = bookings.filter(b => {
    if (b.status === 'cancelled') return false
    const slotDate = b.slots?.date
    if (!slotDate) return false
    return slotDate >= new Date().toISOString().split('T')[0]
  })
  const past = bookings.filter(b => {
    const slotDate = b.slots?.date
    if (!slotDate) return true
    return slotDate < new Date().toISOString().split('T')[0] || b.status === 'cancelled'
  })

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#0F172A' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">予約一覧</h1>
        <p className="text-slate-400 mb-6">予約の確認とキャンセルができます</p>

        {bookings.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-slate-700" style={{ background: '#1E293B' }}>
            <Calendar size={40} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 mb-4">まだ予約はありません</p>
            <Link href="/search" className="inline-flex items-center gap-1 text-blue-400 text-sm hover:text-blue-300">
              美容師を探す <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">今後の予約</h2>
                <div className="space-y-3">
                  {upcoming.map(b => (
                    <BookingCard key={b.id} booking={b} statusBadge={statusBadge} onCancel={handleCancel} />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">過去の予約</h2>
                <div className="space-y-3 opacity-60">
                  {past.map(b => (
                    <BookingCard key={b.id} booking={b} statusBadge={statusBadge} onCancel={handleCancel} past />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BookingCard({
  booking,
  statusBadge,
  onCancel,
  past = false,
}: {
  booking: BookingWithDetails
  statusBadge: (status: string) => React.ReactNode
  onCancel: (bookingId: string, slotId: string) => void
  past?: boolean
}) {
  const hairdresserName = booking.slots?.hairdressers?.profiles?.name

  return (
    <div className="rounded-2xl border border-slate-700 p-5" style={{ background: '#1E293B' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-semibold">{hairdresserName || '美容師名未設定'}</p>
          <p className="text-slate-400 text-sm mt-0.5">
            {booking.slots?.date && new Date(booking.slots.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
            {' '}
            {booking.slots?.start_time?.slice(0, 5)}〜{booking.slots?.end_time?.slice(0, 5)}
          </p>
        </div>
        {statusBadge(booking.status)}
      </div>

      {booking.menu && (
        <div className="text-sm text-slate-300 bg-slate-700/30 rounded-lg px-3 py-2 mb-3">
          メニュー: <span className="font-medium text-white">{booking.menu}</span>
        </div>
      )}

      {booking.message && (
        <p className="text-slate-400 text-xs mb-3">「{booking.message}」</p>
      )}

      {!past && booking.status === 'pending' && (
        <button
          onClick={() => onCancel(booking.id, booking.slot_id)}
          className="text-xs text-red-400 hover:text-red-300 transition-colors border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          キャンセルする
        </button>
      )}
    </div>
  )
}
