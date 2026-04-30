import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { hairdresserId } = await req.json()
  if (!hairdresserId) return NextResponse.json({ error: 'hairdresserId required' }, { status: 400 })

  const serviceClient = createServiceClient()

  const [{ data: guestStamp }, { data: stampCard }] = await Promise.all([
    serviceClient.from('guest_stamps')
      .select('id, stamp_count, total_stamps')
      .eq('guest_id', user.id)
      .eq('hairdresser_id', hairdresserId)
      .single(),
    serviceClient.from('stamp_cards')
      .select('id, stamps_required, reward_description, is_active')
      .eq('hairdresser_id', hairdresserId)
      .single(),
  ])

  if (!guestStamp || !stampCard) {
    return NextResponse.json({ error: 'スタンプカードが見つかりません' }, { status: 404 })
  }

  if (!stampCard.is_active) {
    return NextResponse.json({ error: 'このスタンプカードは現在無効です' }, { status: 400 })
  }

  if (guestStamp.stamp_count < stampCard.stamps_required) {
    return NextResponse.json({ error: 'スタンプが不足しています' }, { status: 400 })
  }

  // クーポン発行（特典内容を割引として発行）
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: coupon, error: couponError } = await serviceClient.from('coupons').insert({
    user_id: user.id,
    discount_type: 'amount',
    discount_value: 0,
    funding_type: 'stamp',
    expires_at: expiresAt,
    reward_description: stampCard.reward_description,
  }).select().single()

  if (couponError) {
    console.error('Coupon insert error:', couponError)
    return NextResponse.json({ error: 'クーポン発行に失敗しました' }, { status: 500 })
  }

  // スタンプリセット（累計は保持）
  await serviceClient.from('guest_stamps')
    .update({ stamp_count: 0, updated_at: new Date().toISOString() })
    .eq('id', guestStamp.id)

  // 履歴記録
  await serviceClient.from('stamp_history').insert({
    guest_id: user.id,
    hairdresser_id: hairdresserId,
    action: 'redeem',
  })

  return NextResponse.json({ success: true, coupon })
}
