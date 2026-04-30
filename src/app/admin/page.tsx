import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('is_admin, name').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  // 簡易統計
  const [{ count: bookingCount }, { count: userCount }, { count: hairdresserCount }] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'consumer'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'hairdresser'),
  ])

  return (
    <div className="min-h-screen px-8 py-16" style={{ background: '#ffffff', color: '#111111' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <div>
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '0.5rem' }}>ADMIN DASHBOARD</p>
            <h1 style={{ fontSize: '2rem', fontWeight: 100, letterSpacing: '0.04em' }}>管理画面</h1>
          </div>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', background: '#111111', color: '#ffffff', padding: '3px 10px', fontWeight: 300 }}>ADMIN</span>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-3 gap-px mb-16" style={{ background: '#ebebeb' }}>
          {[
            { label: '総予約数', value: bookingCount ?? 0 },
            { label: 'ゲスト数', value: userCount ?? 0 },
            { label: '美容師数', value: hairdresserCount ?? 0 },
          ].map(stat => (
            <div key={stat.label} className="px-8 py-10" style={{ background: '#ffffff' }}>
              <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#cccccc', marginBottom: '0.5rem' }}>{stat.label}</p>
              <p style={{ fontSize: '2rem', fontWeight: 100 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* メニュー */}
        <div>
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: '#cccccc', marginBottom: '1.5rem' }}>SETTINGS</p>
          <div style={{ border: '1px solid #ebebeb' }}>
            <Link
              href="/admin/coupon-settings"
              className="flex items-center justify-between px-6 py-5 transition-colors hover:bg-gray-50"
              style={{ textDecoration: 'none', color: '#111111', display: 'flex' }}
            >
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 300 }}>クーポン設定</p>
                <p style={{ fontSize: '0.75rem', color: '#999999', fontWeight: 300, marginTop: '0.25rem' }}>初回・2回目クーポンのON/OFF・割引額・原資負担を管理</p>
              </div>
              <span style={{ color: '#cccccc', fontSize: '0.75rem' }}>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
