# Authentication & Authorization Implementation Guide

## Overview

This document describes the Tier 1 authentication implementation for FounderOS, which enables secure multi-user support with organization isolation.

## Changes Made

### 1. Security Fix: SSL Certificate Verification (ARCH-027)
**File:** `src/lib/db.ts`
- Fixed critical vulnerability: `rejectUnauthorized: false` now correctly set to `true`
- Added support for DATABASE_SSL_CA environment variable for production Supabase connections
- Prevents MITM attacks on database connections

### 2. Authentication Utilities (New)
**Files:**
- `src/lib/auth.ts` - Server-side authentication helpers
- `src/lib/apiAuth.ts` - API route authentication helpers

#### `src/lib/auth.ts` Functions:
```typescript
getSession()                // Get current session (React Server Components)
getCurrentUser()            // Get current authenticated user
getUserOrganization()       // Get user's organization ID
requireAuth()              // Require authentication (throws if not authenticated)
requireOrganization()      // Require org context (returns session, userId, organizationId)
```

#### `src/lib/apiAuth.ts` Functions:
```typescript
getAuthContext(request)     // Extract auth headers from request (middleware adds these)
withOrgFilter(query, auth)  // Helper to add organization_id filter to queries
```

### 3. Authentication Middleware
**File:** `src/middleware.ts`

Protects all `/api/*` routes with automatic session verification:
- Checks Supabase session validity
- Extracts user_id and organization_id from session metadata
- Adds to request headers: `x-user-id`, `x-organization-id`, `x-user-email`
- Returns 401 (Unauthorized) if no session
- Returns 403 (Forbidden) if user not in organization
- Allows public access to: `/api/events/health`

### 4. Database Migration
**File:** `database/migrations/004_add_authentication_and_multitenancy.sql`

Adds multi-tenancy support to all tables:
- **New Tables:**
  - `organizations` - Organization records
  - `organization_members` - Organization membership tracking
  - `audit_logs` - Audit trail for compliance

- **Schema Changes:**
  - Added `organization_id` to: users, contacts, campaigns, email_logs, domains, workflows, rules
  - Added `user_id` and `created_by` tracking to relevant tables
  - Added indexes for performance
  - Added foreign key constraints for referential integrity

### 5. Login & Signup Pages
**Files:**
- `src/app/login/page.tsx` - Login UI
- `src/app/signup/page.tsx` - Signup + organization creation UI

Features:
- Email/password authentication via Supabase
- Organization creation on signup
- Auto-assignment as organization owner
- Session persistence
- Error handling and validation

### 6. Environment Configuration
**File:** `.env.example` (updated)

Required new variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_SSL_CA=                    # Optional, for production
```

### 7. Example API Route Updates
**Updated Routes:**
- `src/app/api/campaigns/route.ts` - Added organization filtering
- `src/app/api/emails/send/route.ts` - Added organization filtering + ownership verification
- `src/app/api/contacts/route.ts` - Added organization filtering

Pattern for updating any API route:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  try {
    // 1. Extract auth context (middleware guarantees this is valid)
    const auth = getAuthContext(request);

    // 2. Filter all queries by organization_id
    const { data } = await supabase
      .from('table_name')
      .select('*')
      .eq('organization_id', auth.organizationId);  // <-- Add this filter

    // 3. Return results
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    const body = await request.json();

    // 4. When creating records, always include organization_id and created_by
    const { data } = await supabase
      .from('table_name')
      .insert({
        organization_id: auth.organizationId,
        created_by: auth.userId,
        ...body
      });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## How to Update Remaining API Routes

This implementation provides a foundation for updating the remaining 50+ API routes. Follow this pattern:

### Step 1: Import Auth Utilities
```typescript
import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/apiAuth';
```

### Step 2: Add Request Parameter
Change function signature from `Request` to `NextRequest`:
```typescript
// Before
export async function GET(request: Request) {

// After
export async function GET(request: NextRequest) {
```

### Step 3: Extract Auth Context
Add at the start of each handler:
```typescript
const auth = getAuthContext(request);
```

### Step 4: Filter All Queries
Add `.eq('organization_id', auth.organizationId)` to every Supabase query:
```typescript
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('organization_id', auth.organizationId)  // <-- Add this
  .eq('id', contactId);
```

### Step 5: Track Record Creation
Add organization context to insert operations:
```typescript
const { data } = await supabase
  .from('contacts')
  .insert({
    organization_id: auth.organizationId,  // <-- Add this
    created_by: auth.userId,               // <-- Add this
    ...restOfData
  });
```

### Step 6: Add Ownership Verification (for sensitive operations)
```typescript
// Verify user has access to the resource
const { data: resource } = await supabase
  .from('campaigns')
  .select('id')
  .eq('id', campaignId)
  .eq('organization_id', auth.organizationId)
  .single();

if (!resource) {
  return NextResponse.json({ error: 'Not found or access denied' }, { status: 403 });
}
```

## Service Layer Updates

Services that need updating (like CRM, Campaign Engine, etc.):

```typescript
// Before
async getContact(id: string): Promise<Contact> {
  const { data } = await supabase.from('contacts').select('*').eq('id', id);
  return data;
}

// After
async getContact(id: string, organizationId: string): Promise<Contact> {
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId);  // <-- Add this
  return data;
}
```

All calls to service methods must now pass `organizationId`:
```typescript
// Before
const contact = await modernCRM.getContact(contactId);

// After
const contact = await modernCRM.getContact(contactId, auth.organizationId);
```

## Testing Authentication

### Test Unauthorized Access
```bash
# Should return 401 Unauthorized
curl -X GET http://localhost:3000/api/campaigns

# Response:
# {"error":"Unauthorized: No active session"}
```

### Test Authorized Access
```bash
# Sign in via /login, get session cookie, then:
curl -X GET http://localhost:3000/api/campaigns \
  --cookie "your-session-cookie"

# Should return list of campaigns
```

### Test Organization Isolation
```bash
# User A signs up → creates Organization A
# User B signs up → creates Organization B
# User A's API calls should only see Organization A's data
# User B's API calls should only see Organization B's data
```

## Remaining Work (Tier 1 Continued)

The following still need to be updated to fully implement Tier 1:

- [ ] Update remaining 47 API routes (150+ LOC each)
- [ ] Update service layer methods (CampaignEngine, ContactTriageEngine, etc.)
- [ ] Update React components to use authenticated user context (UserContext.tsx)
- [ ] Test all routes with auth enabled
- [ ] Add login/logout links to dashboard
- [ ] Add organization switcher (if multi-org support needed)
- [ ] Add user profile/settings page
- [ ] Create migrations running script

## Known Issues & TODOs

1. **Component State**: `UserContext.tsx` still uses hardcoded "Founder" user. Needs to load from session.
2. **Service Dependencies**: Service classes still have implicit dependencies on singletons, not dependency injection.
3. **Client-Side Auth**: No current mechanism for client-side components to verify authentication.
4. **Rate Limiting**: Should implement per-user/org rate limiting after auth.
5. **Audit Logging**: `audit_logs` table created but not yet used. Should log all mutations.

## Configuration & Deployment

### Local Development
1. Update `.env.local` with your Supabase project credentials
2. Run database migration: 004_add_authentication_and_multitenancy.sql
3. Start development server: `npm run dev`
4. Visit http://localhost:3000/signup to create account

### Production
1. Set Supabase environment variables
2. Configure DATABASE_SSL_CA with production certificate
3. Enable SSL verification (already fixed in ARCH-027)
4. Run all migrations in order
5. Deploy with proper environment variables

## References

- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware)
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions)
- [Organization-Based Access Control](https://supabase.com/docs/guides/auth/row-level-security)

---

**Status**: Tier 1A complete. Ready for Tier 1B (remaining API route updates).
