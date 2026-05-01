'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { Profile } from '@/types'

interface BookingRequest {
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
  profiles: Profile | null
  hairdresser_availability?: {
    date: string
    start_time: string
    end_time: string
  } | null
  slots?: {
    date: string
    start_time: string
    end_time: string
  } | null
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 新スキーマ: hairdresser_availability から自分のものを取得
      const { data: myAvail } = await supabase
        .from('hairdresser_availability')
        .select('id')
        .eq('hairdresser_id', user.id)

      const availIds = (myAvail || []).map((a: { id: string }) => a.id)

      // 旧スキーマ: slots から取得
      const { data: slots } = await supabase.from('slots').select('id').eq('hairdresser_id', user.id)
      const slotIds = (slots || []).map((s: { id: string }) => s.id)

      const conditions = []
      if (availIds.length > 0) conditions.push(`hairdresser_availability_id.in.(${availIds.join(',')})`)
      if (slotIds.length > 0) conditions.push(`slot_id.in.(${slotIds.join(',')})`)

      if (conditions.length > 0) {
        const { data, error } = await supabase.from('bookings')
          .select(`
            *,
            profiles!consumer_id(id, name, avatar_url, role, created_at),
            hairdresser_availability(date, start_time, end_time),
            slots(date, start_time, end_time)
          `)
          .or(conditions.join(','))
          .order('created_at', { ascending: false })
        if (error) console.error('requests query error:', error)
        setRequests((data || []) as BookingRequest[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleCancel = async (bookingId: string) => {
    fetch('/api/notify/booking-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    }).catch(console.error)
    await fetch('/api/stripe/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, cancelledBy: 'hairdresser' }),
    })
    const req = requests.find(r => r.id === bookingId)
    if (req?.slot_id) {
      await supabase.from('slots').update({ status: 'available' }).eq('id', req.slot_id)
    }
    setRequests(prev => prev.map(r => r.id === bookingId ? { ...r, status: 'cancelled' } : r))
  }

  const getDate = (r: BookingRequest): string => {
    if (r.booked_date) return r.booked_date
    if (r.hairdresser_availability?.date) return r.hairdresser_availability.date
    return r.slots?.date || ''
  }

  const getTime = (r: BookingRequest): string => {
    if (r.booked_start_time && r.booked_end_time) {
      return `${r.booked_start_time.slice(0, 5)}–${r.booked_end_time.slice(0, 5)}`
    }
    if (r.hairdresser_availability?.start_time) {
      return `${r.hairdresser_availability.start_time.slice(0, 5)}–${r.hairdresser_availability.end_time.slice(0, 5)}`
    }
    if (r.slots?.start_time) {
      return `${r.slots.start_time.slice(0, 5)}–${r.slots.end_time.slice(0, 5)}`
    }
    return ''
  }

  const statusLabel: Record<string, string> = { pending: '決済待ち', confirmed: '確定', cancelled: 'キャンセル' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-16">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>REQUESTS</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>予約リクエスト</h1>
        </div>

        {requests.length === 0 ? (
          <div style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center', border: '1px solid #ebebeb' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', fontWeight: 300 }}>NO REQUESTS YET</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} style={{ border: '1px solid #ebebeb', padding: '1.5rem' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{req.profiles?.name || '不明'}</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#999999', fontWeight: 300 }}>
                      {new Date(req.created_at).toLocaleDateString('ja-JP')} リクエスト
                    </p>
                  </div>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#999999', fontWeight: 300 }}>
                    {statusLabel[req.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 py-4" style={{ borderTop: '1px solid #ebebeb', borderBottom: '1px solid #ebebeb' }}>
                  <div>
                    <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.375rem', fontWeight: 300 }}>DATE & TIME</p>
                    <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>
                      {getDate(req)}　{getTime(req)}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.375rem', fontWeight: 300 }}>MENU</p>
                    <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{req.menu || '未指定'}</p>
                  </div>
                </div>

                {req.message && (
                  <p style={{ fontSize: '0.75rem', lineHeight: '1.6', marginBottom: '1rem', color: '#999999', fontWeight: 300, fontStyle: 'italic' }}>
                    "{req.message}"
                  </p>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-3">
                    <button onClick={() => handleCancel(req.id)}
                      style={{ flex: 1, padding: '0.625rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #ebebeb', color: '#999999', background: 'transparent', cursor: 'pointer', fontWeight: 300 }}>
                      キャンセル
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
