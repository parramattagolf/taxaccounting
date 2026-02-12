import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block common bot scans
  if (
    pathname.includes('/.env') ||
    pathname.includes('/api/config') ||
    pathname.includes('.php')
  ) {
    return new NextResponse(null, { status: 404 })
  }

  // For now, just pass through without Supabase session check
  // (Auth will be added when login flow is implemented)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
