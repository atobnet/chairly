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

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [mySlots, setMySlots] = useState<Slot[]>([])
  const [salonSlots, setSalonSlots] = useState<Slot[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadSlots(user.id)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (userId) loadSlots(userId)
  }, [weekOffset, userId])

  const loadSlots = async (uid: string) => {
    const dates = getWeekDates(weekOffset)
    const from = dates[0].toISOString().split('T')[0]
    const to = dates[6].toISOString().split('T')[0]

    const [{ data: mine }, { data: salon }] = await Promise.all([
      supabase.from('slots').select('*').eq('hairdresser_id', uid).gte('date', from).lte('date', to).order('date').order('start_time'),
      supabase.from('slots').select('*').eq('salon_id', uid).gte('date', from).lte('date', to).order('date').order('start_time'),
    ])

    setMySlots(mine || [])
    setSalonSlots(salon || [])
  }

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !selectedDate) return
    setSaving(true)

    const { error } = await supabase.from('slots').insert({
      hairdresser_id: userId,
      date: selectedDate,
      start_time: startTime + ':00',
      end_time: endTime + ':00',
      status: 'available',
    })

    if (!error) {
      await loadSlots(userId)
      setShowAddModal(false)
    }
    setSaving(false)
  }

  const handleDelete = async (slotId: string) => {
    if (!userId) return
    await supabase.from('slots').delete().eq('id', slotId).eq('hairdresser_id', userId)
    setMySlots(prev => prev.filter(s => s.id !== slotId))
  }

  const dates = getWeekDates(weekOffset)

  const getSlotsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const mine = mySlots.filter(s => s.date === dateStr)
    const salon = salonSlots.filter(s => s.date === dateStr)
    return { mine, salon }
  }

  const isOverlapping = (mySlot: Slot, salonSlot: Slot) => {
    return mySlot.start_time < salonSlot.end_time && mySlot.end_time > salonSlot.start_time
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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">スケジュール管理</h1>
            <p className="text-slate-400 text-sm mt-1">自分の空き枠を設定します</p>
          </div>
          <button
            onClick={() => { setSelectedDate(dates[0].toISOString().split('T')[0]); setShowAddModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
          >
            <Plus size={16} />
            空き枠を追加
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-300 font-medium">
            {dates[0]?.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} 〜 {dates[6]?.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
            <ChevronRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-400 hover:text-blue-300">今週</button>
          )}
        </div>

        {/* Calendar */}
        <div className="rounded-2xl border border-slate-700 overflow-hidden" style={{ background: '#1E293B' }}>
          <div className="grid grid-cols-7 border-b border-slate-700">
            {dates.map((date, i) => (
              <div key={i} className={`px-2 py-3 text-center border-r border-slate-700 last:border-r-0 ${date.toDateString() === new Date().toDateString() ? 'bg-blue-500/10' : ''}`}>
                <div className={`text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{DAYS[date.getDay()]}</div>
                <div className={`text-sm font-bold mt-0.5 ${date.toDateString() === new Date().toDateString() ? 'text-blue-400' : 'text-white'}`}>
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {dates.map((date, i) => {
              const { mine, salon } = getSlotsForDate(date)
              return (
                <div key={i} className="border-r border-slate-700 last:border-r-0 min-h-[200px] p-1.5 space-y-1">
                  {mine.map(slot => {
                    const hasOverlap = salon.some(s => isOverlapping(slot, s))
                    return (
                      <div
                        key={slot.id}
                        className={`rounded-lg border px-2 py-1.5 text-xs group relative ${
                          hasOverlap
                            ? 'bg-green-500/20 text-green-300 border-green-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {hasOverlap && <span className="block text-xs font-bold mb-0.5">◎</span>}
                        <div className="font-medium">{slot.start_time.slice(0, 5)}</div>
                        <div>〜{slot.end_time.slice(0, 5)}</div>
                        {slot.status === 'available' && (
                          <button
                            onClick={() => handleDelete(slot.id)}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  <button
                    onClick={() => { setSelectedDate(date.toISOString().split('T')[0]); setShowAddModal(true) }}
                    className="w-full rounded-lg border border-dashed border-slate-700 text-slate-600 py-1 text-xs hover:border-slate-500 hover:text-slate-400 transition-all flex items-center justify-center"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/30 inline-block" />自分の空き枠</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/30 inline-block" />◎ サロンとの重複（予約可能）</span>
        </div>
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-700 w-full max-w-sm p-6" style={{ background: '#1E293B' }}>
            <h3 className="font-bold text-white text-lg mb-4">空き枠を追加</h3>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">日付</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                  style={{ background: '#0F172A' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">開始時間</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ background: '#0F172A' }}
                  >
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">終了時間</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                    style={{ background: '#0F172A' }}
                  >
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-lg text-slate-300 border border-slate-600 text-sm"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
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
