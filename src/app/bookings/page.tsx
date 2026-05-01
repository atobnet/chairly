'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, X } from 'lucide-react'
import Link from 'next/link'

interface BookingWithDetails {
  id: string
  slot_id: string | null
  hairdresser_availability_id: string | null
  salon_availability_id: string | null
  salon_id: string | null
  consumer_id: string
  menu: string | null
  message: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  payment_status?: 'unpaid' | 'authorized' | 'paid' | 'refunded' | 'partially_refunded' | null
  booked_date: string | null
  booked_start_time: string | null
  booked_end_time: string | null
  created_at: string
  _hairdresserName?: string | null
  _hairdresserId?: string | null
  _hasReview?: boolean
  hairdresser_availability?: {
    hairdresser_id: string
    date: string
    start_time: string
    end_time: string
  } | null
  slots?: {
    date: string
    start_time: string
    end_time: string
    hairdressers?: { profiles?: { name: string } } | null
  } | null
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          style={{ fontSize: '1.5rem', color: star <= value ? '#c9b99a' : '#ebebeb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewBooking, setReviewBooking] = useState<BookingWithDetails | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewMenuName, setReviewMenuName] = useState('')
  const [visitCount, setVisitCount] = useState<'first' | 'repeat'>('first')
  const [submittingReview, setSubmittingReview] = useState(false)
  const supabase = createClient()
  const searchParams = useSearchParams()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: bookingData, error } = await supabase.from('bookings')
      .select(`
        *,
        hairdresser_availability(hairdresser_id, date, start_time, end_time),
        slots(date, start_time, end_time, hairdressers(profiles(name)))
      `)
      .eq('consumer_id', user.id)
      .order('created_at', { ascending: false })
    if (error) console.error('bookings query error:', error)

    const hairdresserIds = [...new Set(
      (bookingData || [])
        .map((b: { hairdresser_availability?: { hairdresser_id: string } | null }) => b.hairdresser_availability?.hairdresser_id)
        .filter(Boolean) as string[]
    )]
    let profileMap: Record<string, string> = {}
    if (hairdresserIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', hairdresserIds)
      profileMap = Object.fromEntries((profiles || []).map((p: { id: string; name: string }) => [p.id, p.name]))
    }

    const bookingIds = (bookingData || []).map((b: { id: string }) => b.id)
    let reviewedBookingIds = new Set<string>()
    if (bookingIds.length > 0) {
      const { data: reviews } = await supabase.from('reviews').select('booking_id').in('booking_id', bookingIds)
      reviewedBookingIds = new Set((reviews || []).map((r: { booking_id: string }) => r.booking_id))
    }

    const merged = (bookingData || []).map((b) => ({
      ...b,
      _hairdresserName: b.hairdresser_availability?.hairdresser_id
        ? (profileMap[b.hairdresser_availability.hairdresser_id] || '美容師')
        : null,
      _hairdresserId: b.hairdresser_availability?.hairdresser_id || null,
      _hasReview: reviewedBookingIds.has(b.id),
    }))

    setBookings(merged as BookingWithDetails[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchParams.get('payment') === 'complete') {
      const timer = setTimeout(() => load(), 1500)
      return () => clearTimeout(timer)
    }
  }, [searchParams, load])

  const handleCancel = async (bookingId: string) => {
    const res = await fetch('/api/stripe/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, cancelledBy: 'consumer' }),
    })
    if (res.ok) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewBooking || !rating) return
    setSubmittingReview(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmittingReview(false); return }

    const { error } = await supabase.from('reviews').insert({
      booking_id: reviewBooking.id,
      reviewer_id: user.id,
      hairdresser_id: reviewBooking._hairdresserId,
      rating,
      comment: comment.trim() || null,
      menu_name: reviewMenuName.trim() || null,
      visit_count: visitCount,
    })

    if (!error) {
      setBookings(prev => prev.map(b => b.id === reviewBooking.id ? { ...b, _hasReview: true } : b))
      setReviewBooking(null)
      setRating(5)
      setComment('')
      setReviewMenuName('')
      setVisitCount('first')
    }
    setSubmittingReview(false)
  }

  const openReview = (b: BookingWithDetails) => {
    setReviewBooking(b)
    setRating(5)
    setComment('')
    setReviewMenuName(b.menu || '')
    setVisitCount('first')
  }

  const getBookingDate = (b: BookingWithDetails): string => {
    if (b.booked_date) return b.booked_date
    if (b.hairdresser_availability?.date) return b.hairdresser_availability.date
    return b.slots?.date || ''
  }

  const getBookingTime = (b: BookingWithDetails): string => {
    if (b.booked_start_time && b.booked_end_time) {
      return `${b.booked_start_time.slice(0, 5)}–${b.booked_end_time.slice(0, 5)}`
    }
    if (b.hairdresser_availability?.start_time) {
      return `${b.hairdresser_availability.start_time.slice(0, 5)}–${b.hairdresser_availability.end_time.slice(0, 5)}`
    }
    if (b.slots?.start_time) {
      return `${b.slots.start_time.slice(0, 5)}–${b.slots.end_time?.slice(0, 5)}`
    }
    return ''
  }

  const getHairdresserName = (b: BookingWithDetails): string => {
    return b._hairdresserName || b.slots?.hairdressers?.profiles?.name || '美容師'
  }

  const isPaid = (b: BookingWithDetails) =>
    b.payment_status === 'paid' || b.payment_status === 'authorized'

  const canReview = (b: BookingWithDetails) => {
    const today = new Date().toISOString().split('T')[0]
    return b.status === 'confirmed' && getBookingDate(b) <= today && !b._hasReview && b._hairdresserId
  }

  const statusLabel: Record<string, string> = {
    pending: '確認待ち',
    confirmed: '確定',
    cancelled: 'キャンセル',
  }

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const upcoming = bookings.filter(b => b.status !== 'cancelled' && getBookingDate(b) >= today)
  const past = bookings.filter(b => b.status === 'cancelled' || getBookingDate(b) < today)

  return (
    <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-16">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>MY BOOKINGS</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, color: '#111111', letterSpacing: '0.04em', margin: 0 }}>予約一覧</h1>
        </div>

        {bookings.length === 0 ? (
          <div style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center', border: '1px solid #ebebeb' }}>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1rem', fontWeight: 300 }}>NO BOOKINGS YET</p>
            <Link href="/search" style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, borderBottom: '1px solid #999999', textDecoration: 'none', paddingBottom: '2px', letterSpacing: '0.04em' }}>
              美容師を探す →
            </Link>
          </div>
        ) : (
          <div className="space-y-16">
            {upcoming.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>UPCOMING</p>
                <div style={{ border: '1px solid #ebebeb' }}>
                  {upcoming.map((b, i) => (
                    <div key={b.id} className="px-6 py-6" style={{ borderBottom: i < upcoming.length - 1 ? '1px solid #ebebeb' : 'none' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300, marginBottom: '0.25rem' }}>
                            {getHairdresserName(b)}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300 }}>
                            {getBookingDate(b) && new Date(getBookingDate(b)).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                            　{getBookingTime(b)}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#999999', fontWeight: 300 }}>
                          {statusLabel[b.status]}
                        </span>
                      </div>
                      {b.menu && <p style={{ fontSize: '0.75rem', marginBottom: '0.75rem', color: '#999999', fontWeight: 300 }}>{b.menu}</p>}
                      <div className="flex items-center gap-4 flex-wrap">
                        {b.status === 'confirmed' && isPaid(b) && (
                          <span style={{ fontSize: '0.6rem', color: '#4a7c59', letterSpacing: '0.15em', fontWeight: 300 }}>決済済み</span>
                        )}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, background: 'none', border: 'none', borderBottom: '1px solid #999999', padding: '0 0 2px 0', cursor: 'pointer', letterSpacing: '0.04em' }}
                          >
                            キャンセルする
                          </button>
                        )}
                        {canReview(b) && (
                          <button
                            onClick={() => openReview(b)}
                            style={{ fontSize: '0.7rem', color: '#c9b99a', fontWeight: 300, background: 'none', border: 'none', borderBottom: '1px solid #c9b99a', padding: '0 0 1px 0', cursor: 'pointer', letterSpacing: '0.04em' }}
                          >
                            レビューを書く
                          </button>
                        )}
                        {b._hasReview && (
                          <span style={{ fontSize: '0.6rem', color: '#c9b99a', letterSpacing: '0.15em', fontWeight: 300 }}>レビュー済み ★</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem', fontWeight: 300 }}>PAST</p>
                <div style={{ border: '1px solid #ebebeb' }}>
                  {past.map((b, i) => (
                    <div key={b.id} className="px-6 py-5"
                      style={{ borderBottom: i < past.length - 1 ? '1px solid #ebebeb' : 'none', opacity: b.status === 'cancelled' ? 0.5 : 1 }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300 }}>{getHairdresserName(b)}</p>
                          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#999999', fontWeight: 300 }}>
                            {getBookingDate(b)}　{b.menu}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', color: '#999999', fontWeight: 300 }}>{statusLabel[b.status]}</span>
                      </div>
                      {canReview(b) && (
                        <button
                          onClick={() => openReview(b)}
                          style={{ fontSize: '0.7rem', color: '#c9b99a', fontWeight: 300, background: 'none', border: 'none', borderBottom: '1px solid #c9b99a', padding: '0 0 1px 0', cursor: 'pointer', letterSpacing: '0.04em', marginTop: '0.5rem' }}
                        >
                          レビューを書く
                        </button>
                      )}
                      {b._hasReview && (
                        <span style={{ fontSize: '0.6rem', color: '#c9b99a', letterSpacing: '0.15em', fontWeight: 300, display: 'block', marginTop: '0.5rem' }}>レビュー済み ★</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* レビューモーダル */}
      {reviewBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '28rem', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', fontWeight: 300 }}>REVIEW</p>
              <button onClick={() => setReviewBooking(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cccccc' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#111111', fontWeight: 300, marginBottom: '0.25rem' }}>{getHairdresserName(reviewBooking)}</p>
            <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, marginBottom: '1.5rem' }}>{reviewBooking.menu}</p>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>RATING</p>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>施術メニュー（任意）</p>
              <input
                type="text"
                value={reviewMenuName}
                onChange={e => setReviewMenuName(e.target.value)}
                placeholder="例: カット・カラー"
                style={underlineInput}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>来店回数</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {(['first', 'repeat'] as const).map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 300, color: visitCount === v ? '#111111' : '#999999' }}>
                    <input
                      type="radio"
                      name="visitCount"
                      value={v}
                      checked={visitCount === v}
                      onChange={() => setVisitCount(v)}
                      style={{ accentColor: '#111111' }}
                    />
                    {v === 'first' ? '初回' : '2回目以降'}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem', fontWeight: 300 }}>COMMENT（任意）</p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                placeholder="施術の感想をお聞かせください"
                style={{ ...underlineInput, resize: 'none' }}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setReviewBooking(null)}
                style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #ebebeb', color: '#999999', background: 'transparent', cursor: 'pointer', fontWeight: 300 }}>
                キャンセル
              </button>
              <button onClick={handleSubmitReview} disabled={submittingReview || rating === 0}
                style={{ flex: 1, padding: '0.75rem 0', fontSize: '0.65rem', letterSpacing: '0.15em', border: '1px solid #111111', color: '#ffffff', background: '#111111', cursor: submittingReview ? 'not-allowed' : 'pointer', fontWeight: 300, opacity: submittingReview ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {submittingReview && <Loader2 size={12} className="animate-spin" />}
                送信する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
