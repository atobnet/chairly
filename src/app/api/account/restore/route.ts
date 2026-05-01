import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('deleted_at')
    .eq('id', user.id)
    .single()

  if (!profile?.deleted_at) {
    return NextResponse.json({ error: '退会手続き中ではありません。' }, { status: 400 })
  }

  const deletedAt = new Date(profile.deleted_at).getTime()
  if (Date.now() - deletedAt > GRACE_PERIOD_MS) {
    return NextResponse.json(
      { error: '猶予期間（14日間）が過ぎたため、退会を取り消せません。' },
      { status: 400 }
    )
  }

  await serviceClient
    .from('profiles')
    .update({ deleted_at: null })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
