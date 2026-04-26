'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scissors, Mail, Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0F172A' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Scissors size={20} className="text-white" />
            </div>
            <span className="font-bold text-2xl text-white">Chairly</span>
          </Link>
          <h1 className="mt-6 text-xl font-bold text-white">ログイン</h1>
          <p className="text-slate-400 text-sm mt-1">アカウントにサインインしてください</p>
        </div>

        <div className="rounded-2xl border border-slate-700 p-6" style={{ background: '#1E293B' }}>
          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="••••••••"
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
              ログイン
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-4">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
            無料登録
          </Link>
        </p>
      </div>
    </div>
  )
}
