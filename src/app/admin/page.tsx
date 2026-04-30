import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('is_admin, name').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const [{ count: bookingCount }, { count: userCount }, { count: hairdresserCount }] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'consumer'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'hairdresser'),
  ])

  return (
    <div className="min-h-screen px-8 py-16" style={{ background: '#f9f9f9', color: '#111111' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', background: '#111111', color: '#ffffff', padding: '4px 12px', fontWeight: 500 }}>ADMIN</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '0.02em' }}>管理ダッシュボード</h1>
        </div>

        {/* 統計 */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { label: '総予約数', value: bookingCount ?? 0 },
            { label: 'ゲスト数', value: userCount ?? 0 },
            { label: '美容師数', value: hairdresserCount ?? 0 },
          ].map(stat => (
            <div key={stat.label} className="px-6 py-8" style={{ background: '#ffffff', border: '1px solid #dddddd' }}>
              <p style={{ fontSize: '0.75rem', color: '#555555', marginBottom: '0.5rem', fontWeight: 500 }}>{stat.label}</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: '#111111' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* メニュー */}
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#444444', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>SETTINGS</p>
          <div style={{ border: '1px solid #dddddd', background: '#ffffff' }}>
            <Link
              href="/admin/coupon-settings"
              className="flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors"
              style={{ textDecoration: 'none', color: '#111111', display: 'flex' }}
            >
              <div>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#111111' }}>クーポン設定</p>
                <p style={{ fontSize: '0.8rem', color: '#666666', fontWeight: 400, marginTop: '0.25rem' }}>初回・2回目クーポンのON/OFF・割引額・原資負担を管理</p>
              </div>
              <span style={{ color: '#444444', fontSize: '1rem', fontWeight: 600 }}>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
