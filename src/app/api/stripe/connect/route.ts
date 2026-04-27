import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripe = getStripe()
  const account = await stripe.accounts.create({ type: 'express', country: 'JP' })

  await supabase.from('profiles').update({
    stripe_account_id: account.id,
  }).eq('id', user.id)

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?stripe=connected`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
