'use client'
import { useState, useEffect, use } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CheckoutForm = dynamic(() => import('@/components/CheckoutForm'), { ssr: false })

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Coupon {
  id: string
  discount_type: 'amount' | 'rate'
  discount_value: number
  expires_at: string
  used_at: string | null
}

export default function PaymentPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params)
  const [step, setStep] = useState<'coupon' | 'payment'>('coupon')
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [selectedCouponId, setSelectedCouponId] = useState<string>('')
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [originalAmount, setOriginalAmount] = useState<number>(0)
  const [discountAmount, setDiscountAmount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [proceeding, setProceeding] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setCouponsLoading(false); return }
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('coupons')
        .select('id, discount_type, discount_value, expires_at, used_at')
        .eq('user_id', user.id)
        .is('used_at', null)
        .gt('expires_at', now)
        .order('expires_at', { ascending: true })
      setCoupons((data as Coupon[]) || [])
      setCouponsLoading(false)
    })
  }, [])

  const handleProceed = async () => {
    setProceeding(true)
    setError(null)
    const res = await fetch('/api/stripe/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, couponId: selectedCouponId || null }),
    })
    const d = await res.json()
    if (d.error) {
      setError(d.error)
      setProceeding(false)
      return
    }
    setClientSecret(d.clientSecret)
    setTotalAmount(d.totalAmount || 0)
    setOriginalAmount(d.originalAmount || d.totalAmount || 0)
    setDiscountAmount(d.discountAmount || 0)
    setStep('payment')
    setProceeding(false)
  }

  const formatDiscount = (c: Coupon) =>
    c.discount_type === 'amount' ? `¥${c.discount_value.toLocaleString()}割引` : `${c.discount_value}%割引`

  const formatExpiry = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  if (step === 'coupon') {
    return (
      <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
        <div className="max-w-md mx-auto">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>PAYMENT</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, marginBottom: '2.5rem' }}>クーポン選択</h1>

          {couponsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin" size={18} style={{ color: '#cccccc' }} />
            </div>
          ) : (
            <div className="space-y-3 mb-8">
              {/* クーポンなし */}
              <button
                onClick={() => setSelectedCouponId('')}
                style={{
                  width: '100%', textAlign: 'left', padding: '1rem',
                  border: `1px solid ${selectedCouponId === '' ? '#111111' : '#ebebeb'}`,
                  background: selectedCouponId === '' ? '#f9f9f9' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: selectedCouponId === '' ? 600 : 300, color: '#111111' }}>クーポンを使用しない</span>
              </button>

              {coupons.length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: '#cccccc', textAlign: 'center', paddingTop: '0.5rem' }}>利用可能なクーポンはありません</p>
              ) : (
                coupons.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCouponId(c.id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '1rem',
                      border: `1px solid ${selectedCouponId === c.id ? '#111111' : '#ebebeb'}`,
                      background: selectedCouponId === c.id ? '#f9f9f9' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111111' }}>{formatDiscount(c)}</span>
                      {selectedCouponId === c.id && (
                        <span style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: '#111111', fontWeight: 500 }}>✓ 選択中</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: '#999999', marginTop: '0.25rem', fontWeight: 300 }}>
                      有効期限: {formatExpiry(c.expires_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}

          {error && <p style={{ fontSize: '0.75rem', color: '#c0392b', marginBottom: '1rem' }}>{error}</p>}

          <button
            onClick={handleProceed}
            disabled={proceeding || couponsLoading}
            style={{
              width: '100%', padding: '0.875rem',
              fontSize: '0.75rem', letterSpacing: '0.15em',
              border: '1px solid #111111', background: '#111111', color: '#ffffff',
              cursor: proceeding ? 'not-allowed' : 'pointer',
              opacity: proceeding ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              fontWeight: 300,
            }}
          >
            {proceeding && <Loader2 size={14} className="animate-spin" />}
            {selectedCouponId ? 'クーポンを適用して次へ' : '次へ進む'}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href="/bookings" style={{ fontSize: '0.7rem', color: '#999999', textDecoration: 'none' }}>
              ← 予約一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // step === 'payment'
  if (!clientSecret) return null

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: 'ja' }}>
      <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
        <div className="max-w-md mx-auto">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>PAYMENT</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, marginBottom: '2.5rem' }}>お支払い</h1>
          <CheckoutForm
            totalAmount={totalAmount}
            originalAmount={originalAmount}
            discountAmount={discountAmount}
          />
          <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#cccccc', textAlign: 'center' }}>
            Powered by Stripe — カード情報は暗号化されて送信されます
          </p>
        </div>
      </div>
    </Elements>
  )
}
