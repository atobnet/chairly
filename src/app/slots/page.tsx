'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SalonAvailability, HairdresserAvailability } from '@/types'

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

function isOverlapping(a: { start_time: string; end_time: string }, b: { start_time: string; end_time: string }) {
  return a.start_time < b.end_time && a.end_time > b.start_time
}

interface HairdresserAvailabilityWithProfile extends HairdresserAvailability {
  hairdressers?: { profiles?: { name: string } }
}

export default function SlotsPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [salonAvailability, setSalonAvailability] = useState<SalonAvailability[]>([])
  const [hairdresserAvailability, setHairdresserAvailability] = useState<HairdresserAvailabilityWithProfile[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('20:00')
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

  useEffect(() => { if (userId) loadData(userId) }, [weekOffset, userId])

  const loadData = async (uid: string) => {
    const dates = getWeekDates(weekOffset)
    const from = dates[0].toISOString().split('T')[0]
    const to = dates[6].toISOString().split('T')[0]

    const [{ data: salonAvail }, { data: myHairdressers }] = await Promise.all([
      supabase.from('salon_availability').select('*').eq('salon_id', uid).gte('date', from).lte('date', to).order('date').order('start_time'),
      supabase.from('hairdresser_salons').select('hairdresser_id').eq('salon_id', uid).eq('status', 'active'),
    ])

    const hairdresserIds = (myHairdressers || []).map((h: { hairdresser_id: string }) => h.hairdresser_id)

    let hdAvail: HairdresserAvailabilityWithProfile[] = []
    if (hairdresserIds.length > 0) {
      const { data } = await supabase
        .from('hairdresser_availability')
        .select('*, hairdressers!inner(profiles(name))')
        .in('hairdresser_id', hairdresserIds)
        .gte('date', from)
        .lte('date', to)
      hdAvail = (data || []) as HairdresserAvailabilityWithProfile[]
    }

    setSalonAvailability((salonAvail || []) as SalonAvailability[])
    setHairdresserAvailability(hdAvail)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !selectedDate) return
    setSaving(true)
    await supabase.from('salon_availability').insert({
      salon_id: userId,
      date: selectedDate,
      start_time: startTime + ':00',
      end_time: endTime + ':00',
    })
    await loadData(userId)
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!userId) return
    await supabase.from('salon_availability').delete().eq('id', id).eq('salon_id', userId)
    setSalonAvailability(prev => prev.filter(a => a.id !== id))
  }

  const dates = getWeekDates(weekOffset)

  const getDataForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const salon = salonAvailability.filter(a => a.date === dateStr)
    const hd = hairdresserAvailability.filter(a => a.date === dateStr)
    return { salon, hd }
  }

  const selectStyle = { background: 'transparent', borderColor: '#ebebeb', color: '#111111' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-16">
          <div>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>SLOT MANAGEMENT</p>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>空き枠管理</h1>
          </div>
          <button
            onClick={() => { setSelectedDate(dates[0].toISOString().split('T')[0]); setShowModal(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #111111', color: '#111111', background: 'transparent', cursor: 'pointer', fontWeight: 300 }}
          >
            <Plus size={12} />
            空き枠を追加
          </button>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setWeekOffset(w => w - 1)}
            style={{ width: '2rem', height: '2rem', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer', color: '#999999' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#999999', fontWeight: 300 }}>
            {dates[0]?.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} — {dates[6]?.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)}
            style={{ width: '2rem', height: '2rem', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer', color: '#999999' }}>
            <ChevronRight size={14} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)}
              style={{ fontSize: '0.75rem', color: '#999999', background: 'none', border: 'none', borderBottom: '1px solid #999999', padding: '0 0 1px 0', cursor: 'pointer', fontWeight: 300 }}>
              今週
            </button>
          )}
        </div>

        {/* Calendar */}
        <div style={{ border: '1px solid #ebebeb' }}>
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid #ebebeb' }}>
            {dates.map((date, i) => (
              <div key={i} className="py-3 text-center" style={{ borderRight: i < 6 ? '1px solid #ebebeb' : 'none' }}>
                <div style={{ fontSize: '0.65rem', marginBottom: '0.25rem', color: '#cccccc', letterSpacing: '0.1em' }}>{DAYS[date.getDay()]}</div>
                <div style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{date.getDate()}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dates.map((date, i) => {
              const { salon, hd } = getDataForDate(date)
              return (
                <div key={i} style={{ minHeight: '10rem', padding: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderRight: i < 6 ? '1px solid #ebebeb' : 'none' }}>
                  {salon.map(avail => {
                    const overlapping = hd.filter(h => isOverlapping(avail, h))
                    return (
                      <div key={avail.id} className="group relative" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', border: '1px solid #ebebeb', background: 'transparent', color: '#999999', fontWeight: 300 }}>
                        {avail.start_time.slice(0, 5)}–{avail.end_time.slice(0, 5)}
                        {overlapping.length > 0 && (
                          <div style={{ fontSize: '0.6rem', color: '#111111', marginTop: '0.125rem' }}>
                            ◎ {overlapping.map(h => h.hairdressers?.profiles?.name || '').filter(Boolean).join(', ')}
                          </div>
                        )}
                        <button onClick={() => handleDelete(avail.id)}
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: '#999999', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                          <Trash2 size={9} />
                        </button>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => { setSelectedDate(date.toISOString().split('T')[0]); setShowModal(true) }}
                    style={{ width: '100%', padding: '0.25rem 0', fontSize: '0.7rem', border: '1px dashed #ebebeb', background: 'transparent', color: '#cccccc', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                    <Plus size={10} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex gap-6 mt-4" style={{ fontSize: '0.7rem', color: '#cccccc', fontWeight: 300 }}>
          <span>□ サロンの空き枠</span>
          <span style={{ color: '#111111' }}>◎ 美容師と重複（予約可能枠が生成されています）</span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ width: '100%', maxWidth: '24rem', padding: '2rem', border: '1px solid #ebebeb', background: '#ffffff' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>ADD SLOT</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>DATE</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} required min={new Date().toISOString().split('T')[0]}
                  style={{ ...selectStyle, width: '100%', padding: '0.625rem 0', fontSize: '0.875rem', border: 'none', borderBottom: '1px solid #ebebeb', outline: 'none' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>START</label>
                  <select value={startTime} onChange={e => setStartTime(e.target.value)}
                    style={{ ...selectStyle, width: '100%', padding: '0.625rem 0', fontSize: '0.875rem', border: 'none', borderBottom: '1px solid #ebebeb', outline: 'none' }}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>END</label>
                  <select value={endTime} onChange={e => setEndTime(e.target.value)}
                    style={{ ...selectStyle, width: '100%', padding: '0.625rem 0', fontSize: '0.875rem', border: 'none', borderBottom: '1px solid #ebebeb', outline: 'none' }}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #ebebeb', color: '#999999', background: 'transparent', cursor: 'pointer', fontWeight: 300 }}>
                  キャンセル
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #111111', color: '#ffffff', background: '#111111', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 300, opacity: saving ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
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
