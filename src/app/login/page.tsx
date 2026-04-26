'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

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
      if (error.message.includes('Email not confirmed')) {
        setError('メールアドレスの確認が完了していません。届いた確認メールのリンクをクリックしてください。')
      } else {
        setError('メールアドレスまたはパスワードが正しくありません')
      }
      setLoading(false)
      return
    }
    router.refresh()
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#ffffff' }}>
      {/* Left: large branding area */}
      <div
        className="hidden lg:flex lg:flex-1 flex-col justify-between p-16"
        style={{ background: '#111111' }}
      >
        <Link href="/" className="text-xs tracking-[0.3em]" style={{ color: '#ffffff', fontWeight: 200 }}>CHAIRLY</Link>
        <div>
          <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)', fontWeight: 100, color: '#ffffff', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Sign in.
          </h2>
          <p className="mt-6 text-xs tracking-widest" style={{ color: '#555555', fontWeight: 300 }}>TOKYO HAIR PLATFORM</p>
        </div>
        <p className="text-xs tracking-widest" style={{ color: '#333333' }}>© 2025 CHAIRLY</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 lg:max-w-md flex flex-col justify-center px-8 py-16 mx-auto w-full">
        <Link href="/" className="lg:hidden text-xs tracking-[0.3em] block mb-16" style={{ color: '#111111', fontWeight: 200 }}>CHAIRLY</Link>

        <p className="text-xs tracking-[0.3em] mb-10" style={{ color: '#cccccc' }}>SIGN IN</p>

        <form onSubmit={handleLogin} className="space-y-8">
          <div>
            <label className="block text-xs tracking-widest mb-3" style={{ color: '#cccccc' }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="hello@example.com"
              style={{ ...inputStyle, color: '#111111' }}
              onFocus={e => { e.target.style.borderBottomColor = '#111111' }}
              onBlur={e => { e.target.style.borderBottomColor = '#ebebeb' }}
            />
          </div>
          <div>
            <label className="block text-xs tracking-widest mb-3" style={{ color: '#cccccc' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => { e.target.style.borderBottomColor = '#111111' }}
              onBlur={e => { e.target.style.borderBottomColor = '#ebebeb' }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#999999' }}>{error}</p>}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-xs tracking-[0.25em] flex items-center justify-center gap-2 transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ background: '#111111', color: '#ffffff', fontWeight: 300 }}
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              ログイン
            </button>
          </div>
        </form>

        <p className="text-xs mt-10" style={{ color: '#cccccc' }}>
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="transition-opacity hover:opacity-50" style={{ color: '#111111', borderBottom: '1px solid #ebebeb', paddingBottom: '1px' }}>
            無料登録
          </Link>
        </p>
      </div>
    </div>
  )
}
