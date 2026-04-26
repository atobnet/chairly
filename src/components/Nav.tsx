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
    const onScroll = () => setScrolled(window.scrollY > 10)
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
    ? [{ href: '/search', label: 'SEARCH' }, { href: '/bookings', label: 'BOOKING' }]
    : role === 'hairdresser'
    ? [{ href: '/dashboard', label: 'HOME' }, { href: '/schedule', label: 'SCHEDULE' }, { href: '/requests', label: 'REQUEST' }, { href: '/profile/edit', label: 'PROFILE' }]
    : role === 'salon'
    ? [{ href: '/dashboard', label: 'HOME' }, { href: '/slots', label: 'SLOTS' }, { href: '/space/edit', label: 'SPACE' }]
    : []

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: scrolled ? '1px solid #ebebeb' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-sm tracking-[0.25em] font-extralight" style={{ color: '#111111', letterSpacing: '0.25em' }}>
          CHAIRLY
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs tracking-widest transition-all duration-200"
              style={{
                color: pathname.startsWith(l.href) ? '#111111' : '#999999',
                fontWeight: 300,
                borderBottom: pathname.startsWith(l.href) ? '1px solid #111111' : '1px solid transparent',
                paddingBottom: '2px',
              }}
            >
              {l.label}
            </Link>
          ))}
          {role ? (
            <button
              onClick={handleSignOut}
              className="text-xs tracking-widest transition-colors"
              style={{ color: '#cccccc', fontWeight: 300 }}
            >
              SIGN OUT
            </button>
          ) : (
            <div className="flex items-center gap-8">
              <Link href="/login" className="text-xs tracking-widest" style={{ color: '#999999', fontWeight: 300 }}>LOGIN</Link>
              <Link href="/signup" className="text-xs tracking-widest" style={{ color: '#111111', fontWeight: 300 }}>JOIN</Link>
            </div>
          )}
        </div>

        {/* Mobile */}
        <button className="md:hidden" onClick={() => setOpen(!open)} style={{ color: '#111111' }}>
          {open ? <X size={18} strokeWidth={1} /> : <Menu size={18} strokeWidth={1} />}
        </button>
      </div>

      {open && (
        <div
          className="md:hidden px-8 py-6 flex flex-col gap-5"
          style={{ background: 'rgba(255,255,255,0.98)', borderTop: '1px solid #ebebeb' }}
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-xs tracking-widest" style={{ color: pathname.startsWith(l.href) ? '#111111' : '#999999' }}>
              {l.label}
            </Link>
          ))}
          {role ? (
            <button onClick={handleSignOut} className="text-xs tracking-widest text-left" style={{ color: '#cccccc' }}>SIGN OUT</button>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="text-xs tracking-widest" style={{ color: '#999999' }}>LOGIN</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="text-xs tracking-widest" style={{ color: '#111111' }}>JOIN</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
