import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendBookingCancelledMail } from '@/lib/mail'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      hairdresser_availability(hairdresser_id),
      profiles!bookings_consumer_id_fkey(id, name)
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const date = booking.booked_date || ''
  const time = (booking.booked_start_time || '').slice(0, 5)

  // キャンセルした側に応じて相手方にメール送信
  const isHairdresser = user.id === booking.hairdresser_availability?.hairdresser_id
  const targetId = isHairdresser
    ? booking.profiles?.id || booking.consumer_id  // 美容師がキャンセル → 消費者に通知
    : booking.hairdresser_availability?.hairdresser_id  // 消費者がキャンセル → 美容師に通知

  if (!targetId) return NextResponse.json({ ok: true })

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', targetId)
    .single()

  const { data: { user: targetUser } } = await admin.auth.admin.getUserById(targetId)
  if (!targetUser?.email) return NextResponse.json({ ok: true })

  try {
    await sendBookingCancelledMail({
      toEmail: targetUser.email,
      toName: targetProfile?.name || '様',
      date,
      time,
    })
  } catch (e) {
    console.error('Mail send error:', e)
  }

  return NextResponse.json({ ok: true })
}
