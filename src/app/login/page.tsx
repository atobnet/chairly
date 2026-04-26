'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

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
    <div className="min-h-screen flex" style={{ background: '#f7f4ef' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16"
        style={{ background: '#1a1410' }}
      >
        <Link href="/" className="font-serif text-xl tracking-[0.2em]" style={{ color: '#f7f4ef' }}>
          CHAIRLY
        </Link>
        <div>
          <h2 className="font-serif text-5xl leading-tight mb-6" style={{ fontWeight: 300, color: '#f7f4ef' }}>
            美しさを、<br />
            <em style={{ color: '#6b7c5c', fontStyle: 'italic' }}>自由に。</em>
          </h2>
          <p className="text-xs leading-loose" style={{ color: '#6b6459', letterSpacing: '0.08em' }}>
            東京エリア限定・プロトタイプ
          </p>
        </div>
        <p className="text-xs tracking-widest" style={{ color: '#3a3028' }}>© 2025 CHAIRLY</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-8 py-16 max-w-md mx-auto w-full lg:max-w-none lg:mx-0 lg:px-16">
        <div className="max-w-sm w-full mx-auto lg:mx-0">
          <Link href="/" className="lg:hidden font-serif text-xl tracking-[0.2em] block mb-12" style={{ color: '#1a1410' }}>
            CHAIRLY
          </Link>

          <p className="text-xs tracking-[0.3em] mb-6" style={{ color: '#a09890' }}>SIGN IN</p>
          <h1 className="font-serif text-3xl mb-10" style={{ fontWeight: 300 }}>ログイン</h1>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs tracking-widest mb-2" style={{ color: '#6b6459' }}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="hello@example.com"
                className="w-full px-4 py-3 text-sm border focus:outline-none transition-colors"
                style={{
                  background: 'transparent',
                  borderColor: '#e2dcd4',
                  color: '#1a1410',
                }}
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
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm border focus:outline-none transition-colors"
                style={{ background: 'transparent', borderColor: '#e2dcd4', color: '#1a1410' }}
                onFocus={e => e.target.style.borderColor = '#6b7c5c'}
                onBlur={e => e.target.style.borderColor = '#e2dcd4'}
              />
            </div>

            {error && (
              <p className="text-xs py-2" style={{ color: '#85403b' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-xs tracking-[0.2em] border transition-all hover:bg-[#1a1410] hover:text-[#f7f4ef] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ borderColor: '#1a1410', color: '#1a1410' }}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              ログイン
            </button>
          </form>

          <p className="text-xs mt-8" style={{ color: '#a09890' }}>
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="underline underline-offset-4 transition-opacity hover:opacity-60" style={{ color: '#6b6459' }}>
              無料登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
