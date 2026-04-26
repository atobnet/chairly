'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Slot } from '@/types'

const DAYS = ['日', '月', '火', '水', '木', '金', '土']
const TIMES = Array.from({ length: 28 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

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

export default function SlotsPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [slots, setSlots] = useState<Slot[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => { if (userId) loadSlots(userId) }, [weekOffset, userId])

  const loadSlots = async (uid: string) => {
    const dates = getWeekDates(weekOffset)
    const from = dates[0].toISOString().split('T')[0]
    const to = dates[6].toISOString().split('T')[0]
    const { data } = await supabase.from('slots').select('*').eq('salon_id', uid).gte('date', from).lte('date', to).order('date').order('start_time')
    setSlots(data || [])
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !selectedDate) return
    setSaving(true)
    await supabase.from('slots').insert({ salon_id: userId, date: selectedDate, start_time: startTime + ':00', end_time: endTime + ':00', status: 'available' })
    await loadSlots(userId)
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (slotId: string) => {
    if (!userId) return
    await supabase.from('slots').delete().eq('id', slotId).eq('salon_id', userId)
    setSlots(prev => prev.filter(s => s.id !== slotId))
  }

  const dates = getWeekDates(weekOffset)
  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return slots.filter(s => s.date === dateStr)
  }

  const statusStyle: Record<string, { border: string; bg: string; color: string }> = {
    available: { border: '#e2dcd4', bg: 'rgba(240,236,228,0.5)', color: '#6b6459' },
    reserved: { border: '#c9b99a', bg: 'rgba(201,185,154,0.1)', color: '#c9b99a' },
    booked: { border: '#6b7c5c', bg: 'rgba(107,124,92,0.08)', color: '#6b7c5c' },
  }

  const selectStyle = { background: 'transparent', borderColor: '#e2dcd4', color: '#1a1410' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f4ef' }}>
      <Loader2 className="animate-spin" size={24} style={{ color: '#6b7c5c' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#f7f4ef' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-16">
          <div>
            <p className="text-xs tracking-[0.3em] mb-3" style={{ color: '#a09890' }}>SLOT MANAGEMENT</p>
            <h1 className="font-serif text-4xl" style={{ fontWeight: 300 }}>空き枠管理</h1>
          </div>
          <button
            onClick={() => { setSelectedDate(dates[0].toISOString().split('T')[0]); setShowModal(true) }}
            className="flex items-center gap-2 px-5 py-2.5 border text-xs tracking-widest transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef]"
            style={{ borderColor: '#1a1410', color: '#1a1410' }}
          >
            <Plus size={12} />
            空き枠を追加
          </button>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 border flex items-center justify-center transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef]" style={{ borderColor: '#e2dcd4', color: '#6b6459' }}>
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs tracking-widest" style={{ color: '#6b6459' }}>
            {dates[0]?.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} — {dates[6]?.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 border flex items-center justify-center transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef]" style={{ borderColor: '#e2dcd4', color: '#6b6459' }}>
            <ChevronRight size={14} />
          </button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-xs underline underline-offset-4" style={{ color: '#6b7c5c' }}>今週</button>}
        </div>

        {/* Calendar */}
        <div className="border" style={{ borderColor: '#e2dcd4' }}>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: '#e2dcd4' }}>
            {dates.map((date, i) => (
              <div key={i} className="py-3 text-center border-r last:border-r-0" style={{ borderColor: '#e2dcd4' }}>
                <div className="text-xs mb-1" style={{ color: i === 0 ? '#85403b' : i === 6 ? '#6b7c5c' : '#a09890' }}>{DAYS[date.getDay()]}</div>
                <div className="text-sm" style={{ color: '#1a1410' }}>{date.getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dates.map((date, i) => {
              const daySlots = getSlotsForDate(date)
              return (
                <div key={i} className="min-h-[180px] p-1.5 space-y-1 border-r last:border-r-0" style={{ borderColor: '#e2dcd4' }}>
                  {daySlots.map(slot => {
                    const ss = statusStyle[slot.status] || statusStyle.available
                    return (
                      <div key={slot.id} className="group relative px-2 py-1.5 text-xs border" style={{ borderColor: ss.border, background: ss.bg, color: ss.color }}>
                        {slot.start_time.slice(0, 5)}
                        {slot.status === 'available' && (
                          <button onClick={() => handleDelete(slot.id)} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100">
                            <Trash2 size={9} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  <button onClick={() => { setSelectedDate(date.toISOString().split('T')[0]); setShowModal(true) }} className="w-full py-1 border border-dashed text-xs" style={{ borderColor: '#ede9e2', color: '#c9b99a' }}>
                    <Plus size={10} className="mx-auto" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-6 mt-4 text-xs" style={{ color: '#a09890' }}>
          <span>空き</span>
          <span style={{ color: '#c9b99a' }}>仮予約</span>
          <span style={{ color: '#6b7c5c' }}>予約済</span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(26,20,16,0.5)' }}>
          <div className="w-full max-w-sm p-8 border" style={{ background: '#f7f4ef', borderColor: '#e2dcd4' }}>
            <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>ADD SLOT</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>DATE</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 text-sm border focus:outline-none bg-transparent" style={selectStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>START</label>
                  <select value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 text-sm border focus:outline-none" style={selectStyle}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>END</label>
                  <select value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 text-sm border focus:outline-none" style={selectStyle}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-xs border" style={{ borderColor: '#e2dcd4', color: '#a09890' }}>キャンセル</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 text-xs border transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef] disabled:opacity-50 flex items-center justify-center gap-2" style={{ borderColor: '#1a1410', color: '#1a1410' }}>
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
