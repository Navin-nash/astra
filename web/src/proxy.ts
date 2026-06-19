import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BETA_MODE } from '@/lib/features';

// Better Auth session cookie (cookiePrefix: "astra" in auth.ts)
const SESSION_COOKIE = 'astra.session_token';

// App routes that require authentication
const AUTH_REQUIRED_PREFIXES = [
  '/dashboard',
  '/settings',
  '/onboarding',
];

// Always public — no auth, no mode gate
const ALWAYS_PUBLIC = new Set([
  '',           // /
  'privacy',
  'terms',
  'docs',
  'api',
  'contact',
]);

// Additional routes that become public only in live mode (not beta)
const LIVE_ONLY_PUBLIC = new Set([
  'login',
]);

function segment(pathname: string) {
  return pathname.split('/')[1] ?? '';
}

function isAuthenticated(request: NextRequest): boolean {
  return !!request.cookies.get(SESSION_COOKIE)?.value;
}

function isAuthRequired(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/'),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = isAuthenticated(request);

  // Authenticated users can access everything
  if (authed) return NextResponse.next();

  const seg = segment(pathname);

  // Always-public routes pass through in any mode
  if (ALWAYS_PUBLIC.has(seg)) return NextResponse.next();

  // Beta mode: only ALWAYS_PUBLIC is accessible; everything else → waitlist
  if (BETA_MODE) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.hash = 'waitlist';
    return NextResponse.redirect(url);
  }

  // Live mode: login is also public
  if (LIVE_ONLY_PUBLIC.has(seg)) return NextResponse.next();

  // Live mode: unauthenticated user hitting an app/unknown route → login
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|mp4|avif)).*)'],
};
