'use client'
import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'

interface Props {
  totalAmount: number
  originalAmount?: number
  discountAmount?: number
  returnUrl?: string
}

export default function CheckoutForm({ totalAmount, originalAmount, discountAmount, returnUrl }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl || `${window.location.origin}/bookings?payment=complete`,
      },
    })

    if (submitError) {
      setError(submitError.message || '決済に失敗しました')
      setProcessing(false)
    }
  }

  const hasDiscount = discountAmount && discountAmount > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <p style={{ fontSize: '0.75rem', color: '#c0392b', fontWeight: 300 }}>{error}</p>
      )}
      <div style={{ paddingTop: '0.5rem', borderTop: '1px solid #ebebeb' }}>
        {hasDiscount && (
          <>
            <div className="flex justify-between mb-2" style={{ fontSize: '0.8rem', color: '#999999', fontWeight: 300 }}>
              <span>小計</span>
              <span>¥{(originalAmount ?? totalAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-3" style={{ fontSize: '0.8rem', color: '#4a7c59', fontWeight: 300 }}>
              <span>クーポン割引</span>
              <span>－¥{discountAmount.toLocaleString()}</span>
            </div>
          </>
        )}
        <div className="flex justify-between mb-4" style={{ fontSize: '0.875rem', color: '#111111', fontWeight: hasDiscount ? 600 : 300 }}>
          <span>お支払い金額</span>
          <span>¥{totalAmount.toLocaleString()}</span>
        </div>
        <button
          type="submit"
          disabled={!stripe || processing}
          style={{
            width: '100%',
            padding: '0.875rem',
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            border: '1px solid #111111',
            background: '#111111',
            color: '#ffffff',
            cursor: processing ? 'not-allowed' : 'pointer',
            opacity: processing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: 300,
          }}
        >
          {processing && <Loader2 size={14} className="animate-spin" />}
          決済する
        </button>
      </div>
    </form>
  )
}
