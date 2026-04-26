import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendBookingConfirmedMail } from '@/lib/mail'

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
      salons(profiles(name)),
      profiles!bookings_consumer_id_fkey(id, name)
    `)
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const consumerId = booking.profiles?.id || booking.consumer_id
  if (!consumerId) return NextResponse.json({ ok: true })

  // 美容師名を取得
  const { data: hdProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  // 消費者のメールアドレスをadmin APIで取得
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user: consumerUser } } = await admin.auth.admin.getUserById(consumerId)
  if (!consumerUser?.email) return NextResponse.json({ ok: true })

  try {
    await sendBookingConfirmedMail({
      toEmail: consumerUser.email,
      toName: booking.profiles?.name || 'お客様',
      hairdresserName: hdProfile?.name || '美容師',
      date: booking.booked_date || '',
      time: (booking.booked_start_time || '').slice(0, 5),
      salonName: booking.salons?.profiles?.name || '',
    })
  } catch (e) {
    console.error('Mail send error:', e)
  }

  return NextResponse.json({ ok: true })
}
