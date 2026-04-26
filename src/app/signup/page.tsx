'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors, Mail, Lock, User, Building2, Loader2 } from 'lucide-react'
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

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      role,
      name,
    })

    if (profileError) {
      setError('プロフィールの作成に失敗しました: ' + profileError.message)
      setLoading(false)
      return
    }

    if (role === 'hairdresser') {
      await supabase.from('hairdressers').insert({ id: data.user.id, area: '東京' })
    } else if (role === 'salon') {
      await supabase.from('salons').insert({ id: data.user.id, address: '', price_per_hour: 0 })
    }

    router.push('/dashboard')
    router.refresh()
  }

  const roles: { value: UserRole; label: string; icon: React.ReactNode; description: string }[] = [
    { value: 'consumer', label: '消費者', icon: <User size={18} />, description: '美容師を探して予約' },
    { value: 'hairdresser', label: '美容師', icon: <Scissors size={18} />, description: 'フリーランスで活動' },
    { value: 'salon', label: 'サロン', icon: <Building2 size={18} />, description: 'スペースを提供' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Scissors size={20} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-white">Chairly</span>
          </Link>
          <h1 className="mt-6 text-xl font-bold text-white">アカウント作成</h1>
          <p className="text-slate-400 text-sm mt-1">無料で始められます</p>
        </div>

        <div className="rounded-2xl border border-slate-700 p-6" style={{ background: '#1E293B' }}>
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Role selection */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">利用タイプ</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs transition-all ${
                      role === r.value
                        ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {r.icon}
                    <span className="font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田 花子"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                style={{ background: '#0F172A' }}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">メールアドレス</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="hello@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  style={{ background: '#0F172A' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">パスワード</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  style={{ background: '#0F172A' }}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #60A5FA)' }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              アカウントを作成
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-4">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
