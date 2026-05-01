import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'
import { sendWithdrawConfirmationMail } from '@/lib/mail'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()

  // 進行中の予約チェック（消費者として）
  const { data: activeAsConsumer } = await serviceClient
    .from('bookings')
    .select('id')
    .eq('consumer_id', user.id)
    .in('status', ['pending', 'confirmed'])
    .in('payment_status', ['paid', 'authorized'])
    .limit(1)

  if (activeAsConsumer && activeAsConsumer.length > 0) {
    return NextResponse.json(
      { error: '進行中の予約があります。全ての予約が完了またはキャンセルされてから退会してください。' },
      { status: 400 }
    )
  }

  // 進行中の予約チェック（美容師として）
  const { data: myAvailabilities } = await serviceClient
    .from('hairdresser_availability')
    .select('id')
    .eq('hairdresser_id', user.id)

  if (myAvailabilities && myAvailabilities.length > 0) {
    const avIds = myAvailabilities.map((a: { id: string }) => a.id)
    const { data: activeAsHairdresser } = await serviceClient
      .from('bookings')
      .select('id')
      .in('hairdresser_availability_id', avIds)
      .in('status', ['pending', 'confirmed'])
      .in('payment_status', ['paid', 'authorized'])
      .limit(1)

    if (activeAsHairdresser && activeAsHairdresser.length > 0) {
      return NextResponse.json(
        { error: '担当中の予約があります。全ての予約が完了またはキャンセルされてから退会してください。' },
        { status: 400 }
      )
    }
  }

  // Stripe残高チェック（stripe_account_id を持つユーザーのみ）
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('stripe_account_id, name')
    .eq('id', user.id)
    .single()

  if (profile?.stripe_account_id) {
    const stripe = getStripe()
    try {
      const balance = await stripe.balance.retrieve(
        {},
        { stripeAccount: profile.stripe_account_id }
      )
      const hasBalance =
        balance.available.some((b) => b.amount !== 0) ||
        balance.pending.some((b) => b.amount !== 0)
      if (hasBalance) {
        return NextResponse.json(
          { error: 'Stripeに残高が残っています。ペイアウトが完了してから退会してください。' },
          { status: 400 }
        )
      }
    } catch {
      // アカウントが既に削除されている場合は無視
    }
  }

  // ソフトデリート
  const now = new Date()
  await serviceClient
    .from('profiles')
    .update({ deleted_at: now.toISOString() })
    .eq('id', user.id)

  const deleteScheduledAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  // 退会確認メール送信
  try {
    await sendWithdrawConfirmationMail({
      toEmail: user.email!,
      toName: profile?.name ?? 'ユーザー',
      deleteScheduledAt,
    })
  } catch (err) {
    console.error('退会確認メール送信失敗:', err)
  }

  return NextResponse.json({ ok: true, deleteScheduledAt })
}
