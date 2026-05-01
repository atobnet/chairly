import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'

// vercel.json: { "crons": [{ "path": "/api/cron/hard-delete", "schedule": "0 3 * * *" }] }

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const serviceClient = createServiceClient()
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: targets, error } = await serviceClient
    .from('profiles')
    .select('id, stripe_account_id')
    .not('deleted_at', 'is', null)
    .lte('deleted_at', cutoff)

  if (error) {
    console.error('hard-delete: fetch targets failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!targets || targets.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const stripe = getStripe()
  let processed = 0
  const errors: string[] = []

  for (const target of targets) {
    try {
      // 1. 予約レコードの匿名化（bookings の FK を NULL にして取引記録を保持）
      await serviceClient
        .from('bookings')
        .update({ consumer_id: null })
        .eq('consumer_id', target.id)

      const { data: availabilities } = await serviceClient
        .from('hairdresser_availability')
        .select('id')
        .eq('hairdresser_id', target.id)

      if (availabilities && availabilities.length > 0) {
        const avIds = availabilities.map((a: { id: string }) => a.id)
        await serviceClient
          .from('bookings')
          .update({ hairdresser_availability_id: null })
          .in('hairdresser_availability_id', avIds)
      }

      // 2. Stripe アカウント削除（残高ゼロ確認後）
      if (target.stripe_account_id) {
        try {
          const balance = await stripe.balance.retrieve(
            {},
            { stripeAccount: target.stripe_account_id }
          )
          const hasBalance =
            balance.available.some((b) => b.amount !== 0) ||
            balance.pending.some((b) => b.amount !== 0)

          if (!hasBalance) {
            await stripe.accounts.del(target.stripe_account_id)
          } else {
            errors.push(`${target.id}: Stripe残高あり・スキップ`)
            continue
          }
        } catch {
          // 既に削除済みの場合は無視
        }
      }

      // 3. auth.users から削除（profiles は ON DELETE CASCADE で連鎖削除）
      const { error: deleteError } = await serviceClient.auth.admin.deleteUser(target.id)
      if (deleteError) {
        errors.push(`${target.id}: auth削除失敗 - ${deleteError.message}`)
        continue
      }

      processed++
    } catch (err) {
      errors.push(`${target.id}: ${String(err)}`)
    }
  }

  return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined })
}
