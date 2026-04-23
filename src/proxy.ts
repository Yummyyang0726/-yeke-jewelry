import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js 16 Proxy（原 middleware）
 *
 * 策略：
 *  - /customer 和 /api/customer/* 为公开路由，无需登录
 *  - /login 和 /api/auth/* 为公开路由
 *  - 其余路由检查 session cookie，缺失则重定向到 /login
 */

const PUBLIC_PREFIXES = [
  '/login',
  '/customer',
  '/api/auth/',
  '/api/customer/',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname === p
  )
  if (isPublic) return NextResponse.next()

  const session = request.cookies.get('session')?.value
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icons|favicon\\.ico|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webmanifest)$).*)',
  ],
}
