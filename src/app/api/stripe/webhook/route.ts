import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'

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

  const supabase = createServiceClient()

  // manual capture: カード承認時（サービス完了後にキャプチャ）
  if (event.type === 'payment_intent.amount_capturable_updated') {
    const pi = event.data.object as Stripe.PaymentIntent
    await supabase.from('bookings')
      .update({ payment_status: 'authorized' })
      .eq('payment_intent_id', pi.id)
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { bookingId, hairdresserAmount, salonAmount, hairdresserStripeId, salonStripeId } = pi.metadata

    // payment_intent_idで直接検索
    await supabase.from('bookings')
      .update({ payment_status: 'paid' })
      .eq('payment_intent_id', pi.id)

    if (bookingId) {

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
    await supabase.from('bookings')
      .update({ payment_status: 'unpaid' })
      .eq('payment_intent_id', pi.id)
  }

  return NextResponse.json({ received: true })
}
