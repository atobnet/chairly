'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import type { UserRole } from '@/types'
import { Menu, X } from 'lucide-react'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data) setRole(data.role as UserRole)
    })
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setRole(null)
    router.push('/')
    router.refresh()
  }

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  if (isAuthPage) return null

  const links = role === 'consumer'
    ? [{ href: '/search', label: '美容師を探す' }, { href: '/bookings', label: '予約' }]
    : role === 'hairdresser'
    ? [{ href: '/dashboard', label: 'ダッシュボード' }, { href: '/schedule', label: 'スケジュール' }, { href: '/requests', label: 'リクエスト' }, { href: '/profile/edit', label: 'プロフィール' }]
    : role === 'salon'
    ? [{ href: '/dashboard', label: 'ダッシュボード' }, { href: '/slots', label: '空き枠' }, { href: '/space/edit', label: 'スペース' }]
    : []

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(247,244,239,0.92)' : 'rgba(247,244,239,0.7)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid #e2dcd4' : '1px solid transparent',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <span
            className="font-serif text-xl tracking-widest"
            style={{ color: '#1a1410', letterSpacing: '0.2em' }}
          >
            CHAIRLY
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs tracking-widest transition-colors"
              style={{
                color: pathname.startsWith(l.href) ? '#6b7c5c' : '#6b6459',
                fontWeight: pathname.startsWith(l.href) ? 500 : 300,
              }}
            >
              {l.label.toUpperCase()}
            </Link>
          ))}
          {role ? (
            <button
              onClick={handleSignOut}
              className="text-xs tracking-widest transition-colors"
              style={{ color: '#a09890', fontWeight: 300 }}
            >
              SIGN OUT
            </button>
          ) : (
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-xs tracking-widest" style={{ color: '#6b6459', fontWeight: 300 }}>
                LOGIN
              </Link>
              <Link
                href="/signup"
                className="text-xs tracking-widest px-5 py-2 border transition-all"
                style={{ color: '#1a1410', borderColor: '#1a1410', fontWeight: 400, letterSpacing: '0.15em' }}
              >
                JOIN
              </Link>
            </div>
          )}
        </div>

        {/* Mobile */}
        <button className="md:hidden" onClick={() => setOpen(!open)} style={{ color: '#1a1410' }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden px-6 py-6 flex flex-col gap-4 border-t"
          style={{ background: 'rgba(247,244,239,0.97)', borderColor: '#e2dcd4' }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-xs tracking-widest py-1"
              style={{ color: pathname.startsWith(l.href) ? '#6b7c5c' : '#6b6459' }}
            >
              {l.label.toUpperCase()}
            </Link>
          ))}
          {role ? (
            <button onClick={handleSignOut} className="text-xs tracking-widest text-left py-1" style={{ color: '#a09890' }}>
              SIGN OUT
            </button>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="text-xs tracking-widest py-1" style={{ color: '#6b6459' }}>LOGIN</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="text-xs tracking-widest py-1" style={{ color: '#1a1410' }}>JOIN FREE</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
