import { NextRequest } from 'next/server';

/**
 * Extract authenticated user context from API request
 * These headers are added by the middleware
 */
export interface AuthContext {
  userId: string;
  organizationId: string;
  userEmail: string;
}

export function getAuthContext(request: NextRequest): AuthContext {
  const userId = request.headers.get('x-user-id');
  const organizationId = request.headers.get('x-organization-id');
  const userEmail = request.headers.get('x-user-email');

  if (!userId || !organizationId) {
    throw new Error('Missing auth context in request headers');
  }

  return {
    userId,
    organizationId,
    userEmail: userEmail || '',
  };
}

/**
 * Utility to add organization_id filter to Supabase queries
 * Usage: queryBuilder.eq('organization_id', auth.organizationId)
 */
export function withOrgFilter(baseQuery: string, auth: AuthContext): string {
  // If the query already has a WHERE clause, add AND
  // Otherwise add WHERE
  if (baseQuery.includes('WHERE')) {
    return `${baseQuery} AND organization_id = '${auth.organizationId}'`;
  } else {
    return `${baseQuery} WHERE organization_id = '${auth.organizationId}'`;
  }
}
