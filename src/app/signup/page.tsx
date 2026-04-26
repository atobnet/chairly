'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { UserRole } from '@/types'

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  borderBottom: '1px solid #ebebeb',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  color: '#111111',
  outline: 'none',
  width: '100%',
  padding: '10px 0',
  fontSize: '14px',
  fontWeight: 300,
}

function SignupForm() {
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get('role') as UserRole) || 'consumer'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>(defaultRole)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) { setError(signUpError?.message || '登録に失敗しました'); setLoading(false); return }
    await supabase.from('profiles').insert({ id: data.user.id, role, name })
    if (role === 'hairdresser') await supabase.from('hairdressers').insert({ id: data.user.id, area: '東京' })
    else if (role === 'salon') await supabase.from('salons').insert({ id: data.user.id, address: '', price_per_hour: 0 })
    router.push('/dashboard')
    router.refresh()
  }

  const roles: { value: UserRole; label: string; en: string }[] = [
    { value: 'consumer', label: '消費者', en: 'Consumer' },
    { value: 'hairdresser', label: '美容師', en: 'Hairdresser' },
    { value: 'salon', label: 'サロン', en: 'Salon' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#ffffff' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between p-16" style={{ background: '#111111' }}>
        <Link href="/" className="text-xs tracking-[0.3em]" style={{ color: '#ffffff', fontWeight: 200 }}>CHAIRLY</Link>
        <div>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', fontWeight: 100, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Join us.
          </h2>
          <p className="mt-6 text-xs tracking-widest" style={{ color: '#555555', fontWeight: 300 }}>FREE TO START</p>
        </div>
        <p className="text-xs tracking-widest" style={{ color: '#333333' }}>© 2025 CHAIRLY</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 lg:max-w-md flex flex-col justify-center px-8 py-16 mx-auto w-full">
        <Link href="/" className="lg:hidden text-xs tracking-[0.3em] block mb-16" style={{ color: '#111111', fontWeight: 200 }}>CHAIRLY</Link>

        <p className="text-xs tracking-[0.3em] mb-10" style={{ color: '#cccccc' }}>CREATE ACCOUNT</p>

        <form onSubmit={handleSignup} className="space-y-8">
          {/* Role */}
          <div>
            <label className="block text-xs tracking-widest mb-4" style={{ color: '#cccccc' }}>ROLE</label>
            <div className="flex gap-0" style={{ border: '1px solid #ebebeb' }}>
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className="flex-1 py-3 text-xs tracking-wider transition-all"
                  style={{
                    background: role === r.value ? '#111111' : 'transparent',
                    color: role === r.value ? '#ffffff' : '#cccccc',
                    borderRight: '1px solid #ebebeb',
                    fontWeight: 300,
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs tracking-widest mb-3" style={{ color: '#cccccc' }}>NAME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="山田 花子" style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = '#111111' }} onBlur={e => { e.target.style.borderBottomColor = '#ebebeb' }} />
          </div>
          <div>
            <label className="block text-xs tracking-widest mb-3" style={{ color: '#cccccc' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="hello@example.com" style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = '#111111' }} onBlur={e => { e.target.style.borderBottomColor = '#ebebeb' }} />
          </div>
          <div>
            <label className="block text-xs tracking-widest mb-3" style={{ color: '#cccccc' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="6文字以上" style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = '#111111' }} onBlur={e => { e.target.style.borderBottomColor = '#ebebeb' }} />
          </div>

          {error && <p className="text-xs" style={{ color: '#999999' }}>{error}</p>}

          <div className="pt-4">
            <button type="submit" disabled={loading}
              className="w-full py-4 text-xs tracking-[0.25em] flex items-center justify-center gap-2 transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ background: '#111111', color: '#ffffff', fontWeight: 300 }}>
              {loading && <Loader2 size={12} className="animate-spin" />}
              アカウントを作成
            </button>
          </div>
        </form>

        <p className="text-xs mt-10" style={{ color: '#cccccc' }}>
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="transition-opacity hover:opacity-50" style={{ color: '#111111', borderBottom: '1px solid #ebebeb', paddingBottom: '1px' }}>
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>
}
