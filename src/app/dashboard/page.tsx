'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole, Booking, Slot, Profile } from '@/types'
import { Calendar, Clock, User, TrendingUp, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface BookingWithDetails extends Booking {
  slots: Slot & {
    hairdressers?: { profiles: Profile } | null
    salons?: { profiles: Profile } | null
  }
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single()

      if (!profile) return
      setRole(profile.role as UserRole)
      setName(profile.name)

      if (profile.role === 'hairdresser') {
        // Get upcoming bookings for hairdresser via their slots
        const { data: slotData } = await supabase
          .from('slots')
          .select('id')
          .eq('hairdresser_id', user.id)

        const slotIds = (slotData || []).map((s: { id: string }) => s.id)
        if (slotIds.length > 0) {
          const { data } = await supabase
            .from('bookings')
            .select(`*, slots(*, hairdressers(profiles(name))), profiles(name)`)
            .in('slot_id', slotIds)
            .gte('slots.date', new Date().toISOString().split('T')[0])
            .order('created_at', { ascending: false })
            .limit(10)
          setBookings((data || []) as BookingWithDetails[])
        }
      } else if (profile.role === 'salon') {
        const { data: slotData } = await supabase
          .from('slots')
          .select('id')
          .eq('salon_id', user.id)

        const slotIds = (slotData || []).map((s: { id: string }) => s.id)
        if (slotIds.length > 0) {
          const { data } = await supabase
            .from('bookings')
            .select(`*, slots(*), profiles(name)`)
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })
            .limit(10)
          setBookings((data || []) as BookingWithDetails[])
        }
      } else {
        // consumer
        const { data } = await supabase
          .from('bookings')
          .select(`*, slots(*, hairdressers(profiles(name))), profiles(name)`)
          .eq('consumer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        setBookings((data || []) as BookingWithDetails[])
      }

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <Loader2 className="animate-spin text-blue-400" size={32} />
      </div>
    )
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: '確認待ち', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: <AlertCircle size={12} /> },
      confirmed: { label: '確定', color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: <CheckCircle size={12} /> },
      cancelled: { label: 'キャンセル', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: <XCircle size={12} /> },
    }
    const s = map[status] || map.pending
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${s.color}`}>
        {s.icon}{s.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#0F172A' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
          <p className="text-slate-400 mt-1">こんにちは、{name} さん</p>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {role === 'consumer' && (
            <>
              <QuickCard href="/search" icon={<User size={18} className="text-blue-400" />} title="美容師を探す" desc="エリア・メニューで検索" />
              <QuickCard href="/bookings" icon={<Calendar size={18} className="text-blue-400" />} title="予約一覧" desc="予約履歴を確認" />
            </>
          )}
          {role === 'hairdresser' && (
            <>
              <QuickCard href="/schedule" icon={<Calendar size={18} className="text-blue-400" />} title="スケジュール" desc="空き枠を管理" />
              <QuickCard href="/requests" icon={<AlertCircle size={18} className="text-blue-400" />} title="リクエスト" desc="予約申請を確認" />
              <QuickCard href="/profile/edit" icon={<User size={18} className="text-blue-400" />} title="プロフィール" desc="情報を編集" />
            </>
          )}
          {role === 'salon' && (
            <>
              <QuickCard href="/slots" icon={<Calendar size={18} className="text-blue-400" />} title="空き枠管理" desc="スロットを管理" />
              <QuickCard href="/space/edit" icon={<TrendingUp size={18} className="text-blue-400" />} title="スペース編集" desc="スペース情報を更新" />
            </>
          )}
        </div>

        {/* Bookings */}
        <div className="rounded-2xl border border-slate-700 overflow-hidden" style={{ background: '#1E293B' }}>
          <div className="px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white">
              {role === 'hairdresser' ? '最近の予約リクエスト' : role === 'salon' ? '最近の利用予約' : '最近の予約'}
            </h2>
          </div>
          {bookings.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-500">
              <Clock size={32} className="mx-auto mb-3 opacity-40" />
              <p>まだ予約はありません</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {bookings.map((b) => (
                <div key={b.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white font-medium">
                      {b.menu || '未指定'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {b.slots?.date} {b.slots?.start_time?.slice(0, 5)}〜{b.slots?.end_time?.slice(0, 5)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {role === 'hairdresser' ? `顧客: ${b.profiles?.name}` : ''}
                    </p>
                  </div>
                  {statusBadge(b.status)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-700 p-4 flex items-center gap-3 hover:border-blue-500/50 transition-all group" style={{ background: '#0F172A' }}>
      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-white text-sm font-medium">{title}</p>
        <p className="text-slate-500 text-xs">{desc}</p>
      </div>
    </Link>
  )
}
