import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId, couponId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  // ⚠️ 金額は必ずDBから取得（クライアントの値は使わない）
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, menu, consumer_id, salon_id, status, payment_status, payment_intent_id,
      hairdresser_availability(hairdresser_id)
    `)
    .eq('id', bookingId)
    .eq('consumer_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.payment_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  // 美容師のメニュー価格をDBから取得
  const hairdresserId = ((booking.hairdresser_availability as unknown) as { hairdresser_id: string } | null)?.hairdresser_id
  if (!hairdresserId) return NextResponse.json({ error: 'Hairdresser not found' }, { status: 400 })

  const { data: hairdresser } = await supabase
    .from('hairdressers')
    .select('menus, profiles!inner(stripe_account_id)')
    .eq('id', hairdresserId)
    .single()

  if (!hairdresser) return NextResponse.json({ error: 'Hairdresser not found' }, { status: 404 })

  const menus = (hairdresser.menus || []) as { name: string; price: number }[]
  const menuItem = menus.find(m => m.name === booking.menu)
  if (!menuItem) return NextResponse.json({ error: 'Menu price not found' }, { status: 400 })

  const menuPrice = menuItem.price
  const baseTotal = Math.round(menuPrice * 1.1)    // 消費者支払い額（税込み10%手数料）
  let hairdresserAmount = Math.round(menuPrice * 0.7)
  let salonAmount = Math.round(menuPrice * 0.2)

  const hairdresserStripeId = ((hairdresser.profiles as unknown) as { stripe_account_id: string | null })?.stripe_account_id || ''

  // サロンのStripe account IDをDBから取得
  const { data: salonProfile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', booking.salon_id)
    .single()
  const salonStripeId = salonProfile?.stripe_account_id ?? ''

  // クーポンバリデーション・割引計算（サーバーサイドで実施）
  let discountAmount = 0
  let validatedCouponId = ''
  if (couponId) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, discount_type, discount_value, funding_type, expires_at, used_at')
      .eq('id', couponId)
      .eq('user_id', user.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!coupon) return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 400 })

    discountAmount = coupon.discount_type === 'amount'
      ? coupon.discount_value
      : Math.round(baseTotal * coupon.discount_value / 100)

    // funding_type に応じてTransfer額を調整
    if (coupon.funding_type === 'hairdresser') {
      hairdresserAmount = Math.max(hairdresserAmount - discountAmount, 0)
    } else if (coupon.funding_type === 'split') {
      const half = Math.round(discountAmount / 2)
      hairdresserAmount = Math.max(hairdresserAmount - half, 0)
      salonAmount = Math.max(salonAmount - half, 0)
    }
    // chairly: Transfer額はそのまま（Chairlyの取り分が減る）

    validatedCouponId = coupon.id
  }

  const finalAmount = Math.max(baseTotal - discountAmount, 1)

  const stripe = getStripe()
  const metadata = {
    bookingId,
    menuPrice: String(menuPrice),
    hairdresserAmount: String(hairdresserAmount),
    salonAmount: String(salonAmount),
    hairdresserStripeId,
    salonStripeId,
    couponId: validatedCouponId,
    discountAmount: String(discountAmount),
  }

  // 既存のPaymentIntentがあれば金額・メタデータを更新して再利用
  if (booking.payment_intent_id) {
    try {
      const existing = await stripe.paymentIntents.retrieve(booking.payment_intent_id)
      if (existing.status === 'requires_payment_method' || existing.status === 'requires_confirmation') {
        const updated = await stripe.paymentIntents.update(booking.payment_intent_id, { amount: finalAmount, metadata })
        return NextResponse.json({
          clientSecret: updated.client_secret,
          totalAmount: finalAmount,
          originalAmount: baseTotal,
          discountAmount,
        })
      }
    } catch {
      // 取得失敗時は新規作成にフォールバック
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: finalAmount,
    currency: 'jpy',
    capture_method: 'automatic',
    metadata,
  })

  await supabase.from('bookings')
    .update({ payment_intent_id: paymentIntent.id })
    .eq('id', bookingId)

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    totalAmount: finalAmount,
    originalAmount: baseTotal,
    discountAmount,
  })
}
