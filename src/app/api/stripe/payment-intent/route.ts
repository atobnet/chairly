import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  // ⚠️ 金額は必ずDBから取得（クライアントの値は使わない）
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, menu, consumer_id, status, payment_status, payment_intent_id,
      hairdresser_availability(hairdresser_id)
    `)
    .eq('id', bookingId)
    .eq('consumer_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.status !== 'confirmed') return NextResponse.json({ error: 'Booking not confirmed' }, { status: 400 })
  if (booking.payment_status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  // 既存のpayment_intentがあれば再利用
  if (booking.payment_intent_id) {
    const stripe = getStripe()
    const existing = await stripe.paymentIntents.retrieve(booking.payment_intent_id)
    if (existing.status === 'requires_payment_method' || existing.status === 'requires_confirmation') {
      return NextResponse.json({ clientSecret: existing.client_secret, totalAmount: existing.amount })
    }
  }

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
  const totalAmount = Math.round(menuPrice * 1.1)    // 消費者支払い額（税込み10%手数料）
  const hairdresserAmount = Math.round(menuPrice * 0.7)
  const salonAmount = Math.round(menuPrice * 0.2)

  const hairdresserStripeId = ((hairdresser.profiles as unknown) as { stripe_account_id: string | null })?.stripe_account_id || ''

  const stripe = getStripe()
  const paymentIntent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency: 'jpy',
    capture_method: 'manual',
    metadata: {
      bookingId,
      menuPrice: String(menuPrice),
      hairdresserAmount: String(hairdresserAmount),
      salonAmount: String(salonAmount),
      hairdresserStripeId,
    },
  })

  await supabase.from('bookings')
    .update({ payment_intent_id: paymentIntent.id })
    .eq('id', bookingId)

  return NextResponse.json({ clientSecret: paymentIntent.client_secret, totalAmount })
}
