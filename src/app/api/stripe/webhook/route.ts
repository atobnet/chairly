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

  if (event.type === 'payment_intent.amount_capturable_updated') {
    const pi = event.data.object as Stripe.PaymentIntent
    await supabase.from('bookings')
      .update({ payment_status: 'authorized' })
      .eq('payment_intent_id', pi.id)
      .neq('status', 'cancelled')
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    const { bookingId, hairdresserAmount, salonAmount, hairdresserStripeId, salonStripeId, couponId } = pi.metadata

    await supabase.from('bookings')
      .update({ payment_status: 'paid' })
      .eq('payment_intent_id', pi.id)
      .neq('status', 'cancelled')

    if (couponId) {
      await supabase.from('coupons')
        .update({ used_at: new Date().toISOString(), used: true })
        .eq('id', couponId)
    }

    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('consumer_id, hairdresser_availability(hairdresser_id)')
        .eq('id', bookingId)
        .single()

      if (booking?.consumer_id) {
        // 初回クーポン発行
        const { count: paidCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('consumer_id', booking.consumer_id)
          .eq('payment_status', 'paid')
          .neq('id', bookingId)

        if (paidCount === 0) {
          const { data: couponSettings } = await supabase
            .from('coupon_settings')
            .select('*')
            .eq('is_active', true)

          if (couponSettings && couponSettings.length > 0) {
            const now = Date.now()
            const inserts = couponSettings.map((cs: { coupon_type: string; discount_type: string; discount_value: number; funding_type: string; expires_days: number }) => ({
              user_id: booking.consumer_id,
              discount_type: cs.discount_type,
              discount_value: cs.discount_value,
              discount_rate: cs.discount_type === 'rate' ? cs.discount_value : null,
              funding_type: cs.funding_type,
              expires_at: new Date(now + cs.expires_days * 24 * 60 * 60 * 1000).toISOString(),
            }))
            await supabase.from('coupons').insert(inserts)
          }
        }

        // スタンプ付与
        const hairdresserId = (booking as { hairdresser_availability?: { hairdresser_id?: string } | null }).hairdresser_availability?.hairdresser_id
        if (hairdresserId) {
          const { data: stampCard } = await supabase
            .from('stamp_cards')
            .select('id, stamps_required, reward_description, is_active')
            .eq('hairdresser_id', hairdresserId)
            .eq('is_active', true)
            .maybeSingle()

          if (stampCard) {
            // guest_stamps を upsert（stamp_count + 1, total_stamps + 1）
            const { data: existing } = await supabase
              .from('guest_stamps')
              .select('id, stamp_count, total_stamps')
              .eq('guest_id', booking.consumer_id)
              .eq('hairdresser_id', hairdresserId)
              .maybeSingle()

            const newCount = (existing?.stamp_count ?? 0) + 1
            const newTotal = (existing?.total_stamps ?? 0) + 1

            if (existing) {
              await supabase.from('guest_stamps')
                .update({ stamp_count: newCount, total_stamps: newTotal, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
            } else {
              await supabase.from('guest_stamps').insert({
                guest_id: booking.consumer_id,
                hairdresser_id: hairdresserId,
                stamp_count: 1,
                total_stamps: 1,
              })
            }

            // スタンプ履歴
            await supabase.from('stamp_history').insert({
              guest_id: booking.consumer_id,
              hairdresser_id: hairdresserId,
              booking_id: bookingId,
              action: 'earn',
            })
          }
        }
      }

      if (hairdresserStripeId) {
        await stripe.transfers.create({
          amount: Number(hairdresserAmount),
          currency: 'jpy',
          destination: hairdresserStripeId,
          transfer_group: bookingId,
        })
      }

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

  // account.deleted は Stripe SDK の型定義に含まれないため文字列比較
  if ((event.type as string) === 'account.deleted') {
    const account = event.data.object as Stripe.Account
    await supabase
      .from('profiles')
      .update({ stripe_account_id: null })
      .eq('stripe_account_id', account.id)
  }

  return NextResponse.json({ received: true })
}
