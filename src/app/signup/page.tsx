'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import type { UserRole } from '@/types'

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
    if (signUpError || !data.user) {
      setError(signUpError?.message || '登録に失敗しました')
      setLoading(false)
      return
    }

    await supabase.from('profiles').insert({ id: data.user.id, role, name })

    if (role === 'hairdresser') {
      await supabase.from('hairdressers').insert({ id: data.user.id, area: '東京' })
    } else if (role === 'salon') {
      await supabase.from('salons').insert({ id: data.user.id, address: '', price_per_hour: 0 })
    }

    router.push('/dashboard')
    router.refresh()
  }

  const roles: { value: UserRole; label: string; sub: string }[] = [
    { value: 'consumer', label: '消費者', sub: 'Consumer' },
    { value: 'hairdresser', label: '美容師', sub: 'Hairdresser' },
    { value: 'salon', label: 'サロン', sub: 'Salon' },
  ]

  const inputStyle = {
    background: 'transparent',
    borderColor: '#e2dcd4',
    color: '#1a1410',
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f7f4ef' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16" style={{ background: '#1a1410' }}>
        <Link href="/" className="font-serif text-xl tracking-[0.2em]" style={{ color: '#f7f4ef' }}>CHAIRLY</Link>
        <div>
          <h2 className="font-serif text-5xl leading-tight mb-6" style={{ fontWeight: 300, color: '#f7f4ef' }}>
            あなたの<br />
            <em style={{ color: '#6b7c5c', fontStyle: 'italic' }}>物語</em>を<br />
            始めよう。
          </h2>
        </div>
        <p className="text-xs tracking-widest" style={{ color: '#3a3028' }}>© 2025 CHAIRLY</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16">
        <div className="max-w-sm w-full mx-auto">
          <Link href="/" className="lg:hidden font-serif text-xl tracking-[0.2em] block mb-12" style={{ color: '#1a1410' }}>CHAIRLY</Link>

          <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>CREATE ACCOUNT</p>
          <h1 className="font-serif text-3xl mb-10" style={{ fontWeight: 300 }}>アカウント作成</h1>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Role */}
            <div>
              <label className="block text-xs tracking-widest mb-3" style={{ color: '#6b6459' }}>ROLE</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className="py-3 px-2 text-center border transition-all"
                    style={{
                      borderColor: role === r.value ? '#1a1410' : '#e2dcd4',
                      background: role === r.value ? '#1a1410' : 'transparent',
                      color: role === r.value ? '#f7f4ef' : '#6b6459',
                    }}
                  >
                    <div className="text-xs font-medium">{r.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: role === r.value ? '#6b7c5c' : '#c9b99a', fontSize: '10px' }}>{r.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田 花子"
                className="w-full px-4 py-3 text-sm border focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6b7c5c'}
                onBlur={e => e.target.style.borderColor = '#e2dcd4'}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="hello@example.com"
                className="w-full px-4 py-3 text-sm border focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6b7c5c'}
                onBlur={e => e.target.style.borderColor = '#e2dcd4'}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="6文字以上"
                className="w-full px-4 py-3 text-sm border focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#6b7c5c'}
                onBlur={e => e.target.style.borderColor = '#e2dcd4'}
              />
            </div>

            {error && <p className="text-xs" style={{ color: '#85403b' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-xs tracking-[0.2em] border transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ borderColor: '#1a1410', color: '#1a1410' }}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              アカウントを作成
            </button>
          </form>

          <p className="text-xs mt-8" style={{ color: '#a09890' }}>
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="underline underline-offset-4 hover:opacity-60" style={{ color: '#6b6459' }}>ログイン</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>
}
