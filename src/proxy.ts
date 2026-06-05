import { NextResponse, NextRequest } from 'next/server';
import { decryptSession } from './lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that are excluded from authentication
  const isAuthPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isStaticFile = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.'); // assets, etc.

  if (isAuthPage || isAuthApi || isStaticFile) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionToken = request.cookies.get('session')?.value;
  let session = null;

  if (sessionToken) {
    session = await decryptSession(sessionToken);
  }

  // If no session, handle redirect/unauthorized
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Redirect to login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except those starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
