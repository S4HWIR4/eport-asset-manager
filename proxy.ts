import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createClient } from '@/lib/supabase/server';

/**
 * Proxy to handle authentication and authorization
 * - Refreshes Supabase session
 * - Protects admin routes (requires admin role)
 * - Protects user routes (requires authentication)
 * - Redirects unauthenticated users to login
 */
export async function proxy(request: NextRequest) {
  // Update session and get user
  const { supabaseResponse, user } = await updateSession(request);

  const path = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/'];
  const isPublicRoute = publicRoutes.some((route) => path === route || path.startsWith(route));

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated, check role-based access
  if (user) {
    // Get user profile to check role
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Admin routes - require admin role
    if (path.startsWith('/admin')) {
      if (!profile || profile.role !== 'admin') {
        // Regular users trying to access admin routes - deny access
        const redirectUrl = new URL('/user', request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // User routes - require authentication (already checked above)
    if (path.startsWith('/user')) {
      // Admins trying to access user routes - allow (they can view user perspective)
      // Regular users - allow (this is their dashboard)
    }

    // Redirect authenticated users from login page to their dashboard
    if (path === '/login' || path === '/') {
      const dashboardUrl = new URL(
        profile?.role === 'admin' ? '/admin' : '/user',
        request.url
      );
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
