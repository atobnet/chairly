import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RestoreButton from './RestoreButton'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function WithdrawPendingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('deleted_at')
    .eq('id', user.id)
    .single()

  if (!profile?.deleted_at) redirect('/mypage')

  const deletedAt = new Date(profile.deleted_at)
  const deleteScheduledAt = new Date(deletedAt.getTime() + 14 * 24 * 60 * 60 * 1000)
  const isRestorable = Date.now() < deleteScheduledAt.getTime()

  return (
    <div
      className="min-h-screen px-6 py-16"
      style={{ background: '#ffffff', color: '#111111', fontWeight: 300, letterSpacing: '0.04em' }}
    >
      <div className="max-w-lg mx-auto">
        <p style={{ fontSize: '0.65rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.75rem', fontWeight: 300 }}>
          ACCOUNT
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 100, marginBottom: '3rem' }}>退会手続き中</h1>

        <div
          style={{
            border: '1px solid #ebebeb',
            padding: '2rem',
            marginBottom: '2.5rem',
          }}
        >
          <p style={{ fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            退会手続きを受け付けました。
            <br />
            現在、アカウントの削除待機中です。
          </p>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.4rem 1rem 0.4rem 0', color: '#999999', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  退会申請日
                </td>
                <td style={{ padding: '0.4rem 0', fontSize: '0.85rem' }}>
                  {formatDate(profile.deleted_at)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.4rem 1rem 0.4rem 0', color: '#999999', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  完全削除予定日
                </td>
                <td style={{ padding: '0.4rem 0', fontSize: '0.85rem', fontWeight: 500 }}>
                  {formatDate(deleteScheduledAt.toISOString())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {isRestorable ? (
          <div>
            <p style={{ fontSize: '0.8rem', color: '#666666', marginBottom: '1.5rem', lineHeight: 1.8 }}>
              完全削除予定日までの間は、退会を取り消すことができます。
            </p>
            <RestoreButton />
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: '#999999' }}>
            猶予期間が終了しました。アカウントは間もなく削除されます。
          </p>
        )}
      </div>
    </div>
  )
}
