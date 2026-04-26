'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
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
      const { data } = await supabase.from('hairdressers').select('*, profiles(id, name, avatar_url, role, created_at)').eq('id', id).single()
      setHairdresser(data as HairdresserWithProfile)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => { loadSlots() }, [id, weekOffset])

  useEffect(() => {
    const channel = supabase.channel('slots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots', filter: `hairdresser_id=eq.${id}` }, () => loadSlots())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, weekOffset])

  const loadSlots = async () => {
    const dates = getWeekDates(weekOffset)
    const from = dates[0].toISOString().split('T')[0]
    const to = dates[6].toISOString().split('T')[0]
    const { data } = await supabase.from('slots').select('*').eq('hairdresser_id', id).eq('status', 'available').gte('date', from).lte('date', to).order('date').order('start_time')
    setAvailableSlots(data || [])
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !currentUserId) { router.push('/login'); return }
    setSubmitting(true)

    const { error: updateError } = await supabase.from('slots').update({ status: 'reserved' }).eq('id', selectedSlot.id).eq('status', 'available')
    if (updateError) { alert('この枠は既に予約済みです'); setSubmitting(false); await loadSlots(); return }

    const { error: bookingError } = await supabase.from('bookings').insert({ slot_id: selectedSlot.id, consumer_id: currentUserId, menu, message, status: 'pending' })
    if (bookingError) { await supabase.from('slots').update({ status: 'available' }).eq('id', selectedSlot.id); alert('予約に失敗しました'); setSubmitting(false); return }

    setSubmitted(true)
    setSubmitting(false)
    await loadSlots()
  }

  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return availableSlots.filter(s => s.date === dateStr)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
      <Loader2 className="animate-spin" size={24} style={{ color: '#6b7c5c' }} />
    </div>
  )

  if (!hairdresser) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
      <div className="text-center">
        <p className="text-xs tracking-widest mb-4" style={{ color: '#a09890' }}>NOT FOUND</p>
        <Link href="/search" className="text-xs underline underline-offset-4" style={{ color: '#6b7c5c' }}>← 検索に戻る</Link>
      </div>
    </div>
  )

  const dates = getWeekDates(weekOffset)
  const inputStyle = { background: 'transparent', borderColor: '#e2dcd4', color: '#1a1410' }

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/search" className="inline-flex items-center gap-1 text-xs tracking-widest mb-12 transition-opacity hover:opacity-60" style={{ color: '#a09890' }}>
          <ChevronLeft size={12} /> BACK
        </Link>

        {/* Profile */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          {/* Photo */}
          <div className="aspect-[4/5] flex items-center justify-center" style={{ background: '#f0ece4' }}>
            {hairdresser.profiles?.avatar_url ? (
              <img src={hairdresser.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="font-serif text-8xl mb-2" style={{ color: '#e2dcd4', fontWeight: 300 }}>{hairdresser.profiles?.name?.[0]}</div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>{hairdresser.area}</p>
            <h1 className="font-serif text-4xl mb-2" style={{ fontWeight: 300 }}>{hairdresser.profiles?.name}</h1>

            {hairdresser.instagram_url && (
              <a href={hairdresser.instagram_url} target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest mb-6 hover:opacity-60 transition-opacity" style={{ color: '#c9b99a' }}>
                INSTAGRAM →
              </a>
            )}

            <div className="w-8 h-px my-6" style={{ background: '#e2dcd4' }} />

            {hairdresser.bio && (
              <p className="text-sm leading-loose mb-8" style={{ color: '#6b6459', fontWeight: 300 }}>{hairdresser.bio}</p>
            )}

            {hairdresser.menus && hairdresser.menus.length > 0 && (
              <div>
                <p className="text-xs tracking-widest mb-4" style={{ color: '#a09890' }}>MENU & PRICE</p>
                <div className="space-y-2">
                  {hairdresser.menus.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2 border-b" style={{ borderColor: '#ede9e2' }}>
                      <span style={{ color: '#1a1410' }}>{m.name}</span>
                      <span style={{ color: '#6b7c5c' }}>¥{m.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <p className="text-xs tracking-[0.3em]" style={{ color: '#a09890' }}>AVAILABILITY</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setWeekOffset(w => w - 1)} className="w-7 h-7 border flex items-center justify-center transition-colors hover:bg-[#1a1410] hover:text-[#f7f4ef]" style={{ borderColor: '#e2dcd4', color: '#6b6459' }}>
                <ChevronLeft size={12} />
              </button>
              <span className="text-xs" style={{ color: '#6b6459' }}>
                {dates[0].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}–{dates[6].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => setWeekOffset(w => w + 1)} className="w-7 h-7 border flex items-center justify-center transition-colors hover:bg-[#1a1410] hover:text-[#f7f4ef]" style={{ borderColor: '#e2dcd4', color: '#6b6459' }}>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          <div className="border" style={{ borderColor: '#e2dcd4' }}>
            <div className="grid grid-cols-7 border-b" style={{ borderColor: '#e2dcd4' }}>
              {dates.map((date, i) => (
                <div key={i} className="py-3 text-center border-r last:border-r-0" style={{ borderColor: '#e2dcd4' }}>
                  <div className="text-xs mb-1" style={{ color: i === 0 ? '#85403b' : i === 6 ? '#6b7c5c' : '#a09890' }}>{DAYS[date.getDay()]}</div>
                  <div className="text-sm font-medium" style={{ color: date.toDateString() === new Date().toDateString() ? '#6b7c5c' : '#1a1410' }}>{date.getDate()}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {dates.map((date, i) => {
                const slots = getSlotsForDate(date)
                return (
                  <div key={i} className="min-h-[120px] p-1.5 space-y-1 border-r last:border-r-0" style={{ borderColor: '#e2dcd4' }}>
                    {slots.map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot === selectedSlot ? null : slot)}
                        className="w-full py-1.5 text-xs text-center border transition-all"
                        style={{
                          borderColor: selectedSlot?.id === slot.id ? '#1a1410' : '#c9b99a',
                          background: selectedSlot?.id === slot.id ? '#1a1410' : 'rgba(201,185,154,0.1)',
                          color: selectedSlot?.id === slot.id ? '#f7f4ef' : '#6b6459',
                        }}
                      >
                        {slot.start_time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Booking form */}
        {submitted ? (
          <div className="py-16 text-center border" style={{ borderColor: '#6b7c5c' }}>
            <p className="text-xs tracking-[0.3em] mb-4" style={{ color: '#6b7c5c' }}>REQUEST SENT</p>
            <h3 className="font-serif text-2xl mb-4" style={{ fontWeight: 300 }}>予約リクエストを送信しました</h3>
            <p className="text-xs mb-6" style={{ color: '#a09890' }}>美容師からの確認をお待ちください</p>
            <Link href="/bookings" className="text-xs underline underline-offset-4" style={{ color: '#6b7c5c' }}>予約一覧を確認 →</Link>
          </div>
        ) : selectedSlot ? (
          <div className="border p-8" style={{ borderColor: '#e2dcd4' }}>
            <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>BOOK APPOINTMENT</p>

            <div className="mb-6 py-4 border-y" style={{ borderColor: '#ede9e2' }}>
              <p className="text-sm" style={{ color: '#1a1410' }}>
                {selectedSlot.date}　{selectedSlot.start_time.slice(0, 5)}–{selectedSlot.end_time.slice(0, 5)}
              </p>
            </div>

            <form onSubmit={handleBooking} className="space-y-5">
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>MENU</label>
                <select value={menu} onChange={(e) => setMenu(e.target.value)} required className="w-full px-4 py-3 text-sm border focus:outline-none" style={inputStyle}>
                  <option value="">選択してください</option>
                  {hairdresser.menus?.map((m, i) => (
                    <option key={i} value={m.name}>{m.name} — ¥{m.price.toLocaleString()}</option>
                  ))}
                  <option value="その他">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>MESSAGE (任意)</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="ご要望・ご質問など" className="w-full px-4 py-3 text-sm border focus:outline-none resize-none" style={inputStyle} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedSlot(null)} className="flex-1 py-3 text-xs tracking-widest border transition-all" style={{ borderColor: '#e2dcd4', color: '#a09890' }}>
                  キャンセル
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 text-xs tracking-widest border transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef] disabled:opacity-50 flex items-center justify-center gap-2" style={{ borderColor: '#1a1410', color: '#1a1410' }}>
                  {submitting && <Loader2 size={12} className="animate-spin" />}
                  予約リクエストを送る
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-12 text-center border" style={{ borderColor: '#e2dcd4' }}>
            <p className="text-xs tracking-widest" style={{ color: '#c9b99a' }}>カレンダーから空き枠を選択してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
