import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendBookingRequestMail } from '@/lib/mail'

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
      hairdresser_availability(hairdresser_id, date, start_time),
      salons(profiles(name)),
      profiles!bookings_consumer_id_fkey(name)
    `)
    .eq('id', bookingId)
    .eq('consumer_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const hairdresserId = booking.hairdresser_availability?.hairdresser_id
  if (!hairdresserId) return NextResponse.json({ ok: true })

  // 美容師名を取得
  const { data: hdProfile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', hairdresserId)
    .single()

  // 美容師のメールアドレスをadmin APIで取得
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user: hairdresserUser } } = await admin.auth.admin.getUserById(hairdresserId)
  if (!hairdresserUser?.email) return NextResponse.json({ ok: true })

  try {
    await sendBookingRequestMail({
      toEmail: hairdresserUser.email,
      toName: hdProfile?.name || '美容師',
      consumerName: booking.profiles?.name || 'お客様',
      date: booking.booked_date || '',
      time: (booking.booked_start_time || '').slice(0, 5),
      menu: booking.menu || '未指定',
      salonName: booking.salons?.profiles?.name || '',
    })
  } catch (e) {
    console.error('Mail send error:', e)
  }

  return NextResponse.json({ ok: true })
}
