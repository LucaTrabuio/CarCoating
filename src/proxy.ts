import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Normalize: strip trailing slash for comparison
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  // Allow login page, setup endpoint, and auth API without session
  if (
    normalizedPath === '/login' ||
    normalizedPath === '/api/admin/setup' ||
    pathname.startsWith('/api/auth/')
  ) {
    return NextResponse.next();
  }

  // V3 API write endpoints require session cookie
  if (pathname.startsWith('/api/v3/')) {
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      const session = request.cookies.get('__session')?.value;
      if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return NextResponse.next();
  }

  // Admin API routes require session cookie
  if (pathname.startsWith('/api/admin/')) {
    const session = request.cookies.get('__session')?.value;
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protect all admin page routes
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('__session')?.value;
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/v3/:path*', '/api/admin/:path*'],
};
