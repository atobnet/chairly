'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { Slot, Profile } from '@/types'

interface BookingRequest {
  id: string
  slot_id: string
  consumer_id: string
  menu: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  slots: Slot | null
  profiles: Profile | null
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<BookingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: slots } = await supabase.from('slots').select('id').eq('hairdresser_id', user.id)
      const slotIds = (slots || []).map((s: { id: string }) => s.id)

      if (slotIds.length > 0) {
        const { data } = await supabase.from('bookings')
          .select('*, slots(*), profiles(id, name, avatar_url, role, created_at)')
          .in('slot_id', slotIds)
          .order('created_at', { ascending: false })
        setRequests((data || []) as BookingRequest[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleConfirm = async (bookingId: string, slotId: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
    await supabase.from('slots').update({ status: 'booked' }).eq('id', slotId)
    setRequests(prev => prev.map(r => r.id === bookingId ? { ...r, status: 'confirmed' } : r))
  }

  const handleCancel = async (bookingId: string, slotId: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)
    await supabase.from('slots').update({ status: 'available' }).eq('id', slotId)
    setRequests(prev => prev.map(r => r.id === bookingId ? { ...r, status: 'cancelled' } : r))
  }

  const statusColor: Record<string, string> = { pending: '#c9b99a', confirmed: '#6b7c5c', cancelled: '#85403b' }
  const statusLabel: Record<string, string> = { pending: '確認待ち', confirmed: '確定', cancelled: 'キャンセル' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
      <Loader2 className="animate-spin" size={24} style={{ color: '#6b7c5c' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-16">
          <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>REQUESTS</p>
          <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>予約リクエスト</h1>
        </div>

        {requests.length === 0 ? (
          <div className="py-20 text-center border" style={{ borderColor: '#e2dcd4' }}>
            <p className="text-xs tracking-widest" style={{ color: '#a09890' }}>NO REQUESTS YET</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="border p-6" style={{ borderColor: '#e2dcd4' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#1a1410' }}>{req.profiles?.name || '不明'}</p>
                    <p className="text-xs mt-1" style={{ color: '#a09890' }}>
                      {new Date(req.created_at).toLocaleDateString('ja-JP')} リクエスト
                    </p>
                  </div>
                  <span className="text-xs tracking-widest" style={{ color: statusColor[req.status] }}>
                    {statusLabel[req.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-y" style={{ borderColor: '#ede9e2' }}>
                  <div>
                    <p className="text-xs tracking-widest mb-1" style={{ color: '#a09890' }}>DATE & TIME</p>
                    <p className="text-sm" style={{ color: '#1a1410' }}>
                      {req.slots?.date}　{req.slots?.start_time?.slice(0, 5)}–{req.slots?.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest mb-1" style={{ color: '#a09890' }}>MENU</p>
                    <p className="text-sm" style={{ color: '#1a1410' }}>{req.menu || '未指定'}</p>
                  </div>
                </div>

                {req.message && (
                  <p className="text-xs leading-relaxed mb-4 italic" style={{ color: '#6b6459' }}>
                    "{req.message}"
                  </p>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCancel(req.id, req.slot_id)}
                      className="flex-1 py-2.5 text-xs tracking-widest border transition-all hover:opacity-70"
                      style={{ borderColor: '#e2dcd4', color: '#85403b' }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleConfirm(req.id, req.slot_id)}
                      className="flex-1 py-2.5 text-xs tracking-widest border transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef]"
                      style={{ borderColor: '#1a1410', color: '#1a1410' }}
                    >
                      確認する
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
