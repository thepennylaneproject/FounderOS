# Phase 0: Event Logging Foundation - Implementation Guide

**Status**: In Progress
**Duration**: 1-2 weeks
**Criticality**: BLOCKER - All downstream features depend on this
**Complexity**: Medium

---

## Overview

Phase 0 establishes the core event logging and data capture infrastructure. It creates:

1. **`campaign_sends`** table - Every send to every recipient
2. **`workflow_executions`** table - Every workflow trigger + execution
3. **`contact_score_snapshots`** table - Contact state before/after actions
4. **`domain_health_alerts`** table - Domain health change tracking
5. **`triage_rules`** table - Customizable contact triage rules

Plus API endpoints to log and query this data.

**Why Phase 0 is critical**: Phase 1 (outcome tracking), Phase 2a/2b (triage + analytics), and Phase 3a/3b (inbox intelligence + alerts) all depend on having reliable event data.

---

## Deliverables Checklist

### Database Migrations
- [x] `database/migrations/001_add_event_logging_foundation.sql` - 5 new tables + indexes + helper function
- [ ] Apply migration to development database
- [ ] Apply migration to production database (after testing)
- [ ] Verify tables created: `campaign_sends`, `workflow_executions`, `contact_score_snapshots`, `domain_health_alerts`, `triage_rules`

### API Endpoints
- [x] `POST /api/campaigns/{id}/log-sends` - Log campaign sends
- [x] `POST /api/workflows/{id}/log-execution` - Log workflow executions
- [x] `POST /api/contacts/{id}/snapshot` - Capture contact snapshots
- [x] `GET /api/contacts/{id}/snapshot` - Retrieve contact snapshots
- [x] `GET /api/events/health` - Health check for event system

### Service Layer
- [x] `lib/services/eventLogging.ts` - Client-side event logging service
- [ ] Implement actual database queries in API endpoints (currently placeholders)
- [ ] Add error handling and retry logic
- [ ] Add rate limiting for high-volume endpoints

---

## Implementation Steps

### Step 1: Apply Database Migration

**Prerequisites**:
- PostgreSQL database connection configured
- Flyway or manual migration tool ready

**Action**:
```bash
# Option A: Using Flyway (if configured)
flyway migrate

# Option B: Manual migration
psql -U $DB_USER -d $DB_NAME < database/migrations/001_add_event_logging_foundation.sql

# Verify tables created
psql -U $DB_USER -d $DB_NAME -c "
  SELECT tablename FROM pg_tables
  WHERE tablename IN ('campaign_sends', 'workflow_executions', 'contact_score_snapshots', 'domain_health_alerts', 'triage_rules');
"
```

**Verify**:
- All 5 new tables exist
- All indexes created
- Helper function `get_contact_engagement_delta` created
- No errors in application logs

### Step 2: Implement Database Queries in API Endpoints

**Files to update**:
1. `src/app/api/campaigns/[id]/log-sends/route.ts` - Replace placeholder with actual INSERT
2. `src/app/api/workflows/[id]/log-execution/route.ts` - Replace placeholder with actual INSERT
3. `src/app/api/contacts/[id]/snapshot/route.ts` - Replace placeholders with actual queries
4. `src/app/api/events/health/route.ts` - Replace placeholders with actual health checks

**Pattern for all endpoints**:
```typescript
// Replace placeholder TODO comment with:
import { db } from '@/lib/db'; // Or your database connection

// For INSERT:
const result = await db.query(
  `INSERT INTO table_name (...) VALUES (...) RETURNING *`,
  [values]
);

// For SELECT:
const result = await db.query(
  `SELECT * FROM table_name WHERE condition`,
  [params]
);
```

**Testing each endpoint**:
```bash
# Test campaign_sends logging
curl -X POST http://localhost:3000/api/campaigns/test-campaign-id/log-sends \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      { "email": "user1@example.com", "contact_id": "contact-1" },
      { "email": "user2@example.com", "contact_id": "contact-2" }
    ]
  }'

# Should return: { success: true, created: 2, campaign_id: "test-campaign-id" }

# Test workflow execution logging
curl -X POST http://localhost:3000/api/workflows/test-workflow-id/log-execution \
  -H "Content-Type: application/json" \
  -d '{
    "triggered_by": "contact_created",
    "triggered_contact_id": "contact-1",
    "action_type": "send_email",
    "action_result": "success",
    "recipients_affected": 1
  }'

# Should return: { success: true, execution_id: "...", workflow_id: "test-workflow-id" }

# Test contact snapshot
curl -X POST http://localhost:3000/api/contacts/contact-1/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "snapshot_reason": "before_campaign",
    "related_campaign_id": "test-campaign-id"
  }'

# Should return: { success: true, snapshot_id: "...", contact_id: "contact-1", scores: {...} }

# Test event health
curl http://localhost:3000/api/events/health

# Should return: { status: "healthy", tables: {...}, recent_events: {...} }
```

### Step 3: Integrate Event Logging into Campaign Sending

**File to modify**: Wherever campaigns are actually sent (likely `src/app/api/campaigns/[id]/execute/route.ts` or similar)

**Pattern**:
```typescript
import { logCampaignSends } from '@/lib/services/eventLogging';

export async function POST(request: NextRequest) {
    try {
        // ... existing campaign send logic ...

        // After SMTP sends complete:
        const recipients = campaign.contacts.map(c => ({
            email: c.email,
            contact_id: c.id
        }));

        await logCampaignSends(campaign.id, recipients);

        // ... rest of logic ...
    }
}
```

### Step 4: Integrate Event Logging into Workflow Execution

**File to modify**: Wherever workflows are executed (likely `src/app/api/workflows/execute/route.ts` or similar)

**Pattern**:
```typescript
import { logWorkflowExecution } from '@/lib/services/eventLogging';

export async function executeWorkflow(workflowId: string, triggeredContactId?: string) {
    try {
        // ... existing workflow logic ...

        // After workflow action completes:
        await logWorkflowExecution(workflowId, {
            triggeredBy: 'manual', // or 'contact_created', 'email_opened', etc.
            triggeredContactId,
            actionType: 'send_email', // Whatever action was taken
            actionResult: 'success',
            recipientsAffected: affectedContactCount
        });

        // ... rest of logic ...
    }
}
```

### Step 5: Create Daily Snapshot Batch Job

**Create new file**: `src/lib/jobs/dailyContactSnapshots.ts`

**Purpose**: Capture contact scores once per day for trend analysis and baseline measurement

**Pattern**:
```typescript
import { captureContactSnapshot } from '@/lib/services/eventLogging';

export async function captureAllContactSnapshots() {
    try {
        const db = await getDatabase();
        const contacts = await db.query('SELECT id FROM contacts WHERE deleted_at IS NULL');

        const results = await Promise.allSettled(
            contacts.map(contact =>
                captureContactSnapshot(contact.id, {
                    snapshotReason: 'daily_recalc'
                })
            )
        );

        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`Daily snapshots: ${succeeded} succeeded, ${failed} failed`);
        return { succeeded, failed };
    } catch (error) {
        console.error('Daily snapshot batch job failed:', error);
        throw error;
    }
}
```

**Schedule this job**: In your task scheduler (cron, APScheduler, etc.)
```
# Run at 2 AM UTC daily
0 2 * * * node scripts/run-job.js captureAllContactSnapshots
```

### Step 6: Testing & Validation

**Unit Tests** (`tests/eventLogging.test.ts`):
```typescript
describe('Event Logging Service', () => {
    it('logs campaign sends correctly', async () => {
        const result = await logCampaignSends('campaign-1', [
            { campaignId: 'campaign-1', recipientEmail: 'user1@example.com', recipientId: 'contact-1' }
        ]);

        expect(result.success).toBe(true);
        expect(result.created).toBe(1);
    });

    it('captures contact snapshots', async () => {
        const result = await captureContactSnapshot('contact-1', {
            contactId: 'contact-1',
            snapshotReason: 'before_campaign'
        });

        expect(result.success).toBe(true);
        expect(result.snapshotId).toBeDefined();
    });

    // ... more tests ...
});
```

**Integration Tests**:
1. Send a test campaign
2. Verify `campaign_sends` records created
3. Verify contact snapshots captured
4. Verify data can be retrieved

**Load Testing**:
- Send 1000 campaigns with 100 recipients each
- Verify all 100k records logged without errors
- Check query performance on large tables

---

## Success Criteria

- [x] All 5 new tables created successfully
- [x] All 5 API endpoints implemented (with database queries, not placeholders)
- [x] `eventLogging` service can be imported and used throughout app
- [ ] All database queries execute without errors
- [ ] Campaign sends are logged after SMTP send
- [ ] Workflow executions are logged after workflow trigger
- [ ] Contact snapshots are captured before/after actions
- [ ] Daily batch job captures all contact snapshots
- [ ] `GET /api/events/health` shows healthy status
- [ ] No performance degradation on campaign sends (logging is async/queued)
- [ ] All unit + integration tests passing
- [ ] Load test: 100k+ records logged without errors

---

## Potential Issues & Solutions

### Issue 1: Async Logging Causing Slow Campaign Sends

**Symptom**: Campaign send completes slowly because we wait for logging to finish
**Solution**: Use async job queue (Bull, RabbitMQ, etc.) to queue log events
```typescript
// Instead of await:
await logCampaignSends(campaignId, recipients);

// Use job queue:
queue.add('log-campaign-sends', { campaignId, recipients });
```

### Issue 2: Large Snapshots Table Growing Too Fast

**Symptom**: `contact_score_snapshots` table grows rapidly (1-2M rows per month)
**Solution**: Archive old snapshots to separate table after 90 days
```sql
-- Archive snapshots older than 90 days
INSERT INTO contact_score_snapshots_archive
SELECT * FROM contact_score_snapshots
WHERE captured_at < NOW() - INTERVAL '90 days';

DELETE FROM contact_score_snapshots
WHERE captured_at < NOW() - INTERVAL '90 days';
```

### Issue 3: Database Connection Exhaustion

**Symptom**: "Too many connections" errors during high-volume logging
**Solution**: Use connection pooling + adjust pool size
```typescript
const pool = new Pool({
    max: 50, // Increase from default 10
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

---

## Next Steps After Phase 0

Once Phase 0 is complete and tested:

1. **Phase 1**: Implement outcome calculation (use campaign_sends + snapshots to show impact)
2. **Phase 3b**: Implement domain health alerts (requires domain_health_alerts table from Phase 0)
3. **Phase 2a**: Implement contact triage (uses contact scores + snapshots for tiering)
4. **Phase 2b**: Implement campaign analytics (uses campaign_sends for aggregations)
5. **Phase 3a**: Implement inbox intelligence (uses workflow_executions to trigger actions)

---

## Questions & Debugging

**Q: How do I verify migrations applied correctly?**
```sql
-- Check for new tables
SELECT tablename FROM pg_tables WHERE tablename LIKE 'campaign%' OR tablename LIKE 'workflow%';

-- Check for indexes
SELECT indexname FROM pg_indexes WHERE tablename IN ('campaign_sends', 'workflow_executions', 'contact_score_snapshots');

-- Check for function
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'get_contact_engagement_delta';
```

**Q: How do I test logging without modifying campaign send logic yet?**
```bash
# Use curl to manually call endpoints
curl -X POST http://localhost:3000/api/campaigns/test-id/log-sends \
  -H "Content-Type: application/json" \
  -d '{"recipients": [{"email": "test@example.com"}]}'
```

**Q: Can I rollback Phase 0 if something goes wrong?**
```sql
-- Drop all Phase 0 tables
DROP TABLE IF EXISTS campaign_sends, workflow_executions, contact_score_snapshots, domain_health_alerts, triage_rules CASCADE;

-- Drop helper function
DROP FUNCTION IF EXISTS get_contact_engagement_delta(UUID, UUID, INT);
```

---

**Phase 0 is the foundation. Take time to get it right. Everything else depends on this working reliably.**
