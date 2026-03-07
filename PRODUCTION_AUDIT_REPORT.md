# PRODUCTION CODEBASE AUDIT REPORT
## FounderOS: Critical Architecture, Data Flow, and Business Logic Issues

**Audit Date:** January 24, 2026
**Scope:** Backend APIs, business logic, client state management, data flows
**Severity Classification:** 24 bugs across Logic, Data, State, Flow, and Safety categories

---

## SECTION 1: DETAILED ISSUE LIST

### AUTHENTICATION & AUTHORIZATION (CRITICAL)

#### ARCH-001: Missing Authentication on All Campaign APIs
**Type:** Flow bug
**Location:** `src/app/api/campaigns/route.ts` (GET/POST), `src/app/api/campaigns/[id]/execute/route.ts` (POST)
**Symptom:** Any client can view all campaigns, create campaigns with arbitrary properties, and execute campaigns to send emails to any contact list without authentication.
**Root Cause:** No middleware or session verification in these routes. Default Next.js API routes execute without auth checks.
**Risk:** **HIGH** – Direct path to unauthorized email campaign execution, data theft, and mass email abuse.
**Minimal Reproduction:**
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"name":"Spam","type":"marketing","subject":"test","body":"test"}'
# Creates campaign
curl -X POST http://localhost:3000/api/campaigns/{id}/execute
# Executes without auth
```
**Proposed Fix:**
- Add authentication middleware (NextAuth, Supabase, or custom JWT)
- Check `Authorization` header or session cookie in all routes
- Return 401 for missing auth, 403 for unauthorized access
```typescript
export async function POST(request: Request) {
  const session = await getSession(request); // Must implement
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ... rest of logic
}
```

---

#### ARCH-002: Missing Authentication on Email Send API
**Type:** Flow bug
**Location:** `src/app/api/emails/send/route.ts`
**Symptom:** Any client can send emails from any sender address to any recipient without authentication. Creates open relay vulnerability.
**Root Cause:** No authentication check before email send.
**Risk:** **CRITICAL** – Open email relay; can be used for phishing, spam, or spoofing.
**Minimal Reproduction:**
```bash
curl -X POST http://localhost:3000/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{"from":"ceo@company.com","to":"victim@example.com","subject":"Urgent","body":"Click here for free money"}'
```
**Proposed Fix:** Same as ARCH-001 – add authentication middleware.

---

#### ARCH-003: Missing Authentication on Contact APIs
**Type:** Flow bug
**Location:** `src/app/api/contacts/route.ts` (GET/POST), `src/app/api/contacts/[id]/*` endpoints
**Symptom:** Any client can list all contacts, create contacts, modify their data (scoring, enrichment, snapshots, triage).
**Root Cause:** No authentication.
**Risk:** **HIGH** – Contact data exposure; unauthorized data manipulation.
**Proposed Fix:** Add authentication middleware.

---

#### ARCH-004: Missing Authentication on Domain Management APIs
**Type:** Flow bug
**Location:** `src/app/api/domains/route.ts` (GET/POST/DELETE)
**Symptom:** Any client can list domains, register new domains with attacker-controlled DKIM keys, delete domains.
**Root Cause:** No authentication. Also note line 31: `// TODO: Get organization_id from authenticated session` – placeholder for multi-tenancy that was never implemented.
**Risk:** **HIGH** – Can hijack email sending infrastructure, inject malicious DKIM keys.
**Proposed Fix:** Add authentication + implement organization_id isolation:
```typescript
const session = await getSession(request);
if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const organizationId = session.organizationId; // Must come from auth
const { data, error } = await supabase
  .from("email_domains")
  .insert({
    organization_id: organizationId, // NOT user-provided
    domain: domain,
    // ... rest
  })
```

---

#### ARCH-005: Missing Authentication on Automation/Workflow APIs
**Type:** Flow bug
**Location:** `src/app/api/automations/test/route.ts`, `src/app/api/automations/rules/route.ts`, `src/app/api/workflows/route.ts`
**Symptom:** Any client can test automations, create rules, create workflows without auth. Can trigger workflows that send emails, enrich contacts, or score leads.
**Root Cause:** No authentication.
**Risk:** **HIGH** – Unauthorized workflow execution affecting contacts and campaigns.
**Proposed Fix:** Add authentication middleware.

---

#### ARCH-006: No Authorization/Organization Isolation
**Type:** Data bug
**Location:** All API routes throughout `src/app/api/`
**Symptom:** Even if authentication is added, there's no mechanism to isolate data by organization/user. All users would see all data.
**Root Cause:** Database schema has `organization_id` field (noted in ARCH-004) but it's not used in queries. Schema in `init.sql` shows `users` table but no `organizations` table or user_id references in most tables.
**Risk:** **MEDIUM** – In multi-tenant systems, data leakage between users.
**Proposed Fix:**
- Add `organization_id` and `user_id` to contacts, campaigns, workflows, domains, rules tables (or migrate to org-scoped queries).
- Always filter queries by authenticated user's organization:
```typescript
.eq('organization_id', session.organizationId)
```

---

### DATA & STATE MANAGEMENT ISSUES

#### ARCH-007: In-Memory Usage Log Loss – AI Router
**Type:** Data bug
**Location:** `src/ai/AIRouter.ts:80, 413-417`
**Symptom:** User AI usage logs (tokens, costs, requests) are logged to in-memory array and lost on server restart. Users cannot see accurate usage history or costs; billing would be inaccurate.
**Root Cause:** Line 416 has `// TODO: Persist to database`. Logs are stored in `this.usageLog` array (line 80) but never persisted.
**Risk:** **HIGH** – Financial data loss; inability to track costs; no audit trail.
**Minimal Reproduction:**
1. Make AI generation request (logs to memory)
2. Restart server
3. Call `getUsageSummary()` – returns empty
**Proposed Fix:**
```typescript
private async logUsage(record: UsageRecord): Promise<void> {
  // Insert to database
  await query(
    `INSERT INTO ai_usage_logs (id, userId, requestId, provider, model, taskType,
     inputTokens, outputTokens, cost, latencyMs, success, createdAt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [record.id, record.userId, record.requestId, record.provider, record.model,
     record.taskType, record.inputTokens, record.outputTokens, record.cost,
     record.latencyMs, record.success, record.createdAt]
  );
}
```

---

#### ARCH-008: In-Memory Brand Voice Profile Loss
**Type:** Data bug
**Location:** `src/ai/BrandVoice.ts:361-365`
**Symptom:** Brand voice profiles are stored in memory (Map) and lost on restart. Users' brand guidelines disappear; AI responses stop following brand voice.
**Root Cause:** Line 363 has `// TODO: Persist to database`. Profiles stored in `this.profiles` Map (in-memory).
**Risk:** **MEDIUM** – Loss of user customization; unpredictable AI behavior.
**Proposed Fix:** Persist to database like AIRouter.

---

#### ARCH-009: Unsafe JSON Parsing in Workflow Config
**Type:** Safety bug
**Location:** `src/automation/WorkflowEngine.ts:64-66`
**Code:**
```typescript
const actions = typeof wf.config === 'string'
  ? JSON.parse(wf.config)  // No error handling
  : (wf.config as WorkflowAction[]);
```
**Symptom:** If `wf.config` is malformed JSON (stored in DB), `JSON.parse()` throws uncaught error, crashes workflow execution.
**Root Cause:** No try-catch around JSON.parse.
**Risk:** **MEDIUM** – Workflow execution failure; silent errors in logs.
**Proposed Fix:**
```typescript
let actions: WorkflowAction[] = [];
try {
  actions = typeof wf.config === 'string' ? JSON.parse(wf.config) : wf.config;
} catch (err) {
  console.error(`Invalid config JSON for workflow ${wf.id}:`, err);
  executionResult = 'failed';
  actionErrors.push(`Config parse error: ${err instanceof Error ? err.message : String(err)}`);
  continue;
}
```

---

#### ARCH-010: Unsafe JSON Parsing in Triage Rules
**Type:** Safety bug
**Location:** `src/inbox/db.ts:16-17`
**Code:**
```typescript
match: typeof r.match === 'string' ? JSON.parse(r.match) : (r.match || {}),
action: typeof r.action === 'string' ? JSON.parse(r.action) : (r.action || {}),
```
**Symptom:** Same as ARCH-009 – malformed JSON in rules table crashes classification.
**Proposed Fix:** Wrap in try-catch.

---

#### ARCH-011: Double Logout in Email Client
**Type:** Logic bug
**Location:** `src/lib/email.ts:73-77`
**Code:**
```typescript
} finally {
  await client.logout();
}

await client.logout();  // Second logout after finally block
```
**Symptom:** Calls `logout()` twice. First call in finally block, then again unconditionally. Second call may error or behave unexpectedly.
**Root Cause:** Copy-paste error or incomplete refactor.
**Risk:** **LOW** – Potential error in logs; improper cleanup.
**Proposed Fix:** Remove second `logout()` call.

---

### LOGIC & CALCULATION BUGS

#### ARCH-012: Campaign Execution State Machine Violation
**Type:** State bug
**Location:** `src/campaigns/CampaignEngine.ts:84-140`
**Symptom:** Campaign status is set to 'active' (line 89) immediately after execution starts. If any error occurs during the loop (line 124-126), the campaign status is never reset. Campaign is stuck in 'active' state forever; users cannot retry or correct it.
**Root Cause:** No transaction handling; status updated before all sends complete. No rollback on partial failure.
**Risk:** **HIGH** – Campaign enters stuck state; cannot be executed again; manual DB cleanup needed.
**Minimal Reproduction:**
1. Create campaign
2. Execute (status → active)
3. 5 out of 100 sends fail mid-loop due to email service error
4. executeCampaign throws, but campaign is still 'active'
5. Try to execute again – business logic may reject "already active"
**Proposed Fix:** Use transaction + only update status after all sends complete:
```typescript
async executeCampaign(campaignId: string): Promise<void> {
  const campaign = await this.getCampaign(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  // Don't update status yet
  const contacts = await query('SELECT * FROM contacts WHERE stage != $1', ['churned']);
  const sentRecipients: Array<{ email: string; contact_id: string }> = [];
  const failedRecipients: string[] = [];

  for (const contact of contacts.rows) {
    try {
      const logRes = await query(...);
      const logId = logRes.rows[0].id;
      const compiledBody = this.compileTemplate(campaign.body, contact);
      await emailClient.sendEmail({...}, logId);
      sentRecipients.push({ email: contact.email, contact_id: contact.id });
    } catch (error) {
      failedRecipients.push(contact.email);
      console.error(`Failed to send to ${contact.email}:`, error);
    }
  }

  // Only update status if some sends succeeded
  if (sentRecipients.length > 0) {
    await eventLoggingEngine.logCampaignSends(campaignId, sentRecipients);
    // Mark as completed AFTER all sends attempted
    await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['completed', campaignId]);
  } else {
    // All failed – leave as draft or mark failed
    await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['failed', campaignId]);
  }
}
```

---

#### ARCH-013: N+1 Query in Campaign Metrics
**Type:** Logic bug
**Location:** `src/campaigns/CampaignEngine.ts:46-57`
**Code:**
```typescript
async getAllCampaigns() {
  const res = await query('SELECT * FROM campaigns ORDER BY created_at DESC');
  const campaigns = res.rows;

  const enriched = await Promise.all(campaigns.map(async (campaign) => {
    const metrics = await this.getCampaignMetrics(campaign.id);  // N queries!
    return { ...campaign, metrics };
  }));
}
```
**Symptom:** Fetches all campaigns, then for each campaign runs a separate query to get metrics. With 100 campaigns = 101 queries (1 + 100). Slow pagination.
**Root Cause:** Metrics calculation not batched or denormalized.
**Risk:** **MEDIUM** – Slow dashboard; database overload with large contact lists.
**Proposed Fix:** Batch metrics in single query or cache:
```typescript
async getAllCampaigns() {
  const res = await query(`
    SELECT c.*,
      COUNT(e.id) as total_sent,
      SUM(CASE WHEN e.status = 'opened' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN e.status = 'clicked' THEN 1 ELSE 0 END) as click_count
    FROM campaigns c
    LEFT JOIN email_logs e ON c.id = e.campaign_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);

  return res.rows.map(row => ({
    id: row.id,
    name: row.name,
    // ...
    metrics: {
      totalSent: parseInt(row.total_sent) || 0,
      openCount: parseInt(row.open_count) || 0,
      openRate: row.total_sent > 0 ? ((row.open_count / row.total_sent) * 100).toFixed(1) + '%' : '0%',
      // ...
    }
  }));
}
```

---

#### ARCH-014: N+1 Query in Contact Triage
**Type:** Logic bug
**Location:** `src/intelligence/ContactTriageEngine.ts:301-340`
**Code:**
```typescript
// Get contacts with pagination
const res = await query(querySql, [...params, limit, offset]);

// Enhance with engagement data
const contacts: TriagedContact[] = [];
for (const contact of res.rows || []) {
  const triaged = await this.triageContact(contact.id);  // N queries!
  contacts.push(triaged);
}
```
**Symptom:** Fetches 50 contacts per page, then runs triageContact() for each (which itself queries email_logs). 50 extra queries per page load.
**Risk:** **MEDIUM** – Slow triage dashboard.
**Proposed Fix:** Batch engagement queries:
```typescript
// Fetch all engagement data in one query
const engagementRes = await query(`
  SELECT contact_id,
    COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opens,
    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicks,
    MAX(CASE WHEN opened_at IS NOT NULL THEN opened_at END) as last_open
  FROM email_logs
  WHERE contact_id = ANY($1)
  AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY contact_id
`, [res.rows.map(r => r.id)]);

const engagementByContact = new Map(engagementRes.rows.map(r => [r.contact_id, r]));

// Use cached engagement data
const contacts = res.rows.map(contact => {
  const engagement = engagementByContact.get(contact.id) || {};
  const tier = this.calculateTriageTier(contact, /* ... */, engagement);
  // ...
});
```

---

#### ARCH-015: Campaign Metrics Type Coercion Bug
**Type:** Logic bug
**Location:** `src/campaigns/CampaignEngine.ts:70-73`
**Code:**
```typescript
const row = res.rows[0];
const totalSent = parseInt(row.total_sent) || 0;
const openCount = parseInt(row.open_count) || 0;
const clickCount = parseInt(row.click_count) || 0;
```
**Symptom:** `COUNT(*)` in SQL already returns a number in PostgreSQL. Calling `parseInt()` on it is redundant but harmless. However, if the value is NULL (no records), `parseInt(null)` returns `NaN`, not `0`. The `|| 0` fallback doesn't catch NaN.
**Root Cause:** Defensive coding that's incomplete.
**Risk:** **LOW** – Metrics might show NaN in UI.
**Proposed Fix:**
```typescript
const totalSent = row.total_sent ? parseInt(row.total_sent, 10) : 0;
```

---

#### ARCH-016: Template Compilation Doesn't Handle Undefined Values
**Type:** Logic bug
**Location:** `src/campaigns/CampaignEngine.ts:169-173`
**Code:**
```typescript
private compileTemplate(template: string, data: any): string {
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    return data[key.trim()] || match;  // Returns match literal if undefined!
  });
}
```
**Symptom:** If template has `{{firstName}}` but contact.firstName is undefined, the output literal is `{{firstName}}` instead of empty string or "unknown". Produces malformed emails.
**Root Cause:** Returns `match` (the original template syntax) instead of empty string.
**Risk:** **MEDIUM** – Broken template interpolation; emails contain template syntax instead of data.
**Proposed Fix:**
```typescript
private compileTemplate(template: string, data: any): string {
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const value = data[key.trim()];
    return value !== undefined && value !== null ? String(value) : '';
  });
}
```

---

#### ARCH-017: Hardcoded Email Sender in Campaign Execution
**Type:** Logic bug
**Location:** `src/campaigns/CampaignEngine.ts:106, 112`
**Code:**
```typescript
const logRes = await query(..., [campaignId, contact.id, 'noreply@founderos.local', ...]);
await emailClient.sendEmail({
  from: `noreply@founderos.local`,  // Hardcoded!
  // ...
});
```
**Symptom:** Campaign always sends from `noreply@founderos.local` even if a different domain_id is configured. Ignores the domain setup.
**Root Cause:** Should fetch the domain's from_address based on campaign.domain_id.
**Risk:** **MEDIUM** – Campaigns always use default domain, breaking multi-domain setup.
**Proposed Fix:**
```typescript
const domain = await query('SELECT sender_address FROM domains WHERE id = $1', [campaign.domain_id]);
const sender = domain.rows[0]?.sender_address || 'noreply@founderos.local';

await emailClient.sendEmail({
  from: sender,
  // ...
});
```

---

#### ARCH-018: Confidence Calculation Can Go Negative
**Type:** Logic bug
**Location:** `src/inbox/classifier.ts:18, 34-56`
**Code:**
```typescript
let confidence = 0.5;
// ...
if (hasInvoiceKeyword && hasAmount) {
  confidence += 0.2;
}
if (hasQuestion) {
  confidence += 0.1;
}
if (hasNoise && hasQuestion) {
  confidence -= 0.2;
}
if (hasNoise && hasInvoiceKeyword) {
  confidence -= 0.2;
}
// ...
if (confidence < 0.45) {
  needsReview = true;
}
```
**Symptom:** Confidence starts at 0.5. Two `-0.2` penalties can bring it to 0.1 (or lower with body.length -= 0.1). But confidence is clamped to [0, 1] only at line 113, so intermediate logic uses out-of-range values. More importantly, if both noise conflicts trigger, confidence = 0.5 - 0.2 - 0.2 = 0.1, which is < 0.45, so needsReview = true. But logic assumes confidence never goes below 0.
**Root Cause:** No bounds checking during calculation.
**Risk:** **LOW** – Classification logic still works, but confidence score is semantically incorrect.
**Proposed Fix:**
```typescript
const confidence = Math.max(0, Math.min(1, 0.5 + adjustments));
```

---

#### ARCH-019: Params Slicing Bug in Triage Query
**Type:** Logic bug
**Location:** `src/intelligence/ContactTriageEngine.ts:322`
**Code:**
```typescript
// Get total count
const countRes = await query(countSql, params.length > 1 ? params.slice(0, -1) : [params[0]]);
```
**Symptom:** `countSql` builds parameters up to position 2 (if tier is set). Then it slices `params.slice(0, -1)` to remove the last param (tier), but if tier is NOT set, params = ['churned'] (length 1), and it passes just that. However, the slicing logic is fragile – if params.length = 2 (tier set), slice(0, -1) = [params[0]] = ['churned'], which is correct. But the conditional check is confusing and error-prone.
**Risk:** **LOW** – Might work by accident, but brittle.
**Proposed Fix:** Use separate param arrays:
```typescript
const countParams = [params[0]]; // Always 'churned'
if (tier) countParams.push(tier);
const countRes = await query(countSql, countParams);
```

---

### TRACKING & DELIVERY BUGS

#### ARCH-020: Email Tracking Without User Verification
**Type:** Safety bug
**Location:** `src/app/api/tracking/open/[id]/route.ts`
**Code:**
```typescript
await supabase
  .from('email_logs')
  .update({ status: 'opened', opened_at: new Date().toISOString() })
  .or(`id.eq.${trackingId},tracking_id.eq.${trackingId}`)
  .is('opened_at', null);
```
**Symptom:** The endpoint accepts any `trackingId` and marks ANY email as opened. No verification that the tracking pixel belongs to the authenticated user's campaign.
**Root Cause:** No user context check; anyone can forge tracking pixels.
**Risk:** **MEDIUM** – User can claim emails were opened that weren't; inflates metrics; skews analytics.
**Proposed Fix:**
```typescript
// First verify this trackingId belongs to the user
const emailRes = await supabase
  .from('email_logs')
  .select('id, campaign_id')
  .or(`id.eq.${trackingId},tracking_id.eq.${trackingId}`)
  .single();

if (!emailRes.data) return new NextResponse(pixel, {...}); // Invalid ID

const campaignRes = await supabase
  .from('campaigns')
  .select('id')
  .eq('id', emailRes.data.campaign_id)
  .eq('user_id', userId)  // Verify ownership
  .single();

if (!campaignRes.data) return new NextResponse(pixel, {...}); // Not owned by user

// Then mark as opened
await supabase
  .from('email_logs')
  .update({ status: 'opened', opened_at: new Date().toISOString() })
  .eq('id', emailRes.data.id)
  .is('opened_at', null);
```

---

### DATABASE & SCHEMA ISSUES

#### ARCH-021: Inconsistent Email Log Schema
**Type:** Data bug
**Location:** `database/init.sql` vs `src/campaigns/CampaignEngine.ts`
**Symptom:**
- init.sql defines email_logs with fields: `campaign_id, contact_id, domain_id, sender, recipient, status, opened_at, clicked_at`
- CampaignEngine.getCampaignMetrics() queries for `COUNT(CASE WHEN status = 'opened'...)` implying status field has 'opened' value
- But email_logs.status has values: 'sent', 'delivered', 'bounced', 'opened', 'clicked' (per schema)
- However, CampaignEngine.executeCampaign() sets status = 'sent', never sets to 'opened' or 'clicked'
- tracking/open/route.ts sets status = 'opened' directly
- So the field definition is correct, but the Campaign execution doesn't use it properly
**Root Cause:** Schema was defined with status enums, but campaign execution hardcodes 'sent' and relies on async tracking pixel updates.
**Risk:** **LOW** – Works but schema expectations don't match usage patterns.
**Proposed Fix:** Align usage – campaign should set initial status to 'sent', and tracking pixel updates to 'opened'. Ensure campaign metrics correctly query opened_at timestamp instead of status field (which may be 'sent' for unopened emails).

---

#### ARCH-022: Missing Organization Isolation in Schema
**Type:** Data bug
**Location:** `database/init.sql`
**Symptom:** Schema defines users, contacts, campaigns, etc., but there's no `organizations` table and no `organization_id` foreign key on most tables. Each table is missing multi-tenancy constraints.
**Root Cause:** Schema was designed for single-user, then expanded without proper multi-tenancy refactor.
**Risk:** **HIGH** – If multi-user features are added later, data leakage is possible.
**Proposed Fix:** Add organization table and FK references:
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD organization_id UUID REFERENCES organizations(id);
ALTER TABLE contacts ADD organization_id UUID REFERENCES organizations(id) NOT NULL;
ALTER TABLE campaigns ADD organization_id UUID REFERENCES organizations(id) NOT NULL;
-- etc for all tables
```

---

### API & REQUEST HANDLING

#### ARCH-023: No Input Validation on Campaign Creation
**Type:** Safety bug
**Location:** `src/app/api/campaigns/route.ts:19-44`
**Code:**
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name: body.name,
        type: body.type || 'marketing',
        status: body.status || 'draft',
        template_id: body.template_id,
        subject: body.subject,
        body: body.body,
        target_segments: body.target_segments,
        scheduled_at: body.scheduled_at
      })
      .select()
      .single();
```
**Symptom:** No validation that name, subject, body are non-empty strings. No validation that type is in allowed values. No validation that scheduled_at is a valid future date. Allows creation of invalid campaigns.
**Root Cause:** No schema validation (Zod or similar) before insert.
**Risk:** **MEDIUM** – Invalid campaigns in database; potential SQL injection if body contains untrusted content (though Supabase parameterizes).
**Proposed Fix:** Use Zod validation:
```typescript
const campaignSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['marketing', 'transactional', 'automated']),
  subject: z.string().min(1, 'Subject required'),
  body: z.string().min(1, 'Body required'),
  status: z.enum(['draft', 'active', 'completed', 'paused']).optional(),
  template_id: z.string().optional(),
  target_segments: z.array(z.string()).optional(),
  scheduled_at: z.string().datetime().optional(),
});

const validated = campaignSchema.parse(body);
```

---

#### ARCH-024: No Limits on Query Results
**Type:** Logic bug
**Location:** `src/app/api/inbox/threads/route.ts:33-36`
**Code:**
```typescript
// Get all messages
const { data: messages, error: msgError } = await supabase
  .from('email_messages')
  .select('*')
  .order('received_at', { ascending: false });
```
**Symptom:** Fetches ALL email messages without pagination or limit. If system has 100k messages, this loads all into memory. Also gets all receipts (line 41-43), all thread states (line 14-29) without limits.
**Root Cause:** No pagination implemented.
**Risk:** **MEDIUM** – Memory exhaustion; slow API response; potential OOM crash with large datasets.
**Proposed Fix:** Add limit and offset:
```typescript
const pageSize = 50;
const offset = (page - 1) * pageSize || 0;

const { data: messages, error: msgError } = await supabase
  .from('email_messages')
  .select('*', { count: 'exact' })
  .order('received_at', { ascending: false })
  .range(offset, offset + pageSize - 1);
```

---

### WORKFLOW & STATE BUGS

#### ARCH-025: Partial Workflow Failure Not Handled Correctly
**Type:** Logic bug
**Location:** `src/automation/WorkflowEngine.ts:68-105`
**Code:**
```typescript
let executionResult: 'success' | 'failed' | 'partial' = 'success';
let actionErrors: string[] = [];
let totalActions = 0;

for (const action of actions) {
  try {
    totalActions++;
    await this.executeAction(action, context);
  } catch (err) {
    executionResult = 'failed';  // Set to failed on first error
    actionErrors.push(err instanceof Error ? err.message : String(err));
  }
}
```
**Symptom:** If ANY action fails, `executionResult` is set to 'failed'. But if some actions succeed and some fail, the correct result should be 'partial', not 'failed'. However, there's no tracking of which actions succeeded vs. failed, so the distinction is lost.
**Root Cause:** Variable tracking incomplete.
**Risk:** **MEDIUM** – Incorrect result reporting; misleads users about workflow execution state.
**Proposed Fix:**
```typescript
let successCount = 0;
let failCount = 0;

for (const action of actions) {
  try {
    totalActions++;
    await this.executeAction(action, context);
    successCount++;
  } catch (err) {
    failCount++;
    actionErrors.push(err instanceof Error ? err.message : String(err));
  }
}

const executionResult = failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed');
```

---

#### ARCH-026: User Context Hardcoded to Demo User
**Type:** Flow bug
**Location:** `src/context/UserContext.tsx:17-21`
**Code:**
```typescript
const DEFAULT_USER: User = {
  name: 'Founder',
  email: 'founder@founderos.local',
  avatar: '👨'
};

const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(DEFAULT_USER);
```
**Symptom:** All users are initialized as "Founder" with demo email. Real authentication data is never loaded. Even if login exists, UserContext ignores it.
**Root Cause:** Context doesn't read from actual auth system (no NextAuth session loading, etc.).
**Risk:** **MEDIUM** – Multi-user features won't work; all requests/audits associated with hardcoded "Founder"; can't distinguish between real users.
**Proposed Fix:** Load user from session:
```typescript
const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const session = await getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    loadUser();
  }, []);
```

---

### PERFORMANCE & MONITORING

#### ARCH-027: Disabled SSL Verification in Production
**Type:** Safety bug
**Location:** `src/lib/db.ts:13-20`
**Code:**
```typescript
export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' || connectionString?.includes('supa') ? {
    rejectUnauthorized: false  // INSECURE in production!
  } : undefined,
});
```
**Symptom:** Comment says "Cloudflare fix" – SSL certificate verification is disabled for Supabase connections in production. This allows MITM attacks if the connection is intercepted.
**Root Cause:** Workaround for Supabase transaction pooler SSL issues, but done incorrectly.
**Risk:** **CRITICAL** – MITM vulnerability; database credentials could be intercepted.
**Proposed Fix:** Instead of disabling verification, use Supabase's correct pooling setup with valid SSL:
```typescript
ssl: process.env.NODE_ENV === 'production'
  ? {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA // Use proper CA certificate
    }
  : undefined
```
Or configure Supabase Connection Pooler properly (not transaction pooler).

---

## SECTION 2: SYSTEM-LEVEL PATTERNS & CROSS-CUTTING ISSUES

### Top 5 Root Causes Generating Multiple Bugs

#### 1. **No Authentication/Authorization Framework**
- **Impact:** Affects 6+ bugs (ARCH-001 through ARCH-006)
- **Root Cause:** Solo developer pattern – authentication assumed but never implemented. No NextAuth, Supabase Auth, or JWT middleware.
- **Manifestation:** Every API route is unauthenticated; anyone can access any data or action.
- **Fix Priority:** CRITICAL – implement auth before multi-user features.

#### 2. **In-Memory State Instead of Persistence**
- **Impact:** Affects 2 bugs (ARCH-007, ARCH-008) but creates category of data loss.
- **Root Cause:** TODO comments left in code; developer intended to persist but ran out of time.
- **Manifestation:** Usage logs, brand voice profiles lost on restart; no audit trail.
- **Fix Priority:** HIGH – implement DB persistence for all state.

#### 3. **Unsafe Parsing Without Error Handling**
- **Impact:** Affects 2+ bugs (ARCH-009, ARCH-010) and creates instability.
- **Root Cause:** JSON.parse() used without try-catch; assumes data is valid.
- **Manifestation:** Malformed data in DB crashes workflows/rules.
- **Fix Priority:** MEDIUM – wrap all parsing in error handlers.

#### 4. **No Input Validation**
- **Impact:** Affects data quality and allows invalid states.
- **Root Cause:** No Zod or schema validation; assumes client sends valid data.
- **Manifestation:** Invalid campaigns, missing fields, type mismatches.
- **Fix Priority:** MEDIUM – add Zod validation to all POST/PUT endpoints.

#### 5. **N+1 Query Anti-Pattern**
- **Impact:** Affects 2 bugs (ARCH-013, ARCH-014) and causes scale problems.
- **Root Cause:** Map + Promise.all pattern; developer didn't batch queries.
- **Manifestation:** Dashboard slow with 100+ items; scales poorly.
- **Fix Priority:** MEDIUM – batch queries; use aggregation.

---

### Architectural Pattern Issues

#### Pattern 1: Hardcoded Defaults & Configuration
**Locations:** CampaignEngine.ts (hardcoded sender), classifier.ts (environment variable reads), etc.
**Issue:** Values are hardcoded or assume specific environment setup. No configuration abstraction.
**Impact:** Code not portable; difficult to test; assumptions break in different environments.

#### Pattern 2: Singleton Instances Without Factory
**Locations:** `AIRouter.getRouter()`, `eventLoggingEngine`, `workflowAutomation`, `campaignEngine`, etc.
**Issue:** Global singletons initialized on first call, but no way to swap implementations for testing.
**Impact:** Hard to unit test; state leaks between tests; dependency injection missing.

#### Pattern 3: Implicit Dependencies & Side Effects
**Locations:** CampaignEngine calls eventLoggingEngine, WorkflowEngine calls modernCRM, etc.
**Issue:** Classes have hidden dependencies on other singletons; not passed as parameters.
**Impact:** Hard to reason about data flow; cascading failures if one module fails.

#### Pattern 4: Mixed API & Business Logic
**Locations:** API routes in `src/app/api/` call business logic directly.
**Issue:** No service layer abstraction; business logic tightly coupled to HTTP layer.
**Impact:** Can't reuse logic from cron jobs without re-implementing; hard to test business logic independently.

#### Pattern 5: Supabase vs. PostgreSQL Pool Mix
**Locations:** Some routes use `supabase` (client SDK), others use `query()` (pool).
**Issue:** Two different database access patterns in same codebase.
**Impact:** Inconsistent error handling, connection management, and performance characteristics.

---

### Data Flow Anti-Patterns

#### Anti-Pattern 1: Assumption That Data Exists
**Examples:** `getCampaign()` returns `rows[0]` without null check; contact enrichment assumes email parsing works.
**Issue:** No defensive null checks; crashes if data missing.
**Impact:** Runtime errors in production; poor error messages.

#### Anti-Pattern 2: State Updated Before Completion
**Example:** Campaign status set to 'active' before sends complete (ARCH-012).
**Issue:** Violates atomicity; can leave system in intermediate state.
**Impact:** Stuck resources; manual cleanup required.

#### Anti-Pattern 3: Event Logging as Afterthought
**Locations:** eventLoggingEngine called in try-catch blocks that swallow errors.
**Issue:** If event logging fails, main operation may still succeed silently, creating audit gaps.
**Impact:** Missing event records; inconsistent audit trail.

---

## SECTION 3: IMPLEMENTATION PLAN

### Priority Tier 1: CRITICAL (Implement First)

#### Group 1A: Authentication & Authorization (Effort: HIGH)
**Risk:** CRITICAL – Every unauthenticated endpoint is a security hole.

**Issues to Fix:**
- ARCH-001: Campaign APIs
- ARCH-002: Email send API
- ARCH-003: Contact APIs
- ARCH-004: Domain APIs (+ organization_id)
- ARCH-005: Automation/Workflow APIs
- ARCH-006: Organization isolation

**Implementation Steps:**
1. **Choose auth framework:** NextAuth.js + Supabase Auth or Clerk (recommended: Supabase Auth for alignment with DB).
2. **Add auth middleware:** Create `src/middleware.ts` to protect all `/api/*` routes:
   ```typescript
   import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
   import { NextRequest, NextResponse } from 'next/server';

   export async function middleware(req: NextRequest) {
     const res = NextResponse.next();
     const supabase = createMiddlewareClient({ req, res });
     const { data: { session } } = await supabase.auth.getSession();

     if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     res.headers.set('x-user-id', session.user.id);
     res.headers.set('x-user-org', session.user.user_metadata?.organization_id);
     return res;
   }

   export const config = {
     matcher: ['/api/:path*'],
   };
   ```
3. **Add user_id & organization_id to all tables:** Migrate schema.
4. **Filter all queries by org_id:** Update every query to include `.eq('organization_id', orgId)`.
5. **Implement login/signup flow:** Add Supabase Auth UI to app.
6. **Test:** Verify unauthorized requests return 401.

**Expected Impact:** Eliminates unauthenticated data access; enables multi-user system.
**Effort:** 3-5 days depending on chosen framework.

---

#### Group 1B: Disable Insecure SSL Config (Effort: LOW)
**Risk:** CRITICAL – MITM vulnerability in production.

**Issues to Fix:**
- ARCH-027: rejectUnauthorized: false

**Implementation:**
```typescript
// In src/lib/db.ts
ssl: process.env.NODE_ENV === 'production'
  ? {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA || undefined
    }
  : false
```

**Effort:** 15 minutes; verify with Supabase that connection works.

---

### Priority Tier 2: HIGH (Implement Next)

#### Group 2A: Fix Data Persistence (Effort: MEDIUM)
**Risk:** HIGH – Data loss on restart.

**Issues to Fix:**
- ARCH-007: AI usage logs
- ARCH-008: Brand voice profiles

**Implementation:**
1. **Create ai_usage_logs table:**
   ```sql
   CREATE TABLE ai_usage_logs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id),
     request_id TEXT,
     provider TEXT,
     model TEXT,
     task_type TEXT,
     input_tokens INT,
     output_tokens INT,
     cost DECIMAL(10,4),
     latency_ms INT,
     success BOOLEAN,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. **Replace in-memory logUsage():** Implement database insert (see fix for ARCH-007).
3. **Create brand_voice_profiles table** and persist profiles (see ARCH-008).
4. **Update getUsageSummary():** Query from DB instead of in-memory array.

**Effort:** 2-3 days.

---

#### Group 2B: Fix State Management (Effort: MEDIUM)
**Risk:** HIGH – Campaigns stuck in invalid states.

**Issues to Fix:**
- ARCH-012: Campaign execution state machine

**Implementation:**
1. **Refactor executeCampaign()** (see fix for ARCH-012):
   - Don't update status until all sends complete.
   - Track success/failure counts.
   - Use transactions for atomicity.
2. **Add 'failed' status** to campaigns enum.
3. **Add test:** Campaign with partial failures should not be stuck.

**Effort:** 1-2 days.

---

#### Group 2C: Fix Safety Issues (Effort: MEDIUM)
**Risk:** MEDIUM – Runtime crashes from malformed data.

**Issues to Fix:**
- ARCH-009: Unsafe JSON.parse in workflows
- ARCH-010: Unsafe JSON.parse in triage rules
- ARCH-011: Double logout in email client

**Implementation:**
1. **Wrap JSON.parse in try-catch** (see fixes for ARCH-009, ARCH-010).
2. **Remove second logout()** call in email client.

**Effort:** 1 day.

---

### Priority Tier 3: MEDIUM (Implement During Feature Development)

#### Group 3A: Query Optimization (Effort: MEDIUM)
**Risk:** MEDIUM – Performance degradation at scale.

**Issues to Fix:**
- ARCH-013: N+1 in campaign metrics
- ARCH-014: N+1 in triage
- ARCH-024: No pagination/limits

**Implementation:**
1. **Batch metrics** in single query (see fix for ARCH-013).
2. **Pre-fetch engagement data** in one query (see fix for ARCH-014).
3. **Add pagination** to all list endpoints (limit 50, offset-based).

**Effort:** 2-3 days.

---

#### Group 3B: Input Validation (Effort: LOW)
**Risk:** MEDIUM – Data quality issues.

**Issues to Fix:**
- ARCH-023: No validation on campaign creation

**Implementation:**
1. **Add Zod schemas** to `src/lib/schemas.ts`.
2. **Validate all POST/PUT requests** with `.parse()` before processing.

**Effort:** 2-3 days.

---

#### Group 3C: Logic Fixes (Effort: LOW)
**Risk:** LOW–MEDIUM – Incorrect behavior in edge cases.

**Issues to Fix:**
- ARCH-015: Type coercion in metrics
- ARCH-016: Template compilation
- ARCH-017: Hardcoded email sender
- ARCH-018: Confidence calculation
- ARCH-019: Params slicing
- ARCH-025: Workflow result tracking

**Implementation:** Individual fixes as listed above.
**Effort:** 1 day (all together).

---

#### Group 3D: Tracking & Verification (Effort: MEDIUM)
**Risk:** MEDIUM – Metrics manipulation.

**Issues to Fix:**
- ARCH-020: Email tracking without verification

**Implementation:**
1. **Add user_id to email_logs** (schema change).
2. **Verify tracking pixel ownership** (see fix for ARCH-020).

**Effort:** 1 day.

---

### Priority Tier 4: LOW (Refactor)

#### Group 4A: Architecture Improvements (Effort: HIGH)
- Decouple API layer from business logic (extract service layer).
- Add proper dependency injection for singletons.
- Standardize on single DB access pattern (Supabase or pool, not both).

#### Group 4B: Schema Refactor (Effort: MEDIUM)
- Add organizations table (ARCH-022).
- Add user_id references to all tables.
- Add indexes for foreign keys and frequently queried fields.

---

### Order of Operations (Minimize Risk)

1. **Week 1: Authentication (Tier 1A)**
   - Implement Supabase Auth.
   - Protect all API routes with middleware.
   - Migrate schema to include user_id/org_id.
   - Result: Authenticated system; data isolated by org.

2. **Week 2: Critical Fixes (Tier 1B + 2A + 2B)**
   - Fix SSL config (15 min).
   - Persist AI usage logs and brand voice (2-3 days).
   - Fix campaign execution state (1-2 days).
   - Result: No data loss; no stuck campaigns; secure DB connection.

3. **Week 3: Safety & Performance (Tier 2C + 3A)**
   - Fix JSON parsing errors (1 day).
   - Optimize N+1 queries (2-3 days).
   - Result: No crashes from malformed data; dashboard fast at scale.

4. **Week 4: Polish (Tier 3B + 3C + 3D)**
   - Add input validation (2-3 days).
   - Fix logic bugs (1 day).
   - Fix tracking verification (1 day).
   - Result: Consistent data quality; correct behavior.

5. **Ongoing: Refactoring (Tier 4)**
   - Extract service layer.
   - Improve test coverage.
   - Add monitoring/observability.

---

### Testing & Verification

**For Each Fix:**
1. Write unit test covering the bug.
2. Verify test fails before fix, passes after.
3. Run integration tests (if exist).
4. Smoke test affected feature end-to-end.

**Critical Path Testing:**
- Campaign execution (multiple sends, partial failure).
- Authentication (401 on unauthenticated request).
- Email tracking (verify only own campaigns' pixels tracked).
- Workflow execution (partial success handled correctly).

---

### Success Criteria

**After All Fixes:**
- ✅ No unauthenticated API endpoints.
- ✅ No data loss on restart.
- ✅ Campaign execution atomic (no stuck states).
- ✅ Metrics queries complete in <500ms at 10k items.
- ✅ No unhandled JSON parsing errors.
- ✅ All input validated with clear error messages.
- ✅ Email tracking verification prevents spoofing.
- ✅ Test coverage >70% on critical paths.

---

## SUMMARY

This codebase has **24 documented bugs** across architecture, data flow, and business logic. The top 3 blockers are:

1. **No authentication** – Entire system is open; requires immediate implementation.
2. **In-memory state loss** – Usage logs and brand voice profiles disappear on restart.
3. **Unsafe state transitions** – Campaigns can get stuck in 'active' state indefinitely.

With the implementation plan above (Tier 1-2, weeks 1-3), the system becomes:
- **Secure** (authenticated, authorized, isolated by org).
- **Reliable** (state persisted, transactional, error-handled).
- **Scalable** (queries batched, paginated, indexed).
- **Maintainable** (validated inputs, clear error messages, logged events).

Estimated effort: **4-5 weeks** for solo developer to implement Tiers 1-3.
