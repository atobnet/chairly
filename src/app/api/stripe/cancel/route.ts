import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

// キャンセルポリシー: 消費者キャンセルの返金率（JST カレンダー日付で比較）
function calcRefundRate(bookedDate: string): number {
  // 現在のJST日付（時刻を切り捨て）
  const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const nowDay = new Date(nowJST.getFullYear(), nowJST.getMonth(), nowJST.getDate())

  // 予約日（YYYY-MM-DD → JST当日0時）
  const [y, m, d] = bookedDate.split('-').map(Number)
  const bookedDay = new Date(y, m - 1, d)

  const diffDays = Math.round((bookedDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays >= 7) return 1.0  // 全額返金
  if (diffDays >= 3) return 0.7  // 30%キャンセル料
  if (diffDays >= 1) return 0.5  // 50%キャンセル料
  return 0.0                      // 当日：返金なし
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId, cancelledBy } = await req.json()
  if (!bookingId || !cancelledBy) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, hairdresser_availability(hairdresser_id, date)')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 操作権限の確認
  const isConsumer = booking.consumer_id === user.id
  const isHairdresser = (booking.hairdresser_availability as { hairdresser_id: string } | null)?.hairdresser_id === user.id
  const isSalon = booking.salon_id === user.id
  if (!isConsumer && !isHairdresser && !isSalon) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let paymentStatusUpdate: string = 'refunded'

  // 決済済み（authorized含む）の場合のみStripe返金処理
  if (booking.payment_intent_id && (booking.payment_status === 'paid' || booking.payment_status === 'authorized')) {
    const stripe = getStripe()
    const pi = await stripe.paymentIntents.retrieve(booking.payment_intent_id)
    const totalAmount = pi.amount_received || pi.amount

    let refundAmount: number
    if (cancelledBy === 'consumer') {
      const bookedDate = booking.booked_date
        || (booking.hairdresser_availability as { date: string } | null)?.date
        || ''
      const refundRate = calcRefundRate(bookedDate)
      refundAmount = Math.round(totalAmount * refundRate)
    } else {
      // 美容師・サロンキャンセルは全額返金
      refundAmount = totalAmount
    }

    if (refundAmount > 0) {
      if (refundAmount < totalAmount) {
        // 部分返金
        await stripe.refunds.create({
          payment_intent: booking.payment_intent_id,
          amount: refundAmount,
        })
        paymentStatusUpdate = 'partially_refunded'
      } else {
        // 全額返金
        if (pi.status === 'requires_capture') {
          // まだcaptureしていない場合はキャンセル
          await stripe.paymentIntents.cancel(booking.payment_intent_id)
        } else {
          await stripe.refunds.create({
            payment_intent: booking.payment_intent_id,
          })
        }
        paymentStatusUpdate = 'refunded'
      }
    } else {
      // 返金なし（当日キャンセル）
      paymentStatusUpdate = 'partially_refunded'
    }

    await supabase.from('bookings')
      .update({ status: 'cancelled', payment_status: paymentStatusUpdate })
      .eq('id', bookingId)
  } else {
    // 未決済の場合はステータス変更のみ
    await supabase.from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
  }

  // 美容師・サロンキャンセルの場合：警告カウント + クーポン発行
  if (cancelledBy === 'hairdresser' || cancelledBy === 'salon') {
    await supabase.rpc('add_cancel_warning', {
      p_user_id: user.id,
      p_booking_id: bookingId,
      p_reason: cancelledBy,
    })

    await supabase.from('coupons').insert({
      user_id: booking.consumer_id,
      discount_rate: 10,
    })
  }

  return NextResponse.json({ ok: true })
}
