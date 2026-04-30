'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ChevronLeft, ChevronRight, Check, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Hairdresser, Profile, Salon, AvailableSlot, MenuItem, BusinessHours, StampCard, GuestStamp } from '@/types'
import { StampCardPreview } from '@/app/hairdresser/stamp-card/page'

const SalonMap = dynamic(() => import('@/components/SalonMap'), { ssr: false })

interface HairdresserWithProfile extends Hairdresser {
  profiles: Profile
}

interface ReviewWithExtras {
  id: string
  rating: number
  comment: string | null
  menu_name: string | null
  visit_count: string | null
  created_at: string
  profiles?: { name: string } | null
}

interface UserCoupon {
  id: string
  discount_type: 'amount' | 'rate'
  discount_value: number
  expires_at: string
  used_at: string | null
}

const DAYS = ['日', '月', '火', '水', '木', '金', '土']
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const DAY_LABELS: Record<string, string> = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' }

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

function toJSTDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

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

function calcDiscountedPrice(price: number, coupon: UserCoupon): number {
  if (coupon.discount_type === 'amount') return Math.max(0, price - coupon.discount_value)
  return Math.max(0, Math.floor(price * (1 - coupon.discount_value / 100)))
}

function getBestCoupon(coupons: UserCoupon[], price: number): UserCoupon | null {
  if (!coupons.length) return null
  const now = new Date().toISOString()
  const valid = coupons.filter(c => !c.used_at && c.expires_at > now)
  if (!valid.length) return null
  return valid.reduce((best, c) => {
    const discountBest = best.discount_type === 'amount' ? best.discount_value : Math.floor(price * best.discount_value / 100)
    const discountC = c.discount_type === 'amount' ? c.discount_value : Math.floor(price * c.discount_value / 100)
    return discountC > discountBest ? c : best
  })
}

function GenderBar({ male, female }: { male: number; female: number }) {
  const total = male + female
  if (total === 0) return <p style={{ fontSize: '0.75rem', color: '#cccccc' }}>データなし</p>
  const malePercent = Math.round((male / total) * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ fontSize: '0.65rem', color: '#6baed6', fontWeight: 300 }}>男性 {malePercent}%</span>
        <span style={{ fontSize: '0.65rem', color: '#e377c2', fontWeight: 300 }}>女性 {100 - malePercent}%</span>
      </div>
      <div style={{ height: '0.5rem', background: '#f0f0f0', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${malePercent}%`, background: 'linear-gradient(to right, #6baed6, #9ecae1)', borderRadius: '9999px' }} />
      </div>
    </div>
  )
}

function SegmentBar({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.count, 0)
  if (total === 0) return <p style={{ fontSize: '0.75rem', color: '#cccccc' }}>データなし</p>
  return (
    <div>
      <div style={{ display: 'flex', height: '0.5rem', borderRadius: '9999px', overflow: 'hidden', marginBottom: '0.375rem' }}>
        {segments.filter(s => s.count > 0).map((s, i) => (
          <div key={i} style={{ width: `${(s.count / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {segments.filter(s => s.count > 0).map((s, i) => (
          <span key={i} style={{ fontSize: '0.6rem', color: '#999999', fontWeight: 300 }}>
            <span style={{ display: 'inline-block', width: '0.5rem', height: '0.5rem', background: s.color, marginRight: '0.2rem', verticalAlign: 'middle', borderRadius: '50%' }} />
            {s.label} {Math.round((s.count / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  )
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
  const [reviews, setReviews] = useState<ReviewWithExtras[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([])
  const [selectedCoupon, setSelectedCoupon] = useState<UserCoupon | null>(null)

  // Stats
  const [statsGender, setStatsGender] = useState<{ male: number; female: number } | null>(null)
  const [statsAge, setStatsAge] = useState<{ label: string; count: number; color: string }[] | null>(null)
  const [statsMenu, setStatsMenu] = useState<{ label: string; count: number; color: string }[] | null>(null)
  const [statsCount, setStatsCount] = useState(0)

  // Stamp card
  const [stampCard, setStampCard] = useState<StampCard | null>(null)
  const [guestStamp, setGuestStamp] = useState<GuestStamp | null>(null)

  // Ranking
  const [myRank, setMyRank] = useState<number | null>(null)
  const [isTrending, setIsTrending] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { window.scrollTo(0, 0) }, [id])

  useEffect(() => {
    fetch('/api/hairdresser-ranking')
      .then(r => r.json())
      .then((data: { rankings: { hairdresser_id: string; rank: number }[]; trending: string[] }) => {
        const entry = data.rankings.find(r => r.hairdresser_id === id)
        setMyRank(entry?.rank ?? null)
        setIsTrending(data.trending.includes(id))
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const [{ data: hData }, { data: hsData }, { data: reviewData }, { data: stampCardData }] = await Promise.all([
        supabase.from('hairdressers').select('*, profiles(id, name, avatar_url, role, created_at, gender, birth_year)').eq('id', id).single(),
        supabase.from('hairdresser_salons').select('*, salons(*, profiles(name))').eq('hairdresser_id', id).eq('status', 'active'),
        supabase.from('reviews').select('*, profiles!reviewer_id(name)').eq('hairdresser_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('stamp_cards').select('*').eq('hairdresser_id', id).eq('is_active', true).maybeSingle(),
      ])

      setHairdresser(hData as HairdresserWithProfile)
      const salonList = (hsData || []).map((hs: { salons: unknown }) => hs.salons).filter(Boolean) as (Salon & { profiles?: { name: string } })[]
      setSalons(salonList)
      setReviews((reviewData || []) as ReviewWithExtras[])
      if (reviewData && reviewData.length > 0) {
        setAvgRating(reviewData.reduce((a: number, r: ReviewWithExtras) => a + r.rating, 0) / reviewData.length)
      }
      setStampCard(stampCardData as StampCard | null)

      if (user) {
        const [{ data: fav }, { data: coupons }, { data: gs }] = await Promise.all([
          supabase.from('favorites').select('id').eq('consumer_id', user.id).eq('hairdresser_id', id).maybeSingle(),
          supabase.from('coupons').select('id, discount_type, discount_value, expires_at, used_at').eq('user_id', user.id).is('used_at', null).gte('expires_at', new Date().toISOString()),
          stampCardData ? supabase.from('guest_stamps').select('*').eq('guest_id', user.id).eq('hairdresser_id', id).maybeSingle() : Promise.resolve({ data: null }),
        ])
        setIsFavorited(!!fav)
        const validCoupons = (coupons || []) as UserCoupon[]
        setUserCoupons(validCoupons)
        setGuestStamp(gs as GuestStamp | null)
      }

      // ステータスグラフ: 予約データから集計
      const { data: bookingStats } = await supabase
        .from('bookings')
        .select('consumer_id, menu, profiles!consumer_id(gender, birth_year)')
        .eq('hairdresser_availability.hairdresser_id', id)
        .not('hairdresser_availability_id', 'is', null)
        .limit(100)

      if (bookingStats && bookingStats.length >= 5) {
        setStatsCount(bookingStats.length)
        // 男女比
        let male = 0, female = 0
        bookingStats.forEach((b: { profiles?: { gender?: string; birth_year?: number }[] | null }) => {
          const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
          if ((profile as { gender?: string } | null | undefined)?.gender === 'male') male++
          else if ((profile as { gender?: string } | null | undefined)?.gender === 'female') female++
        })
        if (male + female >= 5) setStatsGender({ male, female })

        // 年齢比
        const ageColors = ['#fdae6b', '#fd8d3c', '#e6550d', '#a63603', '#7f2704']
        const ageGroups = [
          { label: '10代', min: 10, max: 19, count: 0, color: ageColors[0] },
          { label: '20代', min: 20, max: 29, count: 0, color: ageColors[1] },
          { label: '30代', min: 30, max: 39, count: 0, color: ageColors[2] },
          { label: '40代', min: 40, max: 49, count: 0, color: ageColors[3] },
          { label: '50代以上', min: 50, max: 999, count: 0, color: ageColors[4] },
        ]
        const currentYear = new Date().getFullYear()
        bookingStats.forEach((b: { profiles?: { gender?: string; birth_year?: number }[] | null }) => {
          const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles
          const birthYear = (profile as { birth_year?: number } | null | undefined)?.birth_year
          if (birthYear) {
            const age = currentYear - birthYear
            const group = ageGroups.find(g => age >= g.min && age <= g.max)
            if (group) group.count++
          }
        })
        if (ageGroups.some(g => g.count > 0)) setStatsAge(ageGroups)

        // メニュー比率
        const menuMap: Record<string, number> = {}
        bookingStats.forEach((b: { menu?: string | null }) => {
          if (b.menu) menuMap[b.menu] = (menuMap[b.menu] || 0) + 1
        })
        const menuColors = ['#6baed6', '#9ecae1', '#c6dbef', '#74c476', '#a1d99b', '#c7e9c0']
        const topMenus = Object.entries(menuMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([label, count], i) => ({ label, count, color: menuColors[i % menuColors.length] }))
        if (topMenus.length > 0) setStatsMenu(topMenus)
      }

      setLoading(false)
    }
    load()
  }, [id])

  // クーポン自動選択（最適）
  useEffect(() => {
    if (selectedMenu && userCoupons.length > 0) {
      const best = getBestCoupon(userCoupons, selectedMenu.price)
      setSelectedCoupon(best)
    } else {
      setSelectedCoupon(null)
    }
  }, [selectedMenu, userCoupons])

  useEffect(() => {
    if (selectedSalon) loadAvailableSlots(selectedSalon.id)
    else setAvailableSlots([])
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
      await supabase.from('favorites').delete().eq('consumer_id', currentUserId).eq('hairdresser_id', id)
    } else {
      await supabase.from('favorites').insert({ consumer_id: currentUserId, hairdresser_id: id })
    }
    setIsFavorited(!isFavorited)
  }

  const handleSelectMenu = (menu: MenuItem) => {
    if (selectedMenu?.name === menu.name) {
      setSelectedMenu(null); setSelectedSalon(null); setSelectedSlot(null); setSelectedTime('')
    } else {
      setSelectedMenu(menu); setSelectedSlot(null); setSelectedTime('')
    }
  }

  const handleSelectSalon = (salon: Salon & { profiles?: { name: string } }) => {
    if (selectedSalon?.id === salon.id) {
      setSelectedSalon(null); setSelectedSlot(null); setSelectedTime('')
    } else {
      setSelectedSalon(salon); setSelectedSlot(null); setSelectedTime('')
    }
  }

  const handleSelectTimeSlot = (slot: AvailableSlot, time: string) => {
    setSelectedSlot(slot); setSelectedTime(time)
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: newBooking.id }),
      }).catch(console.error)
    }
    setSubmitted(true); setSubmitting(false)
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
    width: '100%', padding: '0.5rem 0', fontSize: '0.875rem', border: 'none',
    borderBottom: '1px solid #ebebeb', outline: 'none', background: 'transparent',
    color: '#111111', fontWeight: 300, letterSpacing: '0.04em',
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

  // サロンの今日の営業時間
  const todayDayKey = DAY_KEYS[new Date().getDay()]

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#cccccc', textDecoration: 'none', marginBottom: '3rem', fontWeight: 300 }}>
          <ChevronLeft size={12} /> BACK
        </Link>

        {/* プロフィール */}
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
              <div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>{hairdresser.profiles?.name}</h1>
                {(myRank !== null || isTrending) && (() => {
                  let bg = '#B8962E'
                  let label = 'RANKING #1'
                  if (myRank === 2) { bg = '#8A8A8A'; label = 'RANKING #2' }
                  else if (myRank === 3) { bg = '#9C6B3C'; label = 'RANKING #3' }
                  else if (myRank === null && isTrending) { bg = '#6B4E9C'; label = 'TRENDING' }
                  return (
                    <span className="inline-block mt-2 px-2 py-0.5 text-xs" style={{ background: bg, color: '#fff', fontSize: '0.6rem', letterSpacing: '0.1em', fontWeight: 500 }}>
                      {label}
                    </span>
                  )
                })()}
              </div>
              <button onClick={toggleFavorite} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', marginTop: '0.5rem', flexShrink: 0 }}>
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

            {/* 得意分野タグ */}
            {hairdresser.specialty_tags && hairdresser.specialty_tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '1rem' }}>
                {hairdresser.specialty_tags.map(tag => (
                  <span key={tag} style={{ fontSize: '0.65rem', padding: '0.2rem 0.6rem', border: '1px solid #ebebeb', color: '#999999', fontWeight: 300, letterSpacing: '0.04em' }}>
                    {tag}
                  </span>
                ))}
              </div>
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

        {/* ステータスグラフ */}
        {statsCount >= 5 && (statsGender || statsAge || statsMenu) && (
          <div className="mb-20" style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>CUSTOMER DATA</p>
            <div style={{ border: '1px solid #ebebeb', padding: '1.5rem' }} className="space-y-5">
              {statsGender && (
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>男女比</p>
                  <GenderBar male={statsGender.male} female={statsGender.female} />
                </div>
              )}
              {statsAge && statsAge.some(g => g.count > 0) && (
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>年代比</p>
                  <SegmentBar segments={statsAge} />
                </div>
              )}
              {statsMenu && (
                <div>
                  <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>メニュー比率</p>
                  <SegmentBar segments={statsMenu} />
                </div>
              )}
            </div>
          </div>
        )}
        {statsCount < 5 && (
          <div className="mb-20" style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>CUSTOMER DATA</p>
            <p style={{ fontSize: '0.75rem', color: '#cccccc', fontWeight: 300 }}>データが不足しています（5件以上の予約で表示されます）</p>
          </div>
        )}

        {/* スタンプカードプレビュー */}
        {stampCard && (
          <div className="mb-20" style={{ borderTop: '1px solid #ebebeb', paddingTop: '3rem' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>STAMP CARD</p>
            <StampCardPreview
              design={stampCard.card_design}
              stampsRequired={stampCard.stamps_required}
              stampCount={guestStamp?.stamp_count ?? 0}
              rewardDescription={stampCard.reward_description}
            />
            {currentUserId && guestStamp && (
              <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, marginTop: '0.75rem', textAlign: 'right' }}>
                現在 {guestStamp.stamp_count}/{stampCard.stamps_required} スタンプ
              </p>
            )}
            {!currentUserId && (
              <p style={{ fontSize: '0.75rem', color: '#cccccc', fontWeight: 300, marginTop: '0.75rem' }}>
                ログインするとスタンプ状況を確認できます
              </p>
            )}
          </div>
        )}

        {/* STEP 1: メニュー選択 */}
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
                      const bestCoupon = getBestCoupon(userCoupons, m.price)
                      const discounted = bestCoupon ? calcDiscountedPrice(m.price, bestCoupon) : null
                      const discount = bestCoupon
                        ? bestCoupon.discount_type === 'amount'
                          ? bestCoupon.discount_value
                          : Math.floor(m.price * bestCoupon.discount_value / 100)
                        : 0

                      return (
                        <button key={i} type="button" onClick={() => handleSelectMenu(m)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '0.875rem 1.25rem',
                            borderBottom: i < groups[cat].length - 1 ? '1px solid #f0f0f0' : 'none',
                            background: isSelected ? '#111111' : 'transparent',
                            color: isSelected ? '#ffffff' : '#111111',
                            cursor: 'pointer', fontWeight: 300, textAlign: 'left', transition: 'background 0.15s', border: 'none',
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
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, marginLeft: '1rem' }}>
                            <span style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.5)' : '#cccccc' }}>{dur}分</span>
                            <div style={{ textAlign: 'right' }}>
                              {discounted !== null ? (
                                <>
                                  <div>
                                    <span style={{ fontSize: '0.7rem', color: isSelected ? 'rgba(255,255,255,0.45)' : '#cccccc', textDecoration: 'line-through', marginRight: '0.3rem' }}>¥{m.price.toLocaleString()}</span>
                                    <span style={{ fontSize: '0.875rem', color: isSelected ? '#ffd54f' : '#c9b99a', fontWeight: 400 }}>¥{discounted.toLocaleString()}</span>
                                  </div>
                                  <p style={{ fontSize: '0.6rem', color: isSelected ? 'rgba(255,255,255,0.6)' : '#c9b99a', fontWeight: 300, whiteSpace: 'nowrap' }}>
                                    クーポン -¥{discount.toLocaleString()}
                                  </p>
                                </>
                              ) : (
                                <span style={{ fontSize: '0.875rem', color: isSelected ? 'rgba(255,255,255,0.8)' : '#999999' }}>¥{m.price.toLocaleString()}</span>
                              )}
                            </div>
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

        {/* STEP 2: サロン選択 */}
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
                  const bh = salon.business_hours as BusinessHours | null
                  const todayEntry = bh?.[todayDayKey]

                  return (
                    <div key={salon.id} style={{ borderBottom: i < salons.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                      <button type="button" onClick={() => handleSelectSalon(salon)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', padding: '1rem 1.25rem',
                          background: isSelected ? '#111111' : 'transparent',
                          color: isSelected ? '#ffffff' : '#111111',
                          cursor: 'pointer', fontWeight: 300, textAlign: 'left', transition: 'all 0.15s', border: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          {isSelected && <Check size={12} strokeWidth={2.5} style={{ marginTop: '0.25rem' }} />}
                          <div>
                            <p style={{ fontSize: '0.875rem', marginBottom: '0.125rem' }}>{salon.profiles?.name || 'サロン'}</p>
                            <p style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.6)' : '#999999' }}>{salon.address}</p>
                            {todayEntry && (
                              <p style={{ fontSize: '0.65rem', color: isSelected ? 'rgba(255,255,255,0.5)' : '#cccccc', marginTop: '0.125rem' }}>
                                {todayEntry.closed ? '本日定休日' : `本日 ${todayEntry.open}–${todayEntry.close}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.7)' : '#cccccc', flexShrink: 0, marginLeft: '1rem' }}>
                          ¥{salon.price_per_hour.toLocaleString()}/h
                        </span>
                      </button>

                      {isSelected && (
                        <div>
                          {/* ギャラリー */}
                          {salon.gallery_images && salon.gallery_images.length > 0 && (
                            <div style={{ overflowX: 'auto', padding: '0.75rem 1.25rem', borderTop: '1px solid #ebebeb', background: '#f9f9f9' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', width: 'max-content' }}>
                                {salon.gallery_images.map((url, gi) => (
                                  <button key={gi} type="button" onClick={() => setLightboxUrl(url)}
                                    style={{ width: '5rem', height: '5rem', flexShrink: 0, border: 'none', padding: 0, cursor: 'zoom-in', overflow: 'hidden', background: '#f0f0f0' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 営業時間 */}
                          {salon.business_hours && Object.keys(salon.business_hours).length > 0 && (
                            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #e0e0e0', background: '#f9f9f9' }}>
                              <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: '#bbbbbb', marginBottom: '0.5rem', fontWeight: 300 }}>HOURS</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                                {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(day => {
                                  const entry = (salon.business_hours as BusinessHours)?.[day]
                                  return (
                                    <div key={day} style={{ textAlign: 'center', opacity: entry?.closed ? 0.35 : 1 }}>
                                      <p style={{ fontSize: '0.6rem', color: '#bbbbbb', fontWeight: 300 }}>{DAY_LABELS[day]}</p>
                                      {entry?.closed ? (
                                        <p style={{ fontSize: '0.5rem', color: '#cccccc', fontWeight: 300 }}>休</p>
                                      ) : entry ? (
                                        <>
                                          <p style={{ fontSize: '0.5rem', color: '#999999', fontWeight: 300 }}>{entry.open}</p>
                                          <p style={{ fontSize: '0.5rem', color: '#999999', fontWeight: 300 }}>{entry.close}</p>
                                        </>
                                      ) : null}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {salon.lat && salon.lng && (
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

        {/* STEP 3: 日時選択 */}
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
                                cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 300, opacity: disabled ? 0.45 : 1,
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

        {/* 確認・送信 */}
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
                  <div>
                    {selectedCoupon ? (
                      <>
                        <p style={{ fontSize: '0.7rem', color: '#cccccc', fontWeight: 300, textDecoration: 'line-through' }}>
                          ¥{selectedMenu.price.toLocaleString()} / {duration}分
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#c9b99a', fontWeight: 400 }}>
                          ¥{calcDiscountedPrice(selectedMenu.price, selectedCoupon).toLocaleString()} （クーポン適用）
                        </p>
                      </>
                    ) : (
                      <p style={{ fontSize: '0.7rem', color: '#999999', fontWeight: 300 }}>¥{selectedMenu.price.toLocaleString()} / {duration}分</p>
                    )}
                  </div>
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
                {selectedCoupon && (
                  <div className="col-span-2">
                    <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.25rem', fontWeight: 300 }}>COUPON</p>
                    <p style={{ fontSize: '0.75rem', color: '#c9b99a', fontWeight: 300 }}>
                      {selectedCoupon.discount_type === 'amount' ? `¥${selectedCoupon.discount_value.toLocaleString()}割引` : `${selectedCoupon.discount_value}%割引`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* クーポン切り替え */}
            {userCoupons.filter(c => !c.used_at && c.expires_at > new Date().toISOString()).length > 1 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>クーポンを変更</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCoupon(null)}
                    style={{
                      padding: '0.25rem 0.75rem', fontSize: '0.65rem', fontWeight: 300,
                      border: !selectedCoupon ? '1px solid #111111' : '1px solid #ebebeb',
                      background: !selectedCoupon ? '#111111' : 'transparent',
                      color: !selectedCoupon ? '#ffffff' : '#999999', cursor: 'pointer',
                    }}
                  >
                    使わない
                  </button>
                  {userCoupons.filter(c => !c.used_at && c.expires_at > new Date().toISOString()).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCoupon(c)}
                      style={{
                        padding: '0.25rem 0.75rem', fontSize: '0.65rem', fontWeight: 300,
                        border: selectedCoupon?.id === c.id ? '1px solid #c9b99a' : '1px solid #ebebeb',
                        background: selectedCoupon?.id === c.id ? '#c9b99a' : 'transparent',
                        color: selectedCoupon?.id === c.id ? '#ffffff' : '#999999', cursor: 'pointer',
                      }}
                    >
                      {c.discount_type === 'amount' ? `¥${c.discount_value.toLocaleString()}OFF` : `${c.discount_value}%OFF`}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  {/* メニュー・来店回数 */}
                  {(r.menu_name || r.visit_count) && (
                    <p style={{ fontSize: '0.6rem', color: '#bbbbbb', fontWeight: 300, marginBottom: '0.375rem', letterSpacing: '0.05em' }}>
                      {r.menu_name && <span>メニュー：{r.menu_name}</span>}
                      {r.menu_name && r.visit_count && <span style={{ margin: '0 0.5rem' }}>|</span>}
                      {r.visit_count && <span>{r.visit_count === 'first' ? '初回' : '2回目以降'}</span>}
                    </p>
                  )}
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

      {/* ライトボックス */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, cursor: 'zoom-out', padding: '2rem' }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}
