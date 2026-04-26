'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, XCircle, AlertCircle, Calendar, User } from 'lucide-react'
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
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: slots } = await supabase
        .from('slots')
        .select('id')
        .eq('hairdresser_id', user.id)

      const slotIds = (slots || []).map((s: { id: string }) => s.id)

      if (slotIds.length > 0) {
        const { data } = await supabase
          .from('bookings')
          .select(`*, slots(*), profiles(id, name, avatar_url, role, created_at)`)
          .in('slot_id', slotIds)
          .order('created_at', { ascending: false })

        setRequests((data || []) as BookingRequest[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleConfirm = async (bookingId: string, slotId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)

    if (!error) {
      await supabase.from('slots').update({ status: 'booked' }).eq('id', slotId)
      setRequests(prev => prev.map(r => r.id === bookingId ? { ...r, status: 'confirmed' } : r))
    }
  }

  const handleCancel = async (bookingId: string, slotId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)

    if (!error) {
      await supabase.from('slots').update({ status: 'available' }).eq('id', slotId)
      setRequests(prev => prev.map(r => r.id === bookingId ? { ...r, status: 'cancelled' } : r))
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

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#0F172A' }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">予約リクエスト管理</h1>
        <p className="text-slate-400 mb-6">消費者からのリクエストを確認・管理できます</p>

        {requests.length === 0 ? (
          <div className="text-center py-20" style={{ background: '#1E293B', borderRadius: '1rem' }}>
            <AlertCircle size={40} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">まだリクエストはありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="rounded-2xl border border-slate-700 p-5" style={{ background: '#1E293B' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      {req.profiles?.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{req.profiles?.name || '不明'}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(req.created_at).toLocaleDateString('ja-JP')} リクエスト
                      </p>
                    </div>
                  </div>
                  {statusBadge(req.status)}
                </div>

                <div className="rounded-lg bg-slate-700/30 px-4 py-3 mb-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs mb-0.5">日時</p>
                    <p className="text-white">
                      {req.slots?.date} {req.slots?.start_time?.slice(0, 5)}〜{req.slots?.end_time?.slice(0, 5)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-0.5">メニュー</p>
                    <p className="text-white">{req.menu || '未指定'}</p>
                  </div>
                </div>

                {req.message && (
                  <p className="text-slate-400 text-sm mb-3 bg-slate-700/20 rounded-lg px-3 py-2">
                    「{req.message}」
                  </p>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCancel(req.id, req.slot_id)}
                      className="flex-1 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-all flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={14} />
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleConfirm(req.id, req.slot_id)}
                      className="flex-1 py-2 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
                    >
                      <CheckCircle size={14} />
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
