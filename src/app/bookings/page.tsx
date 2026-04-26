'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
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
      if (!user) return
      const { data } = await supabase.from('bookings')
        .select('*, slots(date, start_time, end_time, hairdressers(profiles(name)))')
        .eq('consumer_id', user.id)
        .order('created_at', { ascending: false })
      setBookings((data || []) as BookingWithDetails[])
      setLoading(false)
    }
    load()
  }, [])

  const handleCancel = async (bookingId: string, slotId: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    await supabase.from('slots').update({ status: 'available' }).eq('id', slotId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
  }

  const statusStyle: Record<string, string> = {
    pending: '#c9b99a',
    confirmed: '#6b7c5c',
    cancelled: '#85403b',
  }
  const statusLabel: Record<string, string> = {
    pending: '確認待ち',
    confirmed: '確定',
    cancelled: 'キャンセル',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
      <Loader2 className="animate-spin" size={24} style={{ color: '#6b7c5c' }} />
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.status !== 'cancelled' && b.slots?.date && b.slots.date >= today)
  const past = bookings.filter(b => b.status === 'cancelled' || !b.slots?.date || b.slots.date < today)

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>MY BOOKINGS</p>
          <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>予約一覧</h1>
        </div>

        {bookings.length === 0 ? (
          <div className="py-20 text-center border" style={{ borderColor: '#e2dcd4' }}>
            <p className="text-xs tracking-widest mb-4" style={{ color: '#a09890' }}>NO BOOKINGS YET</p>
            <Link href="/search" className="text-xs underline underline-offset-4" style={{ color: '#6b7c5c' }}>美容師を探す →</Link>
          </div>
        ) : (
          <div className="space-y-16">
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>UPCOMING</p>
                <div className="border" style={{ borderColor: '#e2dcd4' }}>
                  {upcoming.map((b, i) => (
                    <div key={b.id} className="px-6 py-6" style={{ borderBottom: i < upcoming.length - 1 ? '1px solid #ede9e2' : 'none' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium mb-1" style={{ color: '#1a1410' }}>
                            {b.slots?.hairdressers?.profiles?.name || '美容師'}
                          </p>
                          <p className="text-xs" style={{ color: '#a09890' }}>
                            {b.slots?.date && new Date(b.slots.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}　{b.slots?.start_time?.slice(0, 5)}–{b.slots?.end_time?.slice(0, 5)}
                          </p>
                        </div>
                        <span className="text-xs tracking-widest" style={{ color: statusStyle[b.status] }}>
                          {statusLabel[b.status]}
                        </span>
                      </div>
                      {b.menu && <p className="text-xs mb-3" style={{ color: '#6b6459' }}>{b.menu}</p>}
                      {b.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(b.id, b.slot_id)}
                          className="text-xs underline underline-offset-4 transition-opacity hover:opacity-60"
                          style={{ color: '#85403b' }}
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
              <div className="opacity-50">
                <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>PAST</p>
                <div className="border" style={{ borderColor: '#e2dcd4' }}>
                  {past.map((b, i) => (
                    <div key={b.id} className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: i < past.length - 1 ? '1px solid #ede9e2' : 'none' }}>
                      <div>
                        <p className="text-sm" style={{ color: '#1a1410' }}>{b.slots?.hairdressers?.profiles?.name || '美容師'}</p>
                        <p className="text-xs mt-1" style={{ color: '#a09890' }}>{b.slots?.date}　{b.menu}</p>
                      </div>
                      <span className="text-xs tracking-widest" style={{ color: statusStyle[b.status] }}>{statusLabel[b.status]}</span>
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
