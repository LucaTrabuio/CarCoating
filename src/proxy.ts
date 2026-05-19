import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminActive, mintAdminActive, ADMIN_ACTIVE_COOKIE } from '@/lib/admin-active';

// Public admin-area pages (no session required)
const PUBLIC_ADMIN_PATHS = [
  '/admin/reset-password',
  '/admin/forgot-password',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Normalize: strip trailing slash for comparison
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  // Allow login page, setup endpoint, auth API, and public admin pages without session
  const isPublicAdminPage = PUBLIC_ADMIN_PATHS.some(
    (p) => normalizedPath === p || normalizedPath.startsWith(p + '/'),
  );

  if (
    normalizedPath === '/login' ||
    normalizedPath === '/api/admin/setup' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/admin/security/reset-password') ||
    pathname.startsWith('/api/admin/security/forgot-password') ||
    isPublicAdminPage
  ) {
    if (isPublicAdminPage) {
      // Forward the flag to downstream Server Components via request headers.
      // Strip any client-supplied value first to prevent spoofing non-public paths.
      const requestHeaders = new Headers(request.headers);
      requestHeaders.delete('x-admin-public-page');
      requestHeaders.set('x-admin-public-page', '1');
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
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

    // Allow change-password page through to avoid redirect loop
    if (normalizedPath === '/admin/change-password') {
      return NextResponse.next();
    }

    // Layer 2: check __admin_active cookie
    const adminActiveCookie = request.cookies.get(ADMIN_ACTIVE_COOKIE)?.value;
    if (adminActiveCookie) {
      const payload = await verifyAdminActive(adminActiveCookie);
      if (!payload) {
        // Idle timeout expired — redirect to login
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const res = NextResponse.redirect(loginUrl);
        res.cookies.delete(ADMIN_ACTIVE_COOKIE);
        return res;
      }

      // mustChangePassword redirect
      if (payload.mustChangePassword) {
        return NextResponse.redirect(new URL('/admin/change-password', request.url));
      }

      // Refresh the cookie (idle reset)
      const { lastActiveAt: _la, ...payloadWithoutTs } = payload;
      const refreshed = await mintAdminActive(payloadWithoutTs);
      const response = NextResponse.next();
      response.cookies.set(ADMIN_ACTIVE_COOKIE, refreshed.value, refreshed.options as Parameters<typeof response.cookies.set>[2]);
      return response;
    }
    // No __admin_active cookie — allow through (session handler will mint it on next auth)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/v3/:path*', '/api/admin/:path*'],
};
