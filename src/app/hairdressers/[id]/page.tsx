'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MapPin, Link2, Calendar, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Hairdresser, Profile, Slot } from '@/types'

interface HairdresserWithProfile extends Hairdresser {
  profiles: Profile
}

const DAYS = ['日', '月', '火', '水', '木', '金', '土']

function getWeekDates(offset = 0) {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function HairdresserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [hairdresser, setHairdresser] = useState<HairdresserWithProfile | null>(null)
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [menu, setMenu] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const { data } = await supabase
        .from('hairdressers')
        .select('*, profiles(id, name, avatar_url, role, created_at)')
        .eq('id', id)
        .single()

      setHairdresser(data as HairdresserWithProfile)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    loadSlots()
  }, [id, weekOffset])

  useEffect(() => {
    // Realtime subscription for slot changes
    const channel = supabase
      .channel('slots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots', filter: `hairdresser_id=eq.${id}` }, () => {
        loadSlots()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, weekOffset])

  const loadSlots = async () => {
    const dates = getWeekDates(weekOffset)
    const from = dates[0].toISOString().split('T')[0]
    const to = dates[6].toISOString().split('T')[0]

    // Get hairdresser slots that overlap with any salon slot (available only)
    const { data: hdSlots } = await supabase
      .from('slots')
      .select('*')
      .eq('hairdresser_id', id)
      .eq('status', 'available')
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .order('start_time')

    setAvailableSlots(hdSlots || [])
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !currentUserId) {
      router.push('/login')
      return
    }

    setSubmitting(true)

    // Use RPC or transaction to prevent double booking
    const { error: updateError } = await supabase
      .from('slots')
      .update({ status: 'reserved' })
      .eq('id', selectedSlot.id)
      .eq('status', 'available') // optimistic lock

    if (updateError) {
      alert('この枠は既に予約済みです')
      setSubmitting(false)
      await loadSlots()
      return
    }

    const { error: bookingError } = await supabase.from('bookings').insert({
      slot_id: selectedSlot.id,
      consumer_id: currentUserId,
      menu,
      message,
      status: 'pending',
    })

    if (bookingError) {
      // Rollback
      await supabase.from('slots').update({ status: 'available' }).eq('id', selectedSlot.id)
      alert('予約に失敗しました: ' + bookingError.message)
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
    await loadSlots()
  }

  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availableSlots.filter(s => s.date === dateStr)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <Loader2 className="animate-spin text-blue-400" size={32} />
      </div>
    )
  }

  if (!hairdresser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <p className="text-slate-400">美容師が見つかりませんでした</p>
          <Link href="/search" className="text-blue-400 text-sm mt-2 inline-block">検索に戻る</Link>
        </div>
      </div>
    )
  }

  const dates = getWeekDates(weekOffset)

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: '#0F172A' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/search" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft size={16} />
          検索に戻る
        </Link>

        {/* Profile header */}
        <div className="rounded-2xl border border-slate-700 overflow-hidden mb-6" style={{ background: '#1E293B' }}>
          <div className="h-32 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2440)' }}>
            {hairdresser.profiles?.avatar_url ? (
              <img src={hairdresser.profiles.avatar_url} alt={hairdresser.profiles.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-500/30 flex items-center justify-center text-3xl font-bold text-blue-200">
                {hairdresser.profiles?.name?.[0] || '?'}
              </div>
            )}
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-white">{hairdresser.profiles?.name}</h1>
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <MapPin size={13} />
                  {hairdresser.area || '東京'}
                </div>
              </div>
              {hairdresser.instagram_url && (
                <a href={hairdresser.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors">
                  <Link2 size={16} />
                  Instagram
                </a>
              )}
            </div>

            {hairdresser.bio && (
              <p className="text-slate-300 text-sm leading-relaxed mb-4">{hairdresser.bio}</p>
            )}

            {hairdresser.menus && hairdresser.menus.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">メニュー・料金</h3>
                <div className="space-y-1">
                  {hairdresser.menus.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-700 last:border-0">
                      <span className="text-slate-200">{m.name}</span>
                      <span className="text-blue-400 font-medium">¥{m.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Availability calendar */}
        <div className="rounded-2xl border border-slate-700 overflow-hidden mb-6" style={{ background: '#1E293B' }}>
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-white">空き枠カレンダー</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setWeekOffset(w => w - 1)} className="p-1 rounded text-slate-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
              <span className="text-xs text-slate-400">
                {dates[0].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} 〜 {dates[6].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} className="p-1 rounded text-slate-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-700">
            {dates.map((date, i) => (
              <div key={i} className="px-1 py-2 text-center border-r border-slate-700 last:border-r-0">
                <div className={`text-xs ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{DAYS[date.getDay()]}</div>
                <div className={`text-sm font-bold mt-0.5 ${date.toDateString() === new Date().toDateString() ? 'text-blue-400' : 'text-white'}`}>{date.getDate()}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {dates.map((date, i) => {
              const slots = getSlotsForDate(date)
              return (
                <div key={i} className="border-r border-slate-700 last:border-r-0 min-h-[120px] p-1 space-y-1">
                  {slots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot === selectedSlot ? null : slot)}
                      className={`w-full rounded-lg border px-1 py-1.5 text-xs text-left transition-all ${
                        selectedSlot?.id === slot.id
                          ? 'border-blue-500 bg-blue-500/25 text-blue-200'
                          : 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                      }`}
                    >
                      <div className="font-medium text-center">{slot.start_time.slice(0, 5)}</div>
                      <div className="text-center opacity-70">〜{slot.end_time.slice(0, 5)}</div>
                    </button>
                  ))}
                  {slots.length === 0 && (
                    <div className="h-8 flex items-center justify-center text-slate-700 text-xs">-</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Booking form */}
        {submitted ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
            <h3 className="text-white font-bold text-lg mb-1">予約リクエストを送信しました</h3>
            <p className="text-slate-400 text-sm mb-4">美容師からの確認をお待ちください</p>
            <Link href="/bookings" className="text-blue-400 text-sm hover:text-blue-300">予約一覧を確認 →</Link>
          </div>
        ) : selectedSlot ? (
          <div className="rounded-2xl border border-slate-700 p-6" style={{ background: '#1E293B' }}>
            <h2 className="font-semibold text-white mb-4">予約リクエスト</h2>
            <div className="rounded-lg bg-slate-700/30 px-4 py-3 mb-4 text-sm">
              <div className="text-slate-300">
                <span className="font-medium text-white">{selectedSlot.date}</span>
                {' '}
                <span className="text-blue-400">{selectedSlot.start_time.slice(0, 5)}〜{selectedSlot.end_time.slice(0, 5)}</span>
              </div>
            </div>
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">ご希望メニュー</label>
                <select
                  value={menu}
                  onChange={(e) => setMenu(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                  style={{ background: '#0F172A' }}
                >
                  <option value="">選択してください</option>
                  {hairdresser.menus?.map((m, i) => (
                    <option key={i} value={m.name}>{m.name} ¥{m.price.toLocaleString()}</option>
                  ))}
                  <option value="その他">その他（メッセージに記入）</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">メッセージ（任意）</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="ご要望・ご質問など"
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  style={{ background: '#0F172A' }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 py-2.5 rounded-lg text-slate-300 border border-slate-600 text-sm"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  予約リクエストを送る
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-700/50 p-6 text-center text-slate-500" style={{ background: '#1E293B' }}>
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">上のカレンダーから空き枠を選択してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
