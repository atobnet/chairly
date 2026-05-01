import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const WITHDRAW_PENDING_PATH = '/account/withdraw-pending'

// 退会手続き中でもアクセスを許可するパス
const WITHDRAW_ALLOWED_PATHS = [
  WITHDRAW_PENDING_PATH,
  '/api/account/restore',
  '/api/account/withdraw',
  '/login',
  '/signup',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  )

  // 管理者ルートのガード
  if (pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  }

  // 退会手続き中ユーザーのリダイレクト
  if (!WITHDRAW_ALLOWED_PATHS.some((p) => pathname.startsWith(p))) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('deleted_at')
        .eq('id', user.id)
        .single()

      if (profile?.deleted_at) {
        return NextResponse.redirect(new URL(WITHDRAW_PENDING_PATH, req.url))
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api/stripe|api/cron|api/notify|api/hairdresser-ranking|api/stamp).*)',
  ],
}
