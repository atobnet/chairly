import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    // ⚠️ 署名検証必須（偽リクエスト防止）
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { bookingId, hairdresserAmount, salonAmount, hairdresserStripeId, salonStripeId } = pi.metadata

    if (bookingId) {
      await supabase.from('bookings')
        .update({ payment_status: 'paid' })
        .eq('id', bookingId)

      // 美容師に送金
      if (hairdresserStripeId) {
        await stripe.transfers.create({
          amount: Number(hairdresserAmount),
          currency: 'jpy',
          destination: hairdresserStripeId,
          transfer_group: bookingId,
        })
      }

      // サロンに送金
      if (salonStripeId) {
        await stripe.transfers.create({
          amount: Number(salonAmount),
          currency: 'jpy',
          destination: salonStripeId,
          transfer_group: bookingId,
        })
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { bookingId } = pi.metadata
    if (bookingId) {
      await supabase.from('bookings')
        .update({ payment_status: 'unpaid' })
        .eq('id', bookingId)
    }
  }

  return NextResponse.json({ received: true })
}
