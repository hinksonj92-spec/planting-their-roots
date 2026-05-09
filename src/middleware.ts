import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase is not configured, skip auth entirely (local-only mode)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes: redirect to /login if not authenticated
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/home') ||
    request.nextUrl.pathname.startsWith('/week') ||
    request.nextUrl.pathname.startsWith('/cards') ||
    request.nextUrl.pathname.startsWith('/rhythm') ||
    request.nextUrl.pathname.startsWith('/milestones') ||
    request.nextUrl.pathname.startsWith('/reflection') ||
    request.nextUrl.pathname.startsWith('/child') ||
    request.nextUrl.pathname.startsWith('/chat') ||
    request.nextUrl.pathname.startsWith('/settings');

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and hitting login/signup, redirect to home
  // Invite routes are semi-protected (handled by the page itself)
  const isInviteRoute = request.nextUrl.pathname.startsWith('/invite/');

  const isAuthRoute = request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup';

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png|.*\\.svg).*)',
  ],
};
