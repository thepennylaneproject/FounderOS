import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to protect API routes with authentication
 * Verifies session and attaches user info to request headers
 */
export async function middleware(request: NextRequest) {
  // Skip middleware for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Health check endpoint should be accessible without auth
  if (request.nextUrl.pathname === '/api/events/health') {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  const requestHeaders = new Headers(request.headers);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createMiddlewareClient({ req: request, res: response });
  const { data: { session } } = await supabase.auth.getSession();

  // Check authentication
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: No active session' },
      { status: 401 }
    );
  }

  // Check if user is in an organization
  const organizationId = session.user.user_metadata?.organization_id;
  if (!organizationId) {
    return NextResponse.json(
      { error: 'Unauthorized: User not associated with an organization' },
      { status: 403 }
    );
  }

  // Attach user info to request headers for use in API routes
  requestHeaders.set('x-user-id', session.user.id);
  requestHeaders.set('x-organization-id', organizationId);
  requestHeaders.set('x-user-email', session.user.email || '');

  const responseWithHeaders = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return responseWithHeaders;
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    // Apply to all /api/* routes except the ones we want to skip
    '/api/:path*',
  ],
};
