'use client'
import { useState, useEffect, use } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

const CheckoutForm = dynamic(() => import('@/components/CheckoutForm'), { ssr: false })

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function PaymentPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stripe/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error)
        } else {
          setClientSecret(d.clientSecret)
          setTotalAmount(d.totalAmount || 0)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('ネットワークエラーが発生しました')
        setLoading(false)
      })
  }, [bookingId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <Loader2 className="animate-spin" size={20} style={{ color: '#cccccc' }} />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#ffffff' }}>
      <p style={{ color: '#999999', fontSize: '0.875rem', fontWeight: 300 }}>{error}</p>
      <Link href="/bookings" style={{ fontSize: '0.75rem', color: '#111111', borderBottom: '1px solid #111111', paddingBottom: '1px', textDecoration: 'none' }}>
        予約一覧に戻る
      </Link>
    </div>
  )

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: clientSecret!, locale: 'ja' }}>
      <div className="min-h-screen px-6 py-16" style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}>
        <div className="max-w-md mx-auto">
          <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>PAYMENT</p>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 100, marginBottom: '2.5rem' }}>お支払い</h1>
          <CheckoutForm totalAmount={totalAmount} />
          <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#cccccc', textAlign: 'center' }}>
            Powered by Stripe — カード情報は暗号化されて送信されます
          </p>
        </div>
      </div>
    </Elements>
  )
}
