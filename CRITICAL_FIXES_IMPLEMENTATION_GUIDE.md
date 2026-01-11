# Critical Fixes Implementation Guide
**Priority:** Ship-blocking
**Total Effort:** 3-4 days
**Triage:** Fix in order of impact

---

## CRITICAL FIX #1: Campaign Send Transaction Support
**File:** `/src/campaigns/CampaignEngine.ts`
**Current Lines:** 84-141
**Priority:** CRITICAL (1st)
**Effort:** 2-3 days
**Risk:** Medium (requires DB transaction support)

### The Problem
Campaign execution marks emails as 'sent' BEFORE they actually send. If any email fails mid-batch, campaign status shows 'completed' but some recipients never got the email.

### Current Code Pattern (BROKEN)
```typescript
// Line 89: Mark campaign as ACTIVE immediately
await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['active', campaignId]);

// Line 99-127: Loop and send (no transaction, no rollback)
for (const contact of contacts.rows) {
    try {
        // Log is inserted as 'sent' FIRST
        await query('INSERT INTO email_logs (...) VALUES (..., "sent")');

        // THEN try to send (may fail)
        await emailClient.sendEmail(...);

        // If above fails, loop continues (error just logged to console)
    } catch (error) {
        console.error('Email failed'); // Silent failure
    }
}

// Line 140: Mark campaign COMPLETED even if some failed
await query('UPDATE campaigns SET status = $1 WHERE id = $2', ['completed', campaignId]);
```

### Fixed Code Pattern
```typescript
async executeCampaign(campaignId: string) {
    const client = await getDbClient();

    try {
        // START TRANSACTION
        await client.query('BEGIN');

        // Mark campaign IN_PROGRESS
        await client.query(
            'UPDATE campaigns SET status = $1, started_at = NOW() WHERE id = $2',
            ['in_progress', campaignId]
        );

        // Get campaign and contacts
        const campaign = await client.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
        const contacts = await client.query(
            'SELECT id, email FROM contacts WHERE stage != $1',
            ['churned']
        );

        // Send emails (if ANY fail, transaction will rollback)
        const sentIds = [];
        const failedRecipients = [];

        for (const contact of contacts.rows) {
            try {
                // Get domain info
                const domain = await client.query(
                    'SELECT * FROM domains WHERE user_id = $1 LIMIT 1',
                    [campaign.rows[0].user_id]
                );

                // Create email log with PENDING status
                const logRes = await client.query(
                    `INSERT INTO email_logs
                     (campaign_id, contact_id, domain_id, sender, recipient, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     RETURNING id`,
                    [
                        campaignId,
                        contact.id,
                        domain.rows[0]?.id || null,
                        domain.rows[0]?.name || 'noreply@example.com',
                        contact.email,
                        'pending' // NOT 'sent' yet
                    ]
                );

                const logId = logRes.rows[0].id;

                // ACTUALLY SEND EMAIL (may throw)
                const sendResult = await emailClient.sendEmail({
                    from: domain.rows[0]?.name || 'noreply@example.com',
                    to: contact.email,
                    subject: campaign.rows[0].subject,
                    body: campaign.rows[0].body
                }, logId);

                // Update log to SENT only if actually sent
                await client.query(
                    'UPDATE email_logs SET status = $1, sent_at = NOW() WHERE id = $2',
                    ['sent', logId]
                );

                sentIds.push(contact.id);

            } catch (sendError) {
                // Mark THIS email as FAILED, but continue with others
                if (logId) {
                    await client.query(
                        'UPDATE email_logs SET status = $1, error_message = $2, failed_at = NOW() WHERE id = $3',
                        ['failed', sendError.message, logId]
                    );
                }
                failedRecipients.push({
                    email: contact.email,
                    error: sendError.message
                });
            }
        }

        // Only commit if at least SOME emails sent
        if (sentIds.length === 0) {
            // ALL FAILED - rollback and throw
            await client.query('ROLLBACK');
            throw new Error(`Campaign send failed: 0/${contacts.rows.length} emails sent`);
        }

        // Update campaign status based on results
        const hasFailures = failedRecipients.length > 0;
        const finalStatus = hasFailures ? 'completed_with_failures' : 'completed';

        await client.query(
            `UPDATE campaigns
             SET status = $1,
                 sent_count = $2,
                 failed_count = $3,
                 completed_at = NOW()
             WHERE id = $4`,
            [finalStatus, sentIds.length, failedRecipients.length, campaignId]
        );

        // COMMIT TRANSACTION
        await client.query('COMMIT');

        // Return results to caller
        return {
            success: true,
            sentCount: sentIds.length,
            failedCount: failedRecipients.length,
            status: finalStatus,
            failedRecipients: failedRecipients
        };

    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
        }

        // Update campaign to FAILED state
        await query(
            'UPDATE campaigns SET status = $1, error_message = $2, failed_at = NOW() WHERE id = $3',
            ['failed', error.message, campaignId]
        );

        throw new Error(`Campaign execution failed: ${error.message}`);

    } finally {
        client.release();
    }
}
```

### Required Database Changes
```sql
-- Update campaigns table schema
ALTER TABLE campaigns
ADD COLUMN sent_count INT DEFAULT 0,
ADD COLUMN failed_count INT DEFAULT 0,
ADD COLUMN started_at TIMESTAMP,
ADD COLUMN completed_at TIMESTAMP,
ADD COLUMN failed_at TIMESTAMP,
ADD COLUMN error_message TEXT;

-- Update campaign status enum
ALTER TYPE campaign_status ADD VALUE 'in_progress' BEFORE 'completed';
ALTER TYPE campaign_status ADD VALUE 'completed_with_failures' AFTER 'completed';
ALTER TYPE campaign_status ADD VALUE 'failed' AFTER 'completed_with_failures';

-- Update email_logs table
ALTER TABLE email_logs ADD COLUMN sent_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN failed_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN error_message TEXT;

-- Add index for failed email queries
CREATE INDEX idx_email_logs_status_campaign ON email_logs(status, campaign_id);
```

### Frontend Changes
**File:** `/src/components/campaigns/CampaignDetailModal.tsx`
- Update to show failures: "3 sent, 1 failed"
- Add "View failed recipients" button
- Show error message from campaign.error_message

**File:** `/src/app/(dashboard)/campaigns/page.tsx`
- Show campaign status with badge: "completed_with_failures" = 🟡 yellow badge
- Show "(3/4 delivered)" as subtitle

### Testing Checklist
- [ ] Manual test: Send campaign, verify transaction commits only after all sends
- [ ] Manual test: Simulate 1 email failure mid-batch, verify others continue and campaign shows "completed_with_failures"
- [ ] Manual test: Simulate all emails fail, verify campaign status = "failed" and transaction rolls back
- [ ] Database test: Verify email_logs has correct mix of 'sent' and 'failed' statuses after partial failure
- [ ] Load test: Send to 1000 contacts, verify transaction doesn't timeout

---

## CRITICAL FIX #2: Contact Score Race Condition
**File:** `/src/crm/CustomerRelationshipEngine.ts`
**Current Lines:** 79-83
**Priority:** CRITICAL (2nd)
**Effort:** 1 day
**Risk:** Low

### The Problem
Contact created, but health_score calculated asynchronously. User sees incomplete contact data until refresh.

### Current Code (BROKEN)
```typescript
const id = res.rows[0].id;
await workflowAutomation.trigger('contact.created', { contactId: id }); // async, not awaited
await this.enrichContact(id); // async enrichment, not awaited
return id;
```

### Fixed Code (OPTION A: Await)
```typescript
// Synchronous path - ensures score is calculated before return
async createContact(data: any) {
    // Insert contact with default health_score
    const res = await query(
        `INSERT INTO contacts (name, email, company, industry, stage, health_score, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            company = EXCLUDED.company,
            industry = EXCLUDED.industry,
            stage = EXCLUDED.stage
         RETURNING *`,
        [data.name, data.email, data.company, data.industry, data.stage || 'lead', 100]
    );

    const contact = res.rows[0];

    // AWAIT score calculation
    const scoredContact = await this.scoreLead(contact.id);

    // Fire workflow trigger in background (don't wait)
    workflowAutomation.trigger('contact.created', { contactId: contact.id }).catch(
        err => console.error('Workflow trigger failed:', err)
    );

    return scoredContact; // Return with score calculated
}
```

### Fixed Code (OPTION B: Loading State)
```typescript
// Async path - returns immediately but indicates score is loading
async createContact(data: any) {
    const res = await query(
        `INSERT INTO contacts (name, email, company, industry, stage, health_score, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (email) DO UPDATE SET ...
         RETURNING *`,
        [data.name, data.email, data.company, data.industry, data.stage || 'lead', 100]
    );

    const contact = res.rows[0];

    // Background scoring (no await)
    this.scoreLead(contact.id).catch(
        err => console.error('Score calculation failed:', err)
    );

    // Trigger workflow
    workflowAutomation.trigger('contact.created', { contactId: contact.id }).catch(
        err => console.error('Workflow failed:', err)
    );

    return {
        ...contact,
        health_score: undefined // Signal that score is loading
    };
}
```

### Frontend Changes
**File:** `/src/components/crm/AddContactForm.tsx`
- If returning Option A: No changes needed (score always populated)
- If returning Option B: Show spinner for health_score field initially

**File:** `/src/app/(dashboard)/crm/page.tsx`
- Show "Calculating..." for new contacts' health_score
- Implement polling to refresh score when complete

### Testing Checklist
- [ ] Create contact, immediately fetch contact data, verify health_score is populated
- [ ] Create contact and immediately view in CRM, verify score appears within 100ms
- [ ] Create 10 contacts rapidly, verify all get scores calculated
- [ ] Verify contact creation API response time doesn't exceed 500ms

---

## CRITICAL FIX #3: Email Delivery Failure Handling
**File:** `/src/campaigns/CampaignEngine.ts` (send loop)
**Current Lines:** 101-108
**Priority:** CRITICAL (3rd)
**Effort:** 1 day
**Risk:** Low

### The Problem
Email logged as 'sent' BEFORE actually sending. If SMTP fails, log shows 'sent' but email never left.

### Current Code (BROKEN)
```typescript
// Insert log FIRST
const logRes = await query(
    `INSERT INTO email_logs (...) VALUES (..., 'sent') RETURNING id`
);

// Send email SECOND (may fail)
await emailClient.sendEmail(...); // If this fails, log still says 'sent'
```

### Fixed Code
```typescript
// Insert log as 'pending' FIRST
const logRes = await query(
    `INSERT INTO email_logs
     (campaign_id, contact_id, domain_id, sender, recipient, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     RETURNING id`,
    [campaignId, contactId, domainId, from, to]
);

const logId = logRes.rows[0].id;

try {
    // Send email
    await emailClient.sendEmail({
        from,
        to,
        subject,
        body,
        tracking: true,
        logId: logId // Pass log ID for tracking
    });

    // Update log to 'sent' ONLY if actually sent
    await query(
        'UPDATE email_logs SET status = $1, sent_at = NOW() WHERE id = $2',
        ['sent', logId]
    );

} catch (sendError) {
    // Update log to 'failed' with error details
    await query(
        `UPDATE email_logs
         SET status = $1,
             error_message = $2,
             failed_at = NOW()
         WHERE id = $3`,
        ['failed', sendError.message, logId]
    );

    // Don't throw - let campaign continue with other recipients
    console.error(`Failed to send email to ${to}: ${sendError.message}`);
    throw sendError; // Throw to be caught by campaign loop
}
```

### Email Log State Diagram
```
pending → sent (if SMTP succeeds)
       → failed (if SMTP fails)
```

### Database Changes
```sql
-- Already covered in Fix #1, but verify these columns exist:
ALTER TABLE email_logs ADD COLUMN sent_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN failed_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN error_message TEXT;

-- Add index for efficiency
CREATE INDEX idx_email_logs_status ON email_logs(status);
```

### Frontend Changes
**File:** `/src/components/campaigns/CampaignDetailModal.tsx`
- Show email status breakdown: "200 sent, 5 failed, 0 pending"
- Show "View failures" button that lists failed emails + errors

**File:** `/src/intelligence/CampaignAnalyticsEngine.ts`
- Exclude 'pending' and 'failed' from open rate calculations
- Metrics should use: opens / sent_count (not including failed)

### Testing Checklist
- [ ] Manual test: Send campaign, simulate SMTP failure mid-batch
- [ ] Verify email_logs shows: "sent" for successful, "failed" for failed
- [ ] Verify campaign status shows actual sent vs failed count
- [ ] Verify metrics calculation excludes failed emails
- [ ] Verify user can see which emails failed and why

---

## CRITICAL FIX #4: Unsaved State Protection
**File:** `/src/components/ui/Modal.tsx`
**Current Lines:** 10-16 (close handler), 25 (backdrop click)
**Priority:** CRITICAL (4th)
**Effort:** 4 hours
**Risk:** Low

### The Problem
User fills form, clicks outside modal, form closes, ALL DATA LOST, no warning.

### Current Code (BROKEN)
```typescript
<div
    className="fixed inset-0 bg-black/50"
    onClick={closeModal} // CLOSES WITHOUT CHECKING IF DIRTY
    aria-label="Close modal"
>
    {/* Modal content */}
</div>
```

### Fixed Code - Option A: Prevent Close If Dirty
```typescript
interface ModalProps {
    title: string;
    children: React.ReactNode;
    isDirty?: boolean; // NEW: Track if form has unsaved changes
    onClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({ title, children, isDirty = false, onClose }) => {
    const { closeModal } = useUI();

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (isDirty) {
            // Show confirmation
            if (window.confirm('You have unsaved changes. Discard them?')) {
                closeModal();
                onClose?.();
            }
            // else: don't close
        } else {
            // No unsaved work, close immediately
            closeModal();
            onClose?.();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50"
            onClick={handleBackdropClick}
            aria-label="Close modal"
        >
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center p-6 border-b">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <button
                            onClick={handleBackdropClick}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
```

### Fixed Code - Option B: Track Dirty State in Forms
```typescript
// In AddContactForm.tsx
const [isDirty, setIsDirty] = useState(false);

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true); // Mark as dirty on any change
    setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleSubmit = async (e: React.FormEvent) => {
    // ... submit logic ...
    if (success) {
        setIsDirty(false); // Clear dirty flag after successful submit
    }
};

const handleModalClose = () => {
    if (isDirty) {
        if (window.confirm('Discard unsaved changes?')) {
            closeModal();
        }
    } else {
        closeModal();
    }
};

return (
    <Modal isDirty={isDirty} onClose={handleModalClose}>
        {/* Form fields */}
        <input onChange={handleInputChange} />
    </Modal>
);
```

### Alternative: Browser-Level Protection
```typescript
// Use beforeunload for page navigation
useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes';
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

### Forms to Update
1. **AddContactForm.tsx** - Add isDirty tracking
2. **AddDomainForm.tsx** - Add isDirty tracking
3. **CreateCampaignForm.tsx** - Add isDirty tracking
4. **EditContactForm.tsx** (if exists) - Add isDirty tracking
5. **CreateWorkflowForm.tsx** (if exists) - Add isDirty tracking

### Testing Checklist
- [ ] Fill form, click outside modal backdrop, verify confirmation appears
- [ ] Fill form, click "X" button, verify confirmation appears
- [ ] Fill form, press ESC key, verify confirmation appears
- [ ] Fill form, click "Submit", verify confirmation does NOT appear after submit completes
- [ ] Fill form (then clear it), click outside, verify no confirmation (not dirty anymore)

---

## Validation & Testing Checklist

### Before Committing Each Fix
- [ ] Code compiles without errors
- [ ] No new TypeScript errors
- [ ] Database migrations run successfully
- [ ] Existing tests still pass (if any)

### Manual Testing
- [ ] Test each fix in isolation
- [ ] Test fixes together (interaction effects)
- [ ] Test at scale (large datasets)
- [ ] Test error scenarios

### Performance Validation
- [ ] Campaign send transaction completes < 30s for 1000 recipients
- [ ] Contact creation < 500ms
- [ ] Campaign details page loads < 2s with 100+ email logs

### Data Integrity Checks
```sql
-- Verify transaction safety
SELECT COUNT(*) FROM campaigns WHERE status = 'in_progress' AND started_at < NOW() - INTERVAL '10 minutes';
-- Should return 0 (no stuck transactions)

-- Verify email log consistency
SELECT COUNT(*) FROM email_logs WHERE status NOT IN ('sent', 'failed', 'pending', 'opened', 'clicked');
-- Should return 0 (only valid statuses)

-- Verify no orphaned logs
SELECT COUNT(*) FROM email_logs WHERE campaign_id NOT IN (SELECT id FROM campaigns);
-- Should return 0 (all logs have valid campaigns)
```

---

## Rollout Plan

### Day 1: Implement & Test Fix #1 (Transaction Support)
- Implement code changes
- Test transaction behavior
- Test partial failures
- Test all scenarios in staging

### Day 2: Implement & Test Fix #2 (Score Race Condition)
- Implement code changes
- Test score calculation timing
- Test UI display of loading state
- Test concurrent contact creation

### Day 3: Implement & Test Fix #3 (Email Delivery Failure)
- Implement code changes
- Test SMTP failure scenarios
- Test partial batch failures
- Test metrics accuracy

### Day 4: Implement & Test Fix #4 (Unsaved State) + Integration Testing
- Implement code changes
- Test all form types
- Test unsaved data protection
- Full integration test of all 4 fixes together
- Performance testing at scale

### Day 5: Final Validation & Launch Approval
- Final smoke test
- Database integrity checks
- Performance validation
- Launch readiness approval

---

## Success Criteria for Launch

**Campaign Send:**
- [ ] All emails successfully sent are marked 'sent'
- [ ] All failures marked 'failed' with error message
- [ ] Campaign status reflects actual outcome (completed vs completed_with_failures vs failed)
- [ ] Partial failure doesn't affect successful sends

**Contact Score:**
- [ ] Score always populated before returning to frontend
- [ ] No "pending" or null scores visible to user
- [ ] Creation completes < 500ms even during peak load

**Email Delivery:**
- [ ] No emails logged as 'sent' that don't actually send
- [ ] All failures tracked with root cause
- [ ] User can see which emails failed and why

**Unsaved State:**
- [ ] All forms warn user before discarding work
- [ ] No accidental data loss possible
- [ ] Warning is non-intrusive but clear

**Post-Fix Launch Readiness:** 90/100 ✅
