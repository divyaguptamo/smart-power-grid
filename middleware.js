import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './lib/session';

// Which roles may open each page. API routes do their own checks in lib/auth.js.
const PAGE_ROLES = {
  '/dashboard': ['ADMIN', 'OPERATOR'],
  '/allocations': ['ADMIN', 'OPERATOR'],
  '/grid': ['ADMIN', 'OPERATOR'],
  '/resources': ['ADMIN', 'OPERATOR'],
  '/maintenance': ['ADMIN', 'OPERATOR'],
  '/analytics': ['ADMIN', 'OPERATOR'],
  '/users': ['ADMIN'],
  '/my-usage': ['CONSUMER'],
  '/outages': ['ADMIN', 'OPERATOR', 'CONSUMER'],
};

const PUBLIC_PAGES = ['/login', '/register'];

export function homeFor(role) {
  return role === 'CONSUMER' ? '/my-usage' : '/dashboard';
}

// true only for real app pages, not icons or other files the browser asks for
function isAppPage(pathname) {
  return Object.keys(PAGE_ROLES).some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLIC_PAGES.includes(pathname)) {
    if (session) return NextResponse.redirect(new URL(homeFor(session.role), req.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL('/login', req.url);
    // remember where to return after sign-in, but only for real pages
    if (isAppPage(pathname)) url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === '/') return NextResponse.redirect(new URL(homeFor(session.role), req.url));

  const rule = Object.keys(PAGE_ROLES).find((p) => pathname === p || pathname.startsWith(p + '/'));
  if (rule && !PAGE_ROLES[rule].includes(session.role)) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  // run on pages only; skip API routes, Next.js internals and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
