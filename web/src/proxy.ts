import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESTRICTED_PREFIXES = [
  '/dashboard',
  '/login',
  '/signup',
  '/onboarding',
  '/settings',
];

const PUBLIC_TOP_LEVEL = new Set([
  '',
  'privacy',
  'terms',
  'docs',
  'api',
  'contact',
]);

function isRestricted(pathname: string): boolean {
  if (RESTRICTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }

  const segment = pathname.split('/')[1] ?? '';
  if (segment && !PUBLIC_TOP_LEVEL.has(segment)) {
    return true;
  }

  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isRestricted(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|mp4|avif)).*)'],
};
