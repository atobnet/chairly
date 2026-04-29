'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft, ChevronRight, Check, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Hairdresser, Profile, Salon, AvailableSlot, MenuItem } from '@/types'

const SalonMap = dynamic(() => import('@/components/SalonMap'), { ssr: false })

interface HairdresserWithProfile extends Hairdresser {
  profiles: Profile
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  profiles?: { name: string } | null
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

// JSTの日付文字列を返す（YYYY-MM-DD）
function toJSTDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

// 現在時刻(JST) + 2時間より前のスロットは選択不可
function isSlotDisabled(dateStr: string, time: string): boolean {
  const now = new Date()
  const cutoff = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const slotJST = new Date(`${dateStr}T${time}:00+09:00`)
  return slotJST <= cutoff
}

function generateTimeSlots(slot: AvailableSlot, durationMinutes: number): string[] {
  const slots: string[] = []
  const [sh, sm] = slot.available_from.slice(0, 5).split(':').map(Number)
  const [eh, em] = slot.available_until.slice(0, 5).split(':').map(Number)
  let current = sh * 60 + sm
  const end = eh * 60 + em - durationMinutes
  while (current <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0')
    const m = (current % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    current += 30
  }
  return slots
}

export default function HairdresserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [hairdresser, setHairdresser] = useState<HairdresserWithProfile | null>(null)
  const [salons, setSalons] = useState<(Salon & { profiles?: { name: string } })[]>([])
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null)
  const [selectedSalon, setSelectedSalon] = useState<(Salon & { profiles?: { name: string } }) | null>(null)
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const [{ data: hData }, { data: hsData }, { data: reviewData }] = await Promise.all([
        supabase.from('hairdressers').select('*, profiles(id, name, avatar_url, role, created_at)').eq('id', id).single(),
        supabase.from('hairdresser_salons').select('*, salons(*, profiles(name))').eq('hairdresser_id', id).eq('status', 'active'),
        supabase.from('reviews').select('*, profiles!reviewer_id(name)').eq('hairdresser_id', id).order('created_at', { ascending: false }).limit(5),
      ])

      setHairdresser(hData as HairdresserWithProfile)
      const salonList = (hsData || []).map((hs: { salons: unknown }) => hs.salons).filter(Boolean) as (Salon & { profiles?: { name: string } })[]
      setSalons(salonList)
      setReviews((reviewData || []) as Review[])
      if (reviewData && reviewData.length > 0) {
        setAvgRating(reviewData.reduce((a: number, r: Review) => a + r.rating, 0) / reviewData.length)
      }

      // お気に入り状態
      if (user) {
        const { data: fav } = await supabase.from('favorites')
          .select('id').eq('consumer_id', user.id).eq('hairdresser_id', id).maybeSingle()
        setIsFavorited(!!fav)
      }

      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (selectedSalon) {
      loadAvailableSlots(selectedSalon.id)
    } else {
      setAvailableSlots([])
    }
  }, [selectedSalon, weekOffset])

  const loadAvailableSlots = async (salonId: string) => {
    setSlotsLoading(true)
    const dates = getWeekDates(weekOffset)
    const from = dates[0].toISOString().split('T')[0]
    const to = dates[6].toISOString().split('T')[0]

    const { data } = await supabase
      .from('available_slots')
      .select('*')
      .eq('hairdresser_id', id)
      .eq('salon_id', salonId)
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .order('available_from')

    setAvailableSlots((data || []) as AvailableSlot[])
    setSlotsLoading(false)
  }

  const toggleFavorite = async () => {
    if (!currentUserId) { router.push('/login'); return }
    if (isFavorited) {
      await supabase.from('favorites').delete()
        .eq('consumer_id', currentUserId).eq('hairdresser_id', id)
    } else {
      await supabase.from('favorites').insert({ consumer_id: currentUserId, hairdresser_id: id })
    }
    setIsFavorited(!isFavorited)
  }

  const handleSelectMenu = (menu: MenuItem) => {
    if (selectedMenu?.name === menu.name) {
      setSelectedMenu(null)
      setSelectedSalon(null)
      setSelectedSlot(null)
      setSelectedTime('')
    } else {
      setSelectedMenu(menu)
      setSelectedSlot(null)
      setSelectedTime('')
    }
  }

  const handleSelectSalon = (salon: Salon & { profiles?: { name: string } }) => {
    if (selectedSalon?.id === salon.id) {
      setSelectedSalon(null)
      setSelectedSlot(null)
      setSelectedTime('')
    } else {
      setSelectedSalon(salon)
      setSelectedSlot(null)
      setSelectedTime('')
    }
  }

  const handleSelectTimeSlot = (slot: AvailableSlot, time: string) => {
    setSelectedSlot(slot)
    setSelectedTime(time)
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot || !selectedSalon || !selectedMenu || !currentUserId) { router.push('/login'); return }
    setSubmitting(true)

    const duration = selectedMenu.duration ?? 60
    const [startH, startM] = selectedTime.split(':').map(Number)
    const endMinutes = startH * 60 + startM + duration
    const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}:00`

    const { data: newBooking, error } = await supabase.from('bookings').insert({
      hairdresser_availability_id: selectedSlot.hairdresser_availability_id,
      salon_availability_id: selectedSlot.salon_availability_id,
      salon_id: selectedSalon.id,
      consumer_id: currentUserId,
      menu: selectedMenu.name,
      message,
      status: 'pending',
      booked_date: selectedSlot.date,
      booked_start_time: selectedTime + ':00',
      booked_end_time: endTime,
    }).select().single()

    if (error) { alert('予約に失敗しました'); setSubmitting(false); return }

    if (newBooking) {
      fetch('/api/notify/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: newBooking.id }),
      }).catch(console.error)
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  const getSlotsForDate = (date: Date) => {
    const dateStr = toJSTDateString(date)
    return availableSlots.filter(s => s.date === dateStr)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  if (!hairdresser) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <div className="text-center">
        <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1rem', fontWeight: 300 }}>NOT FOUND</p>
        <Link href="/search" style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, borderBottom: '1px solid #999999', textDecoration: 'none', paddingBottom: '2px' }}>← 検索に戻る</Link>
      </div>
    </div>
  )

  const dates = getWeekDates(weekOffset)
  const duration = selectedMenu?.duration ?? 60

  const underlineInput: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0',
    fontSize: '0.875rem',
    border: 'none',
    borderBottom: '1px solid #ebebeb',
    outline: 'none',
    background: 'transparent',
    color: '#111111',
    fontWeight: 300,
    letterSpacing: '0.04em',
  }

  const StepLabel = ({ num, label, done, active }: { num: number; label: string; done: boolean; active: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
      <div style={{
        width: '1.25rem', height: '1.25rem', borderRadius: '50%', flexShrink: 0,
        background: done ? '#111111' : active ? '#111111' : 'transparent',
        border: done || active ? '1px solid #111111' : '1px solid #cccccc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.55rem', color: done || active ? '#ffffff' : '#cccccc', fontWeight: 400,
      }}>
        {done ? <Check size={8} strokeWidth={3} /> : num}
      </div>
      <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: active || done ? '#111111' : '#cccccc', fontWeight: 300 }}>{label}</p>
    </div>
  )

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#cccccc', textDecoration: 'none', marginBottom: '3rem', fontWeight: 300 }}>
          <ChevronLeft size={12} /> BACK
        </Link>

        {/* Profile */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <div className="aspect-[4/5] flex items-center justify-center" style={{ background: '#f5f5f5' }}>
            {hairdresser.profiles?.avatar_url ? (
              <img src={hairdresser.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: '5rem', fontWeight: 100, color: '#cccccc' }}>{hairdresser.profiles?.name?.[0]}</div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>{hairdresser.area}</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>{hairdresser.profiles?.name}</h1>
              <button
                onClick={toggleFavorite}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', marginTop: '0.5rem', flexShrink: 0 }}
                title={isFavorited ? 'お気に入り解除' : 'お気に入り登録'}
              >
                <Heart size={20} style={{ color: isFavorited ? '#c9b99a' : '#cccccc', fill: isFavorited ? '#c9b99a' : 'none', transition: 'all 0.15s' }} />
              </button>
            </div>

            {avgRating !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ color: '#c9b99a', fontSize: '0.875rem' }}>{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</span>
                <span style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300 }}>{avgRating.toFixed(1)}（{reviews.length}件）</span>
              </div>
            )}

            {hairdresser.instagram_url && (
              <a href={hairdresser.instagram_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#999999', textDecoration: 'none', marginBottom: '1.5rem', display: 'block' }}>
                INSTAGRAM →
              </a>
            )}

            <div style={{ width: '2rem', height: '1px', background: '#ebebeb', margin: '1rem 0' }} />

            {hairdresser.bio && (
              <p style={{ fontSize: '0.875rem', lineHeight: '1.8', color: '#999999', fontWeight: 300 }}>{hairdresser.bio}</p>
            )}
          </div>
        </div>

        {/* ポートフォリオ */}
        {hairdresser.portfolio_urls && hairdresser.portfolio_urls.length > 0 && (
          <div className="mb-20" style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>PORTFOLIO</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {hairdresser.portfolio_urls.map((url, i) => (
                <button key={i} type="button" onClick={() => setLightboxUrl(url)}
                  style={{ aspectRatio: '1', background: '#f5f5f5', border: 'none', padding: 0, cursor: 'pointer', overflow: 'hidden' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.2s' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: メニュー選択 ── */}
        <div className="mb-16" style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
          <StepLabel num={1} label="MENU" done={!!selectedMenu} active={!selectedMenu} />

          {!hairdresser.menus?.length ? (
            <div style={{ padding: '2rem', border: '1px solid #ebebeb', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#cccccc', fontWeight: 300 }}>メニューが登録されていません</p>
            </div>
          ) : (() => {
            const categoryOrder = ['組み合わせメニュー', 'カット', 'カラー', 'パーマ', '縮毛矯正', 'その他']
            const groups = hairdresser.menus!.reduce((acc, m) => {
              const cat = m.category || 'その他'
              ;(acc[cat] = acc[cat] || []).push(m)
              return acc
            }, {} as Record<string, MenuItem[]>)
            const cats = Object.keys(groups).sort((a, b) => {
              const ai = categoryOrder.indexOf(a), bi = categoryOrder.indexOf(b)
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
            })
            return (
              <div style={{ border: '1px solid #ebebeb' }}>
                {cats.map((cat, ci) => (
                  <div key={cat}>
                    <div style={{ padding: '0.5rem 1.25rem', background: '#f9f9f9', borderBottom: '1px solid #ebebeb', borderTop: ci > 0 ? '1px solid #d8d8d8' : 'none' }}>
                      <span style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#888888', fontWeight: 300 }}>{cat}</span>
                    </div>
                    {groups[cat].map((m, i) => {
                      const isSelected = selectedMenu?.name === m.name
                      const dur = m.duration ?? 60
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectMenu(m)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '0.875rem 1.25rem',
                            borderBottom: i < groups[cat].length - 1 ? '1px solid #f0f0f0' : 'none',
                            background: isSelected ? '#111111' : 'transparent',
                            color: isSelected ? '#ffffff' : '#111111',
                            cursor: 'pointer', fontWeight: 300, textAlign: 'left',
                            transition: 'background 0.15s', border: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                            {isSelected && <Check size={12} strokeWidth={2.5} style={{ marginTop: '0.25rem', flexShrink: 0 }} />}
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontSize: '0.875rem' }}>{m.name}</span>
                              {m.description && (
                                <p style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.55)' : '#aaaaaa', marginTop: '0.2rem', fontWeight: 300, lineHeight: 1.5 }}>{m.description}</p>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexShrink: 0, marginLeft: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.5)' : '#cccccc' }}>{dur}分</span>
                            <span style={{ fontSize: '0.875rem', color: isSelected ? 'rgba(255,255,255,0.8)' : '#999999' }}>¥{m.price.toLocaleString()}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* ── STEP 2: サロン選択 ── */}
        <div className="mb-16" style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
          <StepLabel num={2} label="SALON" done={!!selectedSalon} active={!!selectedMenu && !selectedSalon} />

          {!selectedMenu ? (
            <div style={{ padding: '2.5rem', border: '1px solid #ebebeb', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#cccccc', fontWeight: 300 }}>先にメニューを選択してください</p>
            </div>
          ) : salons.length === 0 ? (
            <div style={{ padding: '2rem', border: '1px solid #ebebeb', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#cccccc', fontWeight: 300 }}>利用可能なサロンがまだ登録されていません</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1rem', overflow: 'hidden', border: '1px solid #ebebeb' }}>
                <SalonMap salons={salons} selectedSalonId={selectedSalon?.id || null} onSelect={handleSelectSalon} />
              </div>
              <div style={{ border: '1px solid #ebebeb' }}>
                {salons.map((salon, i) => {
                  const isSelected = selectedSalon?.id === salon.id
                  return (
                    <div key={salon.id} style={{ borderBottom: i < salons.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectSalon(salon)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '1rem 1.25rem',
                          background: isSelected ? '#111111' : 'transparent',
                          color: isSelected ? '#ffffff' : '#111111',
                          cursor: 'pointer', fontWeight: 300, textAlign: 'left',
                          transition: 'all 0.15s', border: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {isSelected && <Check size={12} strokeWidth={2.5} />}
                          <div>
                            <p style={{ fontSize: '0.875rem', marginBottom: '0.125rem' }}>{salon.profiles?.name || 'サロン'}</p>
                            <p style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.6)' : '#999999' }}>{salon.address}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.7)' : '#cccccc', flexShrink: 0, marginLeft: '1rem' }}>
                          ¥{salon.price_per_hour.toLocaleString()}/h
                        </span>
                      </button>
                      {isSelected && salon.lat && salon.lng && (
                        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#f9f9f9', borderTop: '1px solid #e0e0e0' }}>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${salon.lat},${salon.lng}`} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.65rem', letterSpacing: '0.1em', textAlign: 'center', border: '1px solid #ebebeb', color: '#555555', background: '#ffffff', textDecoration: 'none', fontWeight: 300 }}>
                            地図を開く
                          </a>
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${salon.lat},${salon.lng}`} target="_blank" rel="noopener noreferrer"
                            style={{ flex: 1, padding: '0.5rem 0', fontSize: '0.65rem', letterSpacing: '0.1em', textAlign: 'center', border: '1px solid #111111', color: '#ffffff', background: '#111111', textDecoration: 'none', fontWeight: 300 }}>
                            ルート案内
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {selectedSalon && (
                <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                  <button onClick={() => { setSelectedSalon(null); setSelectedSlot(null); setSelectedTime('') }}
                    style={{ fontSize: '0.7rem', color: '#999999', background: 'none', border: 'none', borderBottom: '1px solid #999999', padding: '0 0 1px', cursor: 'pointer', fontWeight: 300 }}>
                    解除
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── STEP 3: 日時選択 ── */}
        <div className="mb-16" style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <StepLabel num={3} label="DATE & TIME" done={!!(selectedSlot && selectedTime)} active={!!selectedMenu && !!selectedSalon} />
            {selectedMenu && selectedSalon && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button onClick={() => setWeekOffset(w => w - 1)}
                  style={{ width: '1.75rem', height: '1.75rem', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer', color: '#999999' }}>
                  <ChevronLeft size={12} />
                </button>
                <span style={{ fontSize: '0.7rem', color: '#999999', fontWeight: 300 }}>
                  {dates[0].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}–{dates[6].toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                </span>
                <button onClick={() => setWeekOffset(w => w + 1)}
                  style={{ width: '1.75rem', height: '1.75rem', border: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer', color: '#999999' }}>
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>

          {!selectedMenu || !selectedSalon ? (
            <div style={{ padding: '2.5rem', border: '1px solid #ebebeb', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#cccccc', fontWeight: 300 }}>
                {!selectedMenu ? '先にメニューを選択してください' : '先にサロンを選択してください'}
              </p>
            </div>
          ) : slotsLoading ? (
            <div style={{ padding: '3rem', border: '1px solid #ebebeb', textAlign: 'center' }}>
              <Loader2 className="animate-spin mx-auto" size={16} style={{ color: '#cccccc' }} />
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.7rem', color: '#999999', marginBottom: '0.75rem', fontWeight: 300 }}>
                {selectedSalon.profiles?.name} ・ {selectedMenu.name}（{duration}分）
              </p>
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
                    const daySlots = getSlotsForDate(date)
                    const dateStr = toJSTDateString(date)
                    const timeSlots = daySlots.flatMap(slot =>
                      generateTimeSlots(slot, duration).map(t => ({ time: t, slot }))
                    )
                    return (
                      <div key={i} style={{ minHeight: '8rem', padding: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderRight: i < 6 ? '1px solid #ebebeb' : 'none' }}>
                        {timeSlots.map(({ time, slot }) => {
                          const disabled = isSlotDisabled(dateStr, time)
                          const isSelected = selectedSlot === slot && selectedTime === time
                          return (
                            <button
                              key={`${slot.hairdresser_availability_id}-${time}`}
                              onClick={() => !disabled && handleSelectTimeSlot(slot, time)}
                              disabled={disabled}
                              style={{
                                width: '100%', padding: '0.25rem', fontSize: '0.7rem', textAlign: 'center',
                                border: isSelected ? '1px solid #111111' : '1px solid #ebebeb',
                                background: isSelected ? '#111111' : 'transparent',
                                color: disabled ? '#dddddd' : isSelected ? '#ffffff' : '#999999',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                fontWeight: 300,
                                opacity: disabled ? 0.45 : 1,
                              }}
                            >
                              {time}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
              {availableSlots.length === 0 && (
                <p style={{ fontSize: '0.75rem', color: '#cccccc', marginTop: '1rem', textAlign: 'center', fontWeight: 300 }}>
                  この週に予約可能な枠がありません
                </p>
              )}
            </>
          )}
        </div>

        {/* ── 確認・送信 ── */}
        {submitted ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px solid #111111' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#111111', marginBottom: '1rem', fontWeight: 300 }}>REQUEST SENT</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 100, marginBottom: '1rem' }}>予約リクエストを送信しました</h3>
            <p style={{ fontSize: '0.75rem', color: '#999999', marginBottom: '1.5rem', fontWeight: 300 }}>美容師からの確認をお待ちください</p>
            <Link href="/bookings" style={{ fontSize: '0.75rem', color: '#999999', borderBottom: '1px solid #999999', textDecoration: 'none', paddingBottom: '2px', fontWeight: 300 }}>
              予約一覧を確認 →
            </Link>
          </div>
        ) : selectedSlot && selectedTime && selectedMenu ? (
          <div style={{ border: '1px solid #ebebeb', padding: '2rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>CONFIRM BOOKING</p>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', border: '1px solid #ebebeb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.25rem', fontWeight: 300 }}>MENU</p>
                  <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{selectedMenu.name}</p>
                  <p style={{ fontSize: '0.7rem', color: '#999999', fontWeight: 300 }}>¥{selectedMenu.price.toLocaleString()} / {duration}分</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.25rem', fontWeight: 300 }}>SALON</p>
                  <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{selectedSalon?.profiles?.name}</p>
                </div>
                <div className="col-span-2">
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.25rem', fontWeight: 300 }}>DATE & TIME</p>
                  <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>
                    {selectedSlot.date}　{selectedTime}–{(() => {
                      const [h, m] = selectedTime.split(':').map(Number)
                      const endMin = h * 60 + m + duration
                      return `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleBooking} className="space-y-5">
              <div>
                <label style={{ display: 'block', fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>MESSAGE（任意）</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="ご要望・ご質問など"
                  style={{ ...underlineInput, resize: 'none' }}
                  onFocus={e => (e.target.style.borderBottomColor = '#111111')} onBlur={e => (e.target.style.borderBottomColor = '#ebebeb')} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setSelectedSlot(null); setSelectedTime('') }}
                  style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #ebebeb', color: '#999999', background: 'transparent', cursor: 'pointer', fontWeight: 300 }}>
                  戻る
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 2, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #111111', color: '#ffffff', background: '#111111', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 300, opacity: submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {submitting && <Loader2 size={12} className="animate-spin" />}
                  予約リクエストを送る
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* レビュー一覧 */}
        {reviews.length > 0 && (
          <div style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem', marginTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>REVIEWS</p>
            <div style={{ border: '1px solid #ebebeb' }}>
              {reviews.map((r, i) => (
                <div key={r.id} className="px-6 py-5" style={{ borderBottom: i < reviews.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#111111', fontWeight: 300 }}>{r.profiles?.name || 'ゲスト'}</span>
                      <span style={{ color: '#c9b99a', fontSize: '0.8rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#cccccc', fontWeight: 300 }}>
                      {new Date(r.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {r.comment && <p style={{ fontSize: '0.875rem', color: '#666666', fontWeight: 300, lineHeight: 1.7 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ポートフォリオ拡大モーダル */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'zoom-out', padding: '2rem' }}
        >
          <img src={lightboxUrl} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
