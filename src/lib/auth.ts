import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { cache } from 'react';

/**
 * Get the current authenticated session (server-side, React Server Component)
 * Use this in Server Components and layouts
 */
export const getSession = cache(async () => {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
});

/**
 * Get the current authenticated user (server-side)
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session?.user || null;
});

/**
 * Get the user's organization ID
 */
export const getUserOrganization = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  return user.user_metadata?.organization_id || null;
});

/**
 * Require authentication - throws error if not authenticated
 * Use in Server Components that require auth
 */
export const requireAuth = async () => {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized: No active session');
  }
  return session;
};

/**
 * Require organization context - throws error if user not in an org
 * Use in Server Components that need org isolation
 */
export const requireOrganization = async () => {
  const session = await requireAuth();
  const orgId = session.user.user_metadata?.organization_id;

  if (!orgId) {
    throw new Error('Unauthorized: User not associated with an organization');
  }

  return {
    session,
    organizationId: orgId,
    userId: session.user.id
  };
};
