'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

interface BookingWithDetails {
  id: string
  slot_id: string | null
  hairdresser_availability_id: string | null
  salon_availability_id: string | null
  salon_id: string | null
  consumer_id: string
  menu: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  booked_date: string | null
  booked_start_time: string | null
  booked_end_time: string | null
  created_at: string
  // new schema relations
  hairdresser_availability?: {
    hairdresser_id: string
    date: string
    start_time: string
    end_time: string
    profiles?: { name: string } | null
  } | null
  salons?: { profiles?: { name: string } } | null
  // old schema compat
  slots?: {
    date: string
    start_time: string
    end_time: string
    hairdressers?: { profiles?: { name: string } } | null
  } | null
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data, error } = await supabase.from('bookings')
        .select(`
          *,
          hairdresser_availability(
            hairdresser_id, date, start_time, end_time,
            profiles!hairdresser_id(name)
          ),
          salons(profiles(name)),
          slots(date, start_time, end_time, hairdressers(profiles(name)))
        `)
        .eq('consumer_id', user.id)
        .order('created_at', { ascending: false })
      if (error) console.error('bookings query error:', error)
      setBookings((data || []) as BookingWithDetails[])
      setLoading(false)
    }
    load()
  }, [])

  const handleCancel = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
  }

  // Helper: 日付と時間を取得（新旧スキーマ対応）
  const getBookingDate = (b: BookingWithDetails): string => {
    if (b.booked_date) return b.booked_date
    if (b.hairdresser_availability?.date) return b.hairdresser_availability.date
    return b.slots?.date || ''
  }

  const getBookingTime = (b: BookingWithDetails): string => {
    if (b.booked_start_time && b.booked_end_time) {
      return `${b.booked_start_time.slice(0, 5)}–${b.booked_end_time.slice(0, 5)}`
    }
    if (b.slots?.start_time) {
      return `${b.slots.start_time.slice(0, 5)}–${b.slots.end_time.slice(0, 5)}`
    }
    return ''
  }

  const getHairdresserName = (b: BookingWithDetails): string => {
    return b.hairdresser_availability?.profiles?.name
      || b.slots?.hairdressers?.profiles?.name
      || '美容師'
  }

  const getSalonName = (b: BookingWithDetails): string | null => {
    return b.salons?.profiles?.name || null
  }

  const statusLabel: Record<string, string> = {
    pending: '確認待ち',
    confirmed: '確定',
    cancelled: 'キャンセル',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.status !== 'cancelled' && getBookingDate(b) >= today)
  const past = bookings.filter(b => b.status === 'cancelled' || getBookingDate(b) < today)

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-16">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>MY BOOKINGS</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>予約一覧</h1>
        </div>

        {bookings.length === 0 ? (
          <div style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center', border: '1px solid #ebebeb' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1rem', fontWeight: 300 }}>NO BOOKINGS YET</p>
            <Link href="/search" style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, borderBottom: '1px solid #999999', textDecoration: 'none', paddingBottom: '2px', letterSpacing: '0.04em' }}>
              美容師を探す →
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {upcoming.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>UPCOMING</p>
                <div style={{ border: '1px solid #ebebeb' }}>
                  {upcoming.map((b, i) => (
                    <div key={b.id} className="px-6 py-6" style={{ borderBottom: i < upcoming.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300, marginBottom: '0.25rem' }}>
                            {getHairdresserName(b)}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300 }}>
                            {getBookingDate(b) && new Date(getBookingDate(b)).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                            　{getBookingTime(b)}
                          </p>
                          {getSalonName(b) && (
                            <p style={{ fontSize: '0.7rem', color: '#cccccc', marginTop: '0.125rem', fontWeight: 300 }}>{getSalonName(b)}</p>
                          )}
                        </div>
                        <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#999999', fontWeight: 300 }}>
                          {statusLabel[b.status]}
                        </span>
                      </div>
                      {b.menu && <p style={{ fontSize: '0.75rem', marginBottom: '0.75rem', color: '#999999', fontWeight: 300 }}>{b.menu}</p>}
                      {b.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, background: 'none', border: 'none', borderBottom: '1px solid #999999', padding: '0 0 2px 0', cursor: 'pointer', letterSpacing: '0.04em' }}
                        >
                          キャンセルする
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div style={{ opacity: 0.5 }}>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>PAST</p>
                <div style={{ border: '1px solid #ebebeb' }}>
                  {past.map((b, i) => (
                    <div key={b.id} className="px-6 py-5 flex items-center justify-between"
                      style={{ borderBottom: i < past.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                      <div>
                        <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{getHairdresserName(b)}</p>
                        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#999999', fontWeight: 300 }}>
                          {getBookingDate(b)}　{b.menu}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#999999', fontWeight: 300 }}>{statusLabel[b.status]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
