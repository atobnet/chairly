'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import type { UserRole } from '@/types'
import { Scissors, Menu, X, LogOut } from 'lucide-react'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (data) setRole(data.role as UserRole)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const links = role === 'consumer'
    ? [
        { href: '/search', label: '美容師を探す' },
        { href: '/bookings', label: '予約一覧' },
      ]
    : role === 'hairdresser'
    ? [
        { href: '/dashboard', label: 'ダッシュボード' },
        { href: '/schedule', label: 'スケジュール' },
        { href: '/requests', label: 'リクエスト' },
        { href: '/profile/edit', label: 'プロフィール' },
      ]
    : role === 'salon'
    ? [
        { href: '/dashboard', label: 'ダッシュボード' },
        { href: '/slots', label: '空き枠管理' },
        { href: '/space/edit', label: 'スペース編集' },
      ]
    : []

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  if (isAuthPage) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-700/50 backdrop-blur-md" style={{ background: 'rgba(15,23,42,0.92)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center group-hover:bg-blue-400 transition-colors">
            <Scissors size={16} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Chairly</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm transition-colors ${
                pathname.startsWith(l.href)
                  ? 'text-blue-400 font-medium'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {role ? (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              ログアウト
            </button>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
                ログイン
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-blue-500 hover:bg-blue-400 text-white px-4 py-1.5 rounded-full transition-colors font-medium"
              >
                無料登録
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-slate-300"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-700/50 px-4 py-3 flex flex-col gap-3" style={{ background: 'rgba(15,23,42,0.97)' }}>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`text-sm py-1 ${
                pathname.startsWith(l.href) ? 'text-blue-400' : 'text-slate-300'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {role ? (
            <button onClick={handleSignOut} className="text-sm text-slate-400 text-left py-1">
              ログアウト
            </button>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-slate-300 py-1">ログイン</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="text-sm text-blue-400 py-1">無料登録</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
