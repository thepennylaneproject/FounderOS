# FounderOS: Latent Opportunity Implementation Roadmap

**Goal**: Transform FounderOS from a task processor into a decision multiplier by implementing the 5 highest-impact features that leverage existing data and architecture.

**Expected outcome**: 90/100 → 95+/100 product maturity, with compounding user value and retention improvements.

---

## PHASE OVERVIEW & DEPENDENCIES

```
Phase 0: Foundation (1-2 weeks)
└─ Data tracking & event logging infrastructure

    ├─→ Phase 1: "What Happened" Layer (2-3 weeks)
    │   └─ Campaign outcome tracking & correlation
    │   └─ Workflow performance measurement
    │   └─ Impact display on campaigns/workflows
    │
    ├─→ Phase 2a: Contact Triage (2-3 weeks) [Parallel with Phase 1]
    │   └─ Depends on: Phase 1 data (outcome tracking)
    │   └─ Implements: Tiering logic + next-best-action suggestions
    │
    ├─→ Phase 2b: Campaign Analytics (2 weeks) [Parallel with Phase 1-2a]
    │   └─ Depends on: Phase 1 data
    │   └─ Implements: Aggregate performance dashboard
    │
    └─→ Phase 3: Async Parallel Tracks
        ├─ Inbox Intelligence (2-3 weeks)
        │  └─ Depends on: Email sync (already exists)
        │  └─ New: AI extraction + trigger logic
        │
        └─ Domain Alerts (1-2 weeks)
           └─ Depends on: Domain health tracking (exists)
           └─ New: Change detection + alerting
```

**Key insight**: Phases 1, 2a, 2b, and 3 can mostly run in parallel after Phase 0 foundation work.

---

## PHASE 0: DATA INFRASTRUCTURE & TRACKING (Foundation)
**Duration**: 1-2 weeks | **Complexity**: Medium | **Blocking**: All downstream features

### What Needs to Happen

This phase establishes the **event logging and correlation system** that all other features depend on.

### 1. Event Logging System

**New table: `campaign_sends` (replaces/supplements existing campaign tracking)**
```sql
CREATE TABLE campaign_sends (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  recipient_email VARCHAR(255),
  recipient_id UUID REFERENCES contacts(id),
  sent_at TIMESTAMP,
  opened_at TIMESTAMP NULL,
  clicked_at TIMESTAMP NULL,
  replied_at TIMESTAMP NULL,
  bounced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  triggered_by VARCHAR(50), -- "contact_created", "email_opened", "scheduled", etc.
  triggered_contact_id UUID REFERENCES contacts(id) NULL,
  executed_at TIMESTAMP,
  action_type VARCHAR(50), -- "send_email", "score_lead", etc.
  action_result VARCHAR(50), -- "success", "failed", "partial"
  recipients_affected INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contact_score_snapshots (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  health_score INT,
  momentum_score INT,
  is_hot_lead BOOLEAN,
  closer_signal VARCHAR(100) NULL,
  captured_at TIMESTAMP,
  snapshot_reason VARCHAR(50), -- "before_campaign", "after_workflow", "daily_recalc", etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Why this structure**:
- `campaign_sends` lets you correlate specific recipients to outcomes (was this person in that campaign? Did they open it?)
- `workflow_executions` creates an audit trail showing what each workflow did
- `contact_score_snapshots` captures the state before/after major actions, enabling measurement of impact

### 2. API Endpoints for Event Capture

**New endpoints** (or extend existing):
```
POST /api/campaigns/{id}/log-sends
  - Body: { recipients: [{ email, contact_id }] }
  - Creates campaign_sends records with sent_at timestamp
  - Called by campaign send logic after SMTP send

POST /api/workflows/{id}/log-execution
  - Body: { triggered_by, contact_id, action_type, result, recipients_affected }
  - Creates workflow_executions record
  - Called by workflow trigger logic

POST /api/contacts/{id}/snapshot
  - Captures current health/momentum/hot_lead/closer_signal state
  - Called BEFORE campaigns/workflows and AFTER (delayed 24-72h)
  - Returns snapshot_id for correlation
```

### 3. Contact Score Recalculation Enhancement

**Modify existing score calculation** to accept a reason:
```typescript
async function calculateContactScore(
  contactId: string,
  reason: 'before_campaign' | 'after_workflow' | 'daily_recalc' | 'email_received'
) {
  const scores = await calculateEngagementScores(contactId);
  const snapshot = await db.contactScoreSnapshots.create({
    contact_id: contactId,
    health_score: scores.health,
    momentum_score: scores.momentum,
    is_hot_lead: scores.hot,
    closer_signal: scores.signal,
    snapshot_reason: reason
  });

  // Update current contact record
  await db.contacts.update(contactId, scores);

  return snapshot;
}
```

### 4. Implementation Checklist

- [ ] Create database migrations (3 new tables)
- [ ] Create API endpoints for event logging
- [ ] Modify campaign send flow to call `POST /api/campaigns/{id}/log-sends` after SMTP
- [ ] Modify workflow execution to call `POST /api/workflows/{id}/log-execution` after each trigger
- [ ] Create snapshot capture logic (before/after campaigns, daily batch job)
- [ ] Add index on contact_id + captured_at for fast lookups
- [ ] Test: Send campaign → verify campaign_sends records created → verify snapshots captured

### 5. Success Criteria

- All campaigns sent are logged with recipient details
- All workflow executions are recorded
- Contact score snapshots capture state before/after major actions
- No performance degradation on campaign send (logging is async/queued)

---

## PHASE 1: "WHAT HAPPENED" LAYER
**Duration**: 2-3 weeks | **Complexity**: Medium | **Depends on**: Phase 0

### What This Solves

Currently: "I sent a campaign. Silent. I guess it worked?"
With this: "Your Q1 Outreach campaign reached 150 people. 47 opened (31%), 8 clicked, 3 replied. Recipients' average health improved 18%."

### Detailed Implementation

### 1. Campaign Outcome Correlation Service

**New service: `CampaignOutcomeEngine`**
```typescript
class CampaignOutcomeEngine {

  async calculateCampaignOutcome(campaignId: string) {
    // Get all sends for this campaign
    const sends = await db.campaignSends.findMany({
      campaign_id: campaignId
    });

    // Get score snapshots before/after sends
    const campaign = await db.campaigns.findOne(campaignId);
    const beforeSnapshots = await db.contactScoreSnapshots.findMany({
      contact_id: { in: sends.map(s => s.recipient_id) },
      captured_at: { lte: campaign.sent_at },
      snapshot_reason: 'before_campaign'
    });

    const afterSnapshots = await db.contactScoreSnapshots.findMany({
      contact_id: { in: sends.map(s => s.recipient_id) },
      captured_at: { gte: campaign.sent_at, lte: campaign.sent_at + 72h },
      snapshot_reason: 'after_workflow' // Or daily recalc
    });

    // Calculate aggregate metrics
    const metrics = {
      recipients_count: sends.length,
      open_count: sends.filter(s => s.opened_at).length,
      open_rate: (opens / sends.length) * 100,
      click_count: sends.filter(s => s.clicked_at).length,
      reply_count: sends.filter(s => s.replied_at).length,
      bounce_count: sends.filter(s => s.bounced_at).length,

      // Score impact
      avg_health_before: avg(beforeSnapshots.map(s => s.health_score)),
      avg_health_after: avg(afterSnapshots.map(s => s.health_score)),
      health_delta: avg_after - avg_before,

      // New hot leads created
      hot_leads_created: afterSnapshots.filter(
        s => s.is_hot_lead && !beforeSnapshots.find(b => b.contact_id === s.contact_id)?.is_hot_lead
      ).length,

      // Segment performance
      by_segment: {
        'B2B': { open_rate: 34%, opens: 12 },
        'B2C': { open_rate: 25%, opens: 8 },
        // ... etc
      }
    };

    return metrics;
  }
}
```

### 2. Workflow Outcome Correlation Service

**New service: `WorkflowOutcomeEngine`** (similar pattern)
```typescript
class WorkflowOutcomeEngine {

  async calculateWorkflowOutcome(workflowId: string, timeWindow: '7d' | '30d' | '90d') {
    // Get all executions in time window
    const executions = await db.workflowExecutions.findMany({
      workflow_id: workflowId,
      executed_at: { gte: now - timeWindow }
    });

    // Get contacts affected by this workflow
    const affectedContactIds = executions.flatMap(e => e.triggered_contact_id);

    // Get score snapshots before/after
    const beforeSnapshots = await db.contactScoreSnapshots.findMany({
      contact_id: { in: affectedContactIds },
      snapshot_reason: 'before_campaign',
      captured_at: { lte: executions[0].executed_at }
    });

    const afterSnapshots = await db.contactScoreSnapshots.findMany({
      contact_id: { in: affectedContactIds },
      snapshot_reason: 'after_workflow',
      captured_at: { gte: executions[executions.length - 1].executed_at }
    });

    // Same calculation pattern as campaigns
    const metrics = {
      total_executions: executions.length,
      success_rate: (executions.filter(e => e.action_result === 'success').length / executions.length) * 100,
      recipients_affected: executions.sum(e => e.recipients_affected),
      health_delta: avg(afterSnapshots) - avg(beforeSnapshots),
      hot_leads_created: ...,
      // ... etc
    };

    return metrics;
  }
}
```

### 3. Backend API Endpoints

**New endpoints**:
```
GET /api/campaigns/{id}/outcome
  - Returns: CampaignOutcome object
  - Used by: Campaign detail view
  - Example response:
    {
      recipients_count: 150,
      open_count: 47,
      open_rate: 31,
      click_count: 8,
      reply_count: 3,
      bounce_count: 2,
      health_delta_pct: 18,
      hot_leads_created: 2,
      by_segment: {
        "B2B": { open_rate: 40, opens: 28 },
        "B2C": { open_rate: 22, opens: 19 }
      }
    }

GET /api/workflows/{id}/outcome?timeWindow=30d
  - Returns: WorkflowOutcome object
  - Includes success rate, health impact, leads created

GET /api/campaigns/batch-outcomes?campaign_ids=id1,id2,id3
  - Returns array of outcomes (for dashboard listing)
```

### 4. Frontend Updates

**Campaign Detail Modal enhancement**:
```typescript
// New section: "Performance Summary"
<div className="mt-8 p-6 bg-[var(--forest-green)]/5 border border-[var(--forest-green)]/10 rounded-sm">
  <h4 className="text-sm font-sans font-bold uppercase tracking-widest mb-4">Performance</h4>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatLine label="Recipients" value={outcome.recipients_count} />
    <StatLine label="Open Rate" value={`${outcome.open_rate}%`} />
    <StatLine label="Replies" value={outcome.reply_count} />
    <StatLine label="Health Impact" value={`+${outcome.health_delta_pct}%`} />
  </div>

  {outcome.hot_leads_created > 0 && (
    <p className="text-xs text-green-700 mt-4">
      ✨ Created {outcome.hot_leads_created} hot leads
    </p>
  )}

  {outcome.by_segment && (
    <div className="mt-4 text-xs">
      <p className="font-bold mb-2">Best performing segments:</p>
      {Object.entries(outcome.by_segment)
        .sort((a, b) => b[1].open_rate - a[1].open_rate)
        .slice(0, 3)
        .map(([segment, perf]) => (
          <p key={segment}>{segment}: {perf.open_rate}% opens</p>
        ))
      }
    </div>
  )}
</div>
```

**Campaign List enhancement**:
```typescript
// On campaigns page list, show outcome chip
<div className="text-right">
  <p className="text-xs text-zinc-500 mb-1">Performance</p>
  <p className="text-sm font-serif">
    {outcome.open_rate}% opens
    {outcome.health_delta_pct > 0 && (
      <span className="text-green-600 text-xs"> ↑ {outcome.health_delta_pct}%</span>
    )}
  </p>
</div>
```

**Workflows enhancement**:
```typescript
// On workflow card, show execution history + impact
<div className="text-xs mt-2 pt-2 border-t border-black/5">
  <p>Last 30 days: {outcome.total_executions} executions</p>
  <p className="text-green-600">Health impact: +{outcome.health_delta}%</p>
  {outcome.success_rate < 90 && (
    <p className="text-amber-600">⚠️ Success rate: {outcome.success_rate}%</p>
  )}
</div>
```

### 5. Implementation Checklist

- [ ] Create CampaignOutcomeEngine service + tests
- [ ] Create WorkflowOutcomeEngine service + tests
- [ ] Create `/api/campaigns/{id}/outcome` endpoint
- [ ] Create `/api/workflows/{id}/outcome` endpoint
- [ ] Create `/api/campaigns/batch-outcomes` endpoint
- [ ] Update CampaignDetailModal to display outcome section
- [ ] Update campaigns page list to show performance chip
- [ ] Update workflow cards to show impact summary
- [ ] Cache outcomes (recompute every 6h or on-demand)
- [ ] Test: Send campaign → check snapshots → request outcome endpoint → verify calculations

### 6. Success Criteria

- Campaign detail shows: recipients, open rate, reply count, health impact
- Founders can see which past campaigns performed best
- Workflow impact is visible (how many people improved after this workflow ran?)
- No N+1 queries (batch-outcomes endpoint is efficient)

---

## PHASE 2a: CONTACT TRIAGE & NEXT BEST ACTION
**Duration**: 2-3 weeks | **Complexity**: Medium-High | **Depends on**: Phase 1 (outcome data)

### What This Solves

Currently: CRM shows 47 contacts. Founder stares at list, doesn't know where to start.
With this: Contacts are auto-tiered (Gold, Silver, Nurture, At-Risk). Each tier has a suggested next action.

### Detailed Implementation

### 1. Contact Triage Engine

**New service: `ContactTriageEngine`**
```typescript
interface ContactTier {
  tier: 'gold' | 'silver' | 'nurture' | 'at_risk';
  reasoning: string; // Why this contact is in this tier
  suggested_action: string; // What to do next
  urgency: 'high' | 'medium' | 'low';
  action_config: {
    action_type: 'send_campaign' | 'send_email' | 'run_workflow' | 'personal_message';
    campaign_id?: string;
    workflow_id?: string;
    template?: string;
  };
}

class ContactTriageEngine {

  async categorizeContact(contact: Contact): Promise<ContactTier> {
    const score = contact.health_score;
    const momentum = contact.momentum_score;
    const is_hot = contact.is_hot_lead;
    const signal = contact.closer_signal;
    const days_since_contact = daysSince(contact.last_contact_date);
    const in_conversation = contact.recent_replies > 0;

    // GOLD TIER: Ready to close
    if (is_hot && momentum > 70 && (score > 75 || signal)) {
      return {
        tier: 'gold',
        reasoning: 'High engagement + buying signal detected',
        suggested_action: 'Send closing-focused campaign',
        urgency: 'high',
        action_config: {
          action_type: 'send_campaign',
          template: 'closing_pitch' // Founder can pick or customize
        }
      };
    }

    // SILVER TIER: Engaged but momentum declining
    if (is_hot && momentum < 70 && momentum > 40) {
      return {
        tier: 'silver',
        reasoning: 'Interested but engagement declining',
        suggested_action: `Personal check-in: "How's progress on ${signal}?"`,
        urgency: 'high',
        action_config: {
          action_type: 'send_email',
          template: 'personal_checkin'
        }
      };
    }

    // NURTURE TIER: Early-stage, engaged
    if (score > 50 && !is_hot && momentum > 30) {
      return {
        tier: 'nurture',
        reasoning: 'Engaged but early-stage. Suitable for nurture workflow',
        suggested_action: 'Run nurture workflow',
        urgency: 'medium',
        action_config: {
          action_type: 'run_workflow',
          template: 'lead_nurture_sequence' // 3-5 email sequence
        }
      };
    }

    // AT-RISK TIER: Was engaged, now quiet
    if (score > 40 && momentum < 30 && days_since_contact > 14) {
      return {
        tier: 'at_risk',
        reasoning: 'Previously engaged but no recent contact',
        suggested_action: 'Re-engagement email with value prop',
        urgency: 'medium',
        action_config: {
          action_type: 'send_email',
          template: 're_engagement'
        }
      };
    }

    // DEFAULT: Cold/unresponsive
    return {
      tier: 'nurture', // Default to nurture for anyone with 0 engagement
      reasoning: 'New or unresponsive. Needs initial nurture',
      suggested_action: 'Start with intro campaign segment',
      urgency: 'low',
      action_config: {
        action_type: 'send_campaign',
        template: 'intro_campaign'
      }
    };
  }

  async triageAllContacts(founderId: string): Promise<Map<ContactTier, Contact[]>> {
    const contacts = await db.contacts.findMany({ founder_id: founderId });
    const tiers = new Map();

    for (const contact of contacts) {
      const tier = await this.categorizeContact(contact);
      if (!tiers.has(tier.tier)) {
        tiers.set(tier.tier, []);
      }
      tiers.get(tier.tier).push({ ...contact, triage: tier });
    }

    return tiers;
  }
}
```

### 2. Triage Rules Configuration

**Allow founders to customize rules**:
```typescript
interface TriageRule {
  id: string;
  founder_id: string;
  tier: string;
  condition: {
    field: 'health_score' | 'momentum_score' | 'is_hot_lead' | 'days_since_contact';
    operator: '>' | '<' | '==' | '!=';
    value: number | boolean;
    logic: 'AND' | 'OR'; // How to combine with other conditions
  }[];
  suggested_action: string;
  priority: number; // Evaluate rules in priority order
}

// Default rules provided, but founders can:
// - Adjust thresholds (e.g., "hot lead = momentum > 60 instead of 70")
// - Add custom rules (e.g., "if company = 'TechCorp' AND score > 40 → close")
// - Disable rules they don't like
```

### 3. Backend API Endpoints

**New endpoints**:
```
GET /api/contacts/triage
  - Returns: {
      gold: [{ ...contact, triage: {...} }],
      silver: [...],
      nurture: [...],
      at_risk: [...]
    }
  - Used by: CRM page to show tiered list

GET /api/contacts/{id}/triage
  - Returns: Full triage info for single contact

POST /api/triage-rules
  - Create custom triage rule

GET /api/triage-rules
  - List all custom rules for founder

PUT /api/triage-rules/{id}
  - Update rule

DELETE /api/triage-rules/{id}
  - Remove rule
```

### 4. Frontend: CRM Triage View

**Add new view mode to CRM page**:
```typescript
// Option 1: Replace list view with triage view (default)
// Option 2: Add toggle "Triage Mode" / "List Mode"

<section className="space-y-8">

  {/* GOLD TIER */}
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-sans font-bold uppercase tracking-widest">
        🏆 Gold Tier — Ready to Close ({goldCount})
      </h3>
      <span className="text-xs text-green-600 font-bold">HIGH PRIORITY</span>
    </div>

    {goldContacts.length > 0 ? (
      <div className="space-y-2">
        {goldContacts.map(contact => (
          <div key={contact.id} className="p-4 bg-green-50 border border-green-200 rounded-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-serif text-lg">{contact.first_name} {contact.last_name}</p>
                <p className="text-xs text-zinc-600">{contact.company_name}</p>
              </div>
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                {contact.triage.reasoning}
              </span>
            </div>

            <p className="text-sm mb-3">
              <strong>Suggested:</strong> {contact.triage.suggested_action}
            </p>

            <button
              onClick={() => executeTriageAction(contact, contact.triage.action_config)}
              className="ink-button text-xs px-4 py-2"
            >
              {contact.triage.action_config.action_type === 'send_campaign'
                ? 'Send Closing Campaign'
                : 'Draft Email'}
            </button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-zinc-400 italic">No gold tier contacts. Keep nurturing!</p>
    )}
  </div>

  {/* SILVER TIER */}
  {/* Similar layout */}

  {/* NURTURE TIER */}
  {/* Similar layout */}

  {/* AT-RISK TIER */}
  {/* Similar layout */}

</section>

// Quick action handler
function executeTriageAction(contact: Contact, config: ActionConfig) {
  if (config.action_type === 'send_campaign') {
    // Open campaign creator with template pre-filled
    openModal('Create Campaign', <CreateCampaignForm
      template={config.template}
      recipients={[contact.id]}
      onSuccess={refreshTriage}
    />);
  } else if (config.action_type === 'send_email') {
    // Open AI draft with template
    openModal('Draft Email', <AIDraftModal
      contact={contact}
      template={config.template}
      onSuccess={refreshTriage}
    />);
  } else if (config.action_type === 'run_workflow') {
    // Quick-run workflow on this contact
    executeWorkflow(config.workflow_id, contact.id);
  }
}
```

### 5. Smart Sort & Filter

**On CRM page, add sorting**:
```typescript
// Sort options:
// - "Urgency" (default) - gold first, then silver, etc.
// - "Engagement" - highest health score first
// - "Momentum" - trending up first (promising contacts)
// - "Days since contact" - oldest first (at-risk)

// Quick filters:
// - Show only: Gold | Silver | Nurture | At-Risk
// - Show only: No contact in 14+ days
// - Show only: Recently hot_lead (in last 7 days)
```

### 6. Implementation Checklist

- [ ] Create ContactTriageEngine service + tests
- [ ] Create `/api/contacts/triage` endpoint
- [ ] Create `/api/contacts/{id}/triage` endpoint
- [ ] Create triage rules CRUD endpoints
- [ ] Build triage view in CRM page (tier sections + cards)
- [ ] Add "Quick Action" button logic (opens campaign/email/workflow modals)
- [ ] Add sort/filter dropdowns to CRM page
- [ ] Cache triage results (recompute every 4h or on-demand)
- [ ] Test: Create contacts with different scores → request triage → verify grouping

### 7. Success Criteria

- CRM page can toggle between "List" and "Triage" view
- Contacts are correctly grouped into tiers
- Each tier shows suggested action
- One-click action execution (send campaign, draft email, etc.)
- Founders can customize triage rules

---

## PHASE 2b: CAMPAIGN ANALYTICS DASHBOARD
**Duration**: 2 weeks | **Complexity**: Low-Medium | **Depends on**: Phase 1 (outcome data)

### What This Solves

Currently: Campaign performance is implicit. Founders have to manually review contact scores.
With this: "Here's your campaign performance summary. Best segments. Comparison to your average."

### Detailed Implementation

### 1. Campaign Analytics Service

**New service: `CampaignAnalyticsEngine`**
```typescript
interface CampaignAnalytics {
  campaign_id: string;

  // Basic metrics
  recipients_count: number;
  open_count: number;
  open_rate_pct: number;
  click_count: number;
  click_rate_pct: number;
  reply_count: number;
  reply_rate_pct: number;
  bounce_count: number;
  bounce_rate_pct: number;

  // Comparison
  open_rate_vs_avg: number; // e.g., "+3% above your average"

  // Segment breakdown
  by_segment: {
    [segmentName: string]: {
      recipients: number;
      open_rate: number;
      best_performing: boolean;
    };
  };

  // Timeline
  time_to_first_open: string; // "2 hours"
  open_timeline: Array<{ time: Date; cumulative_opens: number }>;

  // Quality
  bounce_rate_alert?: string; // "⚠️ Bounce rate 8% (high)"

  // Recommendations
  recommendations: Array<{
    type: 'resend' | 'segment' | 'followup' | 'subject_line';
    text: string;
    action?: 'send_followup' | 'analyze_subject';
  }>;
}

class CampaignAnalyticsEngine {

  async generateAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const campaign = await db.campaigns.findOne(campaignId);
    const sends = await db.campaignSends.findMany({ campaign_id: campaignId });
    const founder = await db.founders.findOne(campaign.founder_id);

    // Get founder's historical open rates for comparison
    const historicalCampaigns = await db.campaigns.findMany({
      founder_id: campaign.founder_id,
      sent_at: { lte: campaign.sent_at } // Only past campaigns
    });
    const avgOpenRate = mean(
      await Promise.all(historicalCampaigns.map(c => this.getOpenRate(c.id)))
    );

    // Get segment breakdown
    const contactsBySegment = await db.contacts.findMany({
      id: { in: sends.map(s => s.recipient_id) }
    });
    const bySegment = groupBy(contactsBySegment, 'industry');

    // Calculate metrics
    const opens = sends.filter(s => s.opened_at).length;
    const clicks = sends.filter(s => s.clicked_at).length;
    const replies = sends.filter(s => s.replied_at).length;
    const bounces = sends.filter(s => s.bounced_at).length;

    // Generate recommendations
    const recommendations = [];

    if (opens === 0) {
      recommendations.push({
        type: 'subject_line',
        text: '0% opens. Subject line may not be resonating. Try re-send with different angle.',
        action: 'send_followup'
      });
    } else if (opens > 0 && clicks === 0) {
      recommendations.push({
        type: 'followup',
        text: 'Good opens but no clicks. Consider send follow-up to warm engaged readers.',
        action: 'send_followup'
      });
    }

    if (bySegment['B2B']?.open_rate > 40 && bySegment['B2C']?.open_rate < 20) {
      recommendations.push({
        type: 'segment',
        text: 'B2B segment responds 2x better. Consider targeting more B2B contacts.',
        action: null
      });
    }

    const openTimeline = this.generateOpenTimeline(sends, campaign.sent_at);

    return {
      campaign_id: campaignId,
      recipients_count: sends.length,
      open_count: opens,
      open_rate_pct: (opens / sends.length) * 100,
      click_count: clicks,
      click_rate_pct: (clicks / sends.length) * 100,
      reply_count: replies,
      reply_rate_pct: (replies / sends.length) * 100,
      bounce_count: bounces,
      bounce_rate_pct: (bounces / sends.length) * 100,
      open_rate_vs_avg: ((opens / sends.length) * 100) - avgOpenRate,
      by_segment: bySegment,
      time_to_first_open: this.getTimeToFirstOpen(sends),
      open_timeline: openTimeline,
      bounce_rate_alert: bounces / sends.length > 0.05 ? '⚠️ High bounce rate' : null,
      recommendations
    };
  }

  // Helper methods...
}
```

### 2. Backend Endpoint

**New endpoint**:
```
GET /api/campaigns/{id}/analytics
  - Returns: CampaignAnalytics object

GET /api/campaigns/analytics/dashboard?timeWindow=30d
  - Returns: {
      total_sent: 1200,
      avg_open_rate: 28,
      best_campaign: {...},
      worst_campaign: {...},
      trend: [{ date, open_rate }, ...],
      segment_performance: {...}
    }
```

### 3. Frontend: Analytics View

**New tab in Campaign Detail Modal**:
```typescript
<div className="space-y-6">
  {/* Summary Cards */}
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
    <Card label="Recipients" value={analytics.recipients_count} />
    <Card label="Open Rate" value={`${analytics.open_rate_pct}%`}
          comparison={analytics.open_rate_vs_avg} />
    <Card label="Click Rate" value={`${analytics.click_rate_pct}%`} />
    <Card label="Reply Rate" value={`${analytics.reply_rate_pct}%`} />
    <Card label="Bounce Rate" value={`${analytics.bounce_rate_pct}%`}
          warning={analytics.bounce_rate_alert} />
  </div>

  {/* Performance vs Average */}
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
    <p className="text-sm font-sans">
      This campaign's open rate is
      <strong className={analytics.open_rate_vs_avg > 0 ? 'text-green-600' : 'text-red-600'}>
        {' '}{Math.abs(analytics.open_rate_vs_avg)}%{' '}
        {analytics.open_rate_vs_avg > 0 ? 'above' : 'below'}
      </strong>
      {' '}your average.
    </p>
  </div>

  {/* Segment Breakdown */}
  <div>
    <h4 className="text-sm font-sans font-bold uppercase tracking-widest mb-3">
      Performance by Segment
    </h4>
    <div className="space-y-2">
      {Object.entries(analytics.by_segment)
        .sort((a, b) => b[1].open_rate - a[1].open_rate)
        .map(([segment, perf]) => (
          <div key={segment} className="flex justify-between items-center p-3 bg-white border border-black/5">
            <p className="text-sm font-sans">{segment}</p>
            <div className="text-right">
              <p className="font-serif text-lg">{perf.open_rate}%</p>
              <p className="text-xs text-zinc-500">{perf.recipients} recipients</p>
            </div>
          </div>
        ))}
    </div>
  </div>

  {/* Timeline */}
  <div>
    <h4 className="text-sm font-sans font-bold uppercase tracking-widest mb-3">
      Opens Over Time
    </h4>
    {/* Simple line chart: time vs cumulative opens */}
    <Chart data={analytics.open_timeline} />
  </div>

  {/* Recommendations */}
  {analytics.recommendations.length > 0 && (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm space-y-2">
      <h4 className="text-sm font-sans font-bold">Recommendations</h4>
      {analytics.recommendations.map((rec, i) => (
        <div key={i}>
          <p className="text-sm">{rec.text}</p>
          {rec.action && (
            <button className="text-xs text-blue-600 mt-1">
              {rec.action === 'send_followup' ? '→ Send Follow-up' : '→ View Contacts'}
            </button>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

**Dashboard Campaign Listing**:
```typescript
// On campaigns page, show performance summary
<div className="text-right text-xs">
  <p className="text-zinc-500 mb-1">Performance</p>
  <p className="font-serif">
    {analytics.open_rate_pct}% opens
    {analytics.open_rate_vs_avg > 0 && (
      <span className="text-green-600 block text-[10px]">
        +{analytics.open_rate_vs_avg}% vs avg
      </span>
    )}
  </p>
</div>
```

### 4. Implementation Checklist

- [ ] Create CampaignAnalyticsEngine service
- [ ] Create `/api/campaigns/{id}/analytics` endpoint
- [ ] Create `/api/campaigns/analytics/dashboard` endpoint
- [ ] Build analytics tab in CampaignDetailModal
- [ ] Add segment breakdown table
- [ ] Add open timeline chart
- [ ] Add recommendations section
- [ ] Cache analytics (recompute every 12h or on-demand)
- [ ] Test: Send campaign to mixed segment → request analytics → verify segment split

### 5. Success Criteria

- Campaign detail shows comprehensive analytics
- Segments are broken down with performance comparison
- Recommendations are actionable ("Send follow-up to non-clickers")
- Dashboard shows comparison to founder's average

---

## PHASE 3a: INBOX INTELLIGENCE
**Duration**: 2-3 weeks | **Complexity**: Medium-High | **Depends on**: Existing email sync

### What This Solves

Currently: Email arrives → Founder reads it → Manually goes to CRM/campaigns → Updates manually
With this: Email arrives → AI extracts intent → Updates CRM → Suggests action → All in 1 place

### Detailed Implementation

### 1. Email Intelligence Service

**New service: `EmailIntelligenceEngine`**
```typescript
interface EmailSignal {
  email_id: string;
  from: string;
  subject: string;
  body: string;

  // Extracted intelligence
  intent: 'interested' | 'objection' | 'question' | 'update' | 'decision' | 'neutral';
  confidence: number; // 0-100
  sentiment: 'positive' | 'neutral' | 'negative';

  // Needs & interests
  needs: Array<{
    category: string; // 'pricing' | 'demo' | 'timeline' | 'capabilities' | etc.
    keyword: string; // What triggered this
    confidence: number;
  }>;

  // Potential responses
  suggested_actions: Array<{
    type: 'send_docs' | 'schedule_call' | 'answer_question' | 'send_pricing';
    description: string;
    urgency: 'high' | 'medium' | 'low';
    template?: string;
  }>;

  // CRM impact
  crmUpdates: {
    update_status_to?: string; // e.g., "in_conversation"
    set_hot_lead?: boolean;
    add_closer_signal?: string;
    log_reply?: boolean;
  };

  // Linked to campaign
  linked_campaign?: {
    campaign_id: string;
    campaign_name: string;
    was_reply: boolean; // Did they open/click the campaign?
  };
}

class EmailIntelligenceEngine {

  async analyzeEmail(email: Email): Promise<EmailSignal> {
    const contact = await this.findOrCreateContact(email.from);

    // AI analysis
    const aiAnalysis = await this.callAI({
      task: 'email_analysis',
      subject: email.subject,
      body: email.body,
      context: {
        company: contact.company_name,
        previous_emails: await this.getEmailHistory(contact.id)
      }
    });

    // Check if this is reply to campaign
    const linkedCampaign = await this.findCampaignThisWasReplyTo(email.from, email.created_at);

    // Determine CRM updates needed
    const crmUpdates: any = {};
    if (aiAnalysis.intent === 'interested') {
      crmUpdates.update_status_to = 'in_conversation';
      crmUpdates.set_hot_lead = true;
    } else if (aiAnalysis.intent === 'objection') {
      crmUpdates.update_status_to = 'objection_raised';
    }

    if (aiAnalysis.detected_signals?.buying_signal) {
      crmUpdates.add_closer_signal = aiAnalysis.detected_signals.buying_signal;
    }

    return {
      email_id: email.id,
      from: email.from,
      subject: email.subject,
      body: email.body,
      intent: aiAnalysis.intent,
      confidence: aiAnalysis.confidence,
      sentiment: aiAnalysis.sentiment,
      needs: aiAnalysis.needs || [],
      suggested_actions: this.generateSuggestedActions(aiAnalysis, contact),
      crmUpdates,
      linked_campaign: linkedCampaign
    };
  }

  private generateSuggestedActions(analysis: any, contact: Contact): EmailSignal['suggested_actions'] {
    const actions = [];

    if (analysis.needs?.includes('pricing')) {
      actions.push({
        type: 'send_docs',
        description: 'Send pricing document',
        urgency: 'high',
        template: 'pricing_deck'
      });
    }

    if (analysis.needs?.includes('demo')) {
      actions.push({
        type: 'schedule_call',
        description: 'Offer product demo',
        urgency: 'high'
      });
    }

    if (analysis.intent === 'question') {
      actions.push({
        type: 'answer_question',
        description: `Answer: "${analysis.detected_question}"`,
        urgency: 'high',
        template: 'answer_template'
      });
    }

    if (analysis.sentiment === 'positive' && contact.stage === 'prospect') {
      actions.push({
        type: 'send_docs',
        description: 'Nurture with educational content',
        urgency: 'medium'
      });
    }

    return actions;
  }

  private async findCampaignThisWasReplyTo(fromEmail: string, arrivedAt: Date): Promise<any> {
    // Look for campaigns sent to this email in the last 30 days
    const campaigns = await db.campaignSends.findMany({
      recipient_email: fromEmail,
      sent_at: { gte: arrivedAt.setDate(arrivedAt.getDate() - 30) }
    });

    if (campaigns.length > 0) {
      // Get the most recent campaign
      const campaign = await db.campaigns.findOne(campaigns[0].campaign_id);
      return {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        was_reply: true
      };
    }

    return null;
  }
}
```

### 2. Inbox Intelligence Display

**New "Intelligence" sidebar on Inbox**:
```typescript
// When email is selected
{selectedEmail && (
  <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-b from-[var(--forest-green)]/5 to-white p-6 border-l border-black/5 space-y-6 overflow-y-auto">

    <h3 className="text-sm font-sans font-bold uppercase tracking-widest">Email Intelligence</h3>

    {/* Intent Badge */}
    <div className="p-3 bg-white border border-black/5 rounded-sm">
      <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-1">
        Intent
      </p>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 text-xs font-bold rounded text-white ${
          intelligence.intent === 'interested' ? 'bg-green-600' :
          intelligence.intent === 'objection' ? 'bg-amber-600' :
          'bg-zinc-400'
        }`}>
          {intelligence.intent.toUpperCase()}
        </span>
        <span className="text-xs text-zinc-500">
          {intelligence.confidence}% confident
        </span>
      </div>
    </div>

    {/* Detected Needs */}
    {intelligence.needs.length > 0 && (
      <div>
        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
          Detected Needs
        </p>
        <div className="space-y-1">
          {intelligence.needs.map((need, i) => (
            <p key={i} className="text-xs bg-blue-50 border border-blue-200 px-2 py-1 rounded">
              {need.category}: "{need.keyword}"
            </p>
          ))}
        </div>
      </div>
    )}

    {/* Linked Campaign */}
    {intelligence.linked_campaign && (
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-sm">
        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-purple-700 mb-1">
          Related Campaign
        </p>
        <p className="text-sm font-serif">{intelligence.linked_campaign.campaign_name}</p>
        <p className="text-xs text-zinc-600 mt-1">This is a reply to that campaign</p>
      </div>
    )}

    {/* Suggested Actions */}
    <div>
      <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-zinc-400 mb-2">
        Suggested Actions
      </p>
      <div className="space-y-2">
        {intelligence.suggested_actions.map((action, i) => (
          <button
            key={i}
            onClick={() => executeInboxAction(selectedEmail, action)}
            className="w-full text-left p-3 bg-white border border-black/5 hover:bg-black/[0.01] rounded-sm text-xs"
          >
            <p className="font-bold">{action.description}</p>
            <p className="text-zinc-500 mt-1">
              {action.urgency === 'high' ? '🔴 High priority' : ''}
            </p>
          </button>
        ))}
      </div>
    </div>

    {/* CRM Update Preview */}
    {Object.keys(intelligence.crmUpdates).length > 0 && (
      <div className="p-3 bg-green-50 border border-green-200 rounded-sm">
        <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-green-700 mb-2">
          Auto-Update CRM?
        </p>
        <ul className="text-xs space-y-1 text-green-800">
          {intelligence.crmUpdates.update_status_to && (
            <li>✓ Set status to "{intelligence.crmUpdates.update_status_to}"</li>
          )}
          {intelligence.crmUpdates.set_hot_lead && (
            <li>✓ Mark as hot lead</li>
          )}
          {intelligence.crmUpdates.add_closer_signal && (
            <li>✓ Add closer signal: "{intelligence.crmUpdates.add_closer_signal}"</li>
          )}
        </ul>
        <button className="w-full mt-3 ink-button text-xs py-1">
          Apply Updates
        </button>
      </div>
    )}
  </div>
)}
```

### 3. Implementation Checklist

- [ ] Create EmailIntelligenceEngine service
- [ ] Create AI prompts for email analysis
- [ ] Implement email → contact linking/creation
- [ ] Implement campaign reply detection
- [ ] Build email intelligence sidebar in Inbox
- [ ] Add "Execute Action" buttons (send docs, schedule call, etc.)
- [ ] Add "Apply CRM Updates" button
- [ ] Create workflows that trigger on email analysis (optional: automate some responses)
- [ ] Test: Receive email → analyze → show intelligence → apply updates

### 4. Success Criteria

- Email intelligence is extracted and displayed
- Suggested actions are correct for the intent
- CRM updates are accurate
- Founders can apply updates or execute actions in 1 click

---

## PHASE 3b: DOMAIN ALERTS & PROACTIVE HEALTH MONITORING
**Duration**: 1-2 weeks | **Complexity**: Low | **Depends on**: Existing domain tracking

### What This Solves

Currently: Domain bounce rate spikes but founder doesn't notice until damage is done.
With this: "⚠️ Your bounce rate just increased 40%. List quality issue? Check recent adds."

### Detailed Implementation

### 1. Domain Health Change Detection

**New service: `DomainHealthMonitor`**
```typescript
interface DomainHealthAlert {
  domain_id: string;
  domain_name: string;
  alert_type: 'bounce_spike' | 'deliverability_drop' | 'reputation_warning' | 'risk_increase';
  severity: 'critical' | 'warning' | 'info';
  metric_name: string; // 'bounce_rate', 'inbox_placement', 'risk_level'
  previous_value: number | string;
  current_value: number | string;
  change_pct?: number; // % change
  suggested_action: string;
  created_at: Date;
}

class DomainHealthMonitor {

  async checkAllDomains(founderId: string) {
    const domains = await db.domains.findMany({ founder_id: founderId });

    for (const domain of domains) {
      // Get current health metrics
      const current = await this.fetchDomainHealth(domain.domain_name);

      // Get previous metrics (24h ago)
      const previous = await db.domainHealthHistory.findOne({
        domain_id: domain.id,
        captured_at: { lte: now - 24h },
        order: 'DESC'
      });

      if (!previous) continue; // No baseline yet

      // Detect changes
      const alerts = [];

      // Bounce rate spike
      if (current.bounce_rate - previous.bounce_rate > 0.03) { // 3% increase
        alerts.push({
          domain_id: domain.id,
          domain_name: domain.domain_name,
          alert_type: 'bounce_spike',
          severity: current.bounce_rate > 0.08 ? 'critical' : 'warning',
          metric_name: 'bounce_rate',
          previous_value: (previous.bounce_rate * 100).toFixed(1),
          current_value: (current.bounce_rate * 100).toFixed(1),
          change_pct: ((current.bounce_rate - previous.bounce_rate) / previous.bounce_rate) * 100,
          suggested_action: `Your bounce rate increased to ${(current.bounce_rate * 100).toFixed(1)}%. Check for invalid emails in recent contact adds. Consider pausing sends until list is cleaned.`
        });
      }

      // Inbox placement drop
      if (current.inbox_placement - previous.inbox_placement < -10) { // 10% drop
        alerts.push({
          domain_id: domain.id,
          domain_name: domain.domain_name,
          alert_type: 'deliverability_drop',
          severity: 'warning',
          metric_name: 'inbox_placement',
          previous_value: previous.inbox_placement,
          current_value: current.inbox_placement,
          suggested_action: `Inbox placement dropped to ${current.inbox_placement}%. Check SPF/DKIM/DMARC config and email authentication status.`
        });
      }

      // Risk level increase
      if (this.riskLevelToNumber(current.risk_level) > this.riskLevelToNumber(previous.risk_level)) {
        alerts.push({
          domain_id: domain.id,
          domain_name: domain.domain_name,
          alert_type: 'risk_increase',
          severity: current.risk_level === 'high' ? 'critical' : 'warning',
          metric_name: 'risk_level',
          previous_value: previous.risk_level,
          current_value: current.risk_level,
          suggested_action: `Domain risk increased to ${current.risk_level}. Review your sending practices and contact list quality.`
        });
      }

      // Store alerts
      for (const alert of alerts) {
        await db.domainHealthAlerts.create(alert);
      }
    }
  }

  private riskLevelToNumber(level: string): number {
    return { 'low': 1, 'medium': 2, 'high': 3 }[level] || 0;
  }
}
```

### 2. Alert Display

**Brief Panel integration**:
```typescript
// Add to Brief Panel
{domainAlerts.length > 0 && (
  <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded-sm">
    <h4 className="text-sm font-sans font-bold mb-3 text-amber-900">
      ⚠️ Domain Health Alert{domainAlerts.length > 1 ? 's' : ''}
    </h4>
    <div className="space-y-3">
      {domainAlerts.map(alert => (
        <div key={alert.id} className="text-sm">
          <p className="font-bold text-amber-900">{alert.domain_name}</p>
          <p className="text-xs text-amber-800 mt-1">
            {alert.metric_name}: {alert.previous_value} → {alert.current_value}
            {alert.change_pct && ` (+${alert.change_pct}%)`}
          </p>
          <p className="text-xs text-amber-700 mt-2 italic">{alert.suggested_action}</p>
          <button className="text-xs text-blue-600 mt-2">
            → Review Domain Settings
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

**Campaign send pre-flight check**:
```typescript
// Before campaign send, check domain health
const domainAlerts = await checkDomainHealthWarnings(domain);

if (domainAlerts.severity === 'critical') {
  showModal('Domain Risk Warning', (
    <div className="space-y-4">
      <p className="text-sm font-bold text-red-600">{domainAlerts.suggested_action}</p>
      <div className="space-y-2">
        <button className="w-full ink-button" onClick={sendSmallTestBatch}>
          Send Small Test Batch (50 contacts)
        </button>
        <button className="w-full border border-red-200" onClick={pauseSend}>
          Pause & Fix List
        </button>
      </div>
    </div>
  ));
}
```

### 3. Implementation Checklist

- [ ] Create DomainHealthMonitor service
- [ ] Create daily/hourly scheduled job to check domain health
- [ ] Store domain health snapshots in history table
- [ ] Implement alert detection logic
- [ ] Add domain alerts to Brief Panel
- [ ] Add pre-flight check before campaign send
- [ ] Create `/api/domain/{id}/health-history` endpoint (for trend view)
- [ ] Test: Simulate bounce rate spike → verify alert → check Brief Panel

### 4. Success Criteria

- Domain health changes are detected within 1h
- Alerts appear on Brief Panel
- Campaign send shows warning if domain health is degraded
- Founders have clear action to take

---

## IMPLEMENTATION SEQUENCING & DEPENDENCIES

### Critical Path

```
Start
 ├─ Phase 0: Foundation (BLOCKER FOR ALL)
 │  └─ Complete by: Week 1-2
 │
 └─→ After Phase 0, split into parallel tracks:
    ├─ Track A: Intelligence Features
    │  ├─ Phase 1: What Happened (Week 2-4)
    │  └─ Phase 2a: Contact Triage (Week 3-5) [Starts after Phase 1 endpoints]
    │  └─ Phase 2b: Campaign Analytics (Week 3-4) [Parallel with 2a]
    │
    └─ Track B: Observability
       ├─ Phase 3a: Inbox Intelligence (Week 3-5)
       └─ Phase 3b: Domain Alerts (Week 2-3) [Can start right after Phase 0]
```

**Real timeline with parallelization**:
- **Week 1-2**: Phase 0 (foundation)
- **Week 2-4**: Phase 1 (what happened) + Phase 3b (domain alerts)
- **Week 3-5**: Phase 2a (triage) + Phase 2b (analytics) + Phase 3a (inbox)
- **Week 5+**: Polish, testing, iteration

### Why This Order

1. **Phase 0 first** — Everything depends on event logging and snapshots
2. **Phase 1 immediately after** — Provides data for triage and analytics
3. **Phase 2a and 2b in parallel** — Both consume Phase 1 data
4. **Phase 3a and 3b can start early** — Don't depend on Phase 1 (separate systems)

---

## DATA MODEL CHANGES SUMMARY

### New Tables

1. `campaign_sends` — Log every send to every recipient
2. `workflow_executions` — Log every workflow trigger + action
3. `contact_score_snapshots` — Capture contact state before/after actions
4. `domain_health_alerts` — Store domain health alerts
5. `triage_rules` — Store custom triage rules (optional, founders can customize)

### Modified Tables

- `campaigns` — Add `outcome_cache` (JSON) for quick lookups
- `workflows` — Add `outcome_cache` (JSON) for quick lookups
- `contacts` — Add `triage_tier` field (Gold/Silver/Nurture/At-Risk) — optional but useful for sorting
- `domains` — Add `last_alert_at` timestamp to avoid duplicate alerts

### New Indexes

- `campaign_sends(campaign_id, recipient_id, opened_at)`
- `workflow_executions(workflow_id, executed_at)`
- `contact_score_snapshots(contact_id, captured_at DESC)`
- `domain_health_alerts(domain_id, created_at DESC)`

---

## TESTING STRATEGY

### Phase 0: Foundation

- [ ] Insert campaign_sends records → verify structure
- [ ] Trigger workflow → verify workflow_executions logged
- [ ] Capture snapshots before/after campaign send → verify state captured
- [ ] Load test: 10k campaign_sends → verify query performance

### Phase 1: What Happened

- [ ] Send campaign → snapshot before → wait 24h → snapshot after → request outcome
- [ ] Verify metrics: open rate, reply count, health delta
- [ ] Verify segment breakdown
- [ ] Verify recommendations generated

### Phase 2a: Triage

- [ ] Create 20 mock contacts with varied scores/momentum
- [ ] Request `/api/contacts/triage` → verify grouping correct
- [ ] Test tier logic: gold requires hot_lead + momentum > 70
- [ ] Test suggested actions: gold = send_campaign, at_risk = re_engagement

### Phase 2b: Analytics

- [ ] Send campaign to 100 contacts → request analytics
- [ ] Verify timeline chart data
- [ ] Verify segment breakdown
- [ ] Verify recommendations (0 opens → subject line alert)

### Phase 3a: Inbox

- [ ] Mock incoming email → analyze → verify intent/sentiment extracted
- [ ] Verify CRM updates suggested (status, hot_lead, closer_signal)
- [ ] Verify campaign linking (was this a reply to a campaign?)
- [ ] Verify suggested actions appropriate for intent

### Phase 3b: Domain Alerts

- [ ] Set up domain metrics → simulate bounce rate spike
- [ ] Verify alert created
- [ ] Verify alert appears in Brief Panel
- [ ] Verify pre-flight check before campaign send

---

## SUCCESS METRICS

### User Engagement

- **Campaign revisits**: % of campaigns opened again in 48h (to view outcome)
- **Triage view adoption**: % of CRM visits using triage mode vs. list mode
- **Action execution rate**: % of suggested actions executed by founders
- **Inbox intelligence clicks**: % of emails with suggested actions that are executed

### Product Impact

- **Campaign frequency**: % increase in campaigns sent (lower friction → more action)
- **Workflow usage**: % increase in workflow creation/execution (better guidance)
- **Contact engagement**: % improvement in response rates (better targeting via triage)
- **Retention**: % improvement in 30-day retention (app feels smarter)

### Business Impact

- **NPS improvement**: Score increase from better guidance + fewer user errors
- **Support ticket reduction**: Fewer "how do I know if campaigns work?" questions
- **Founder confidence**: Qualitative feedback on feeling "guided" vs. "lost"

---

## RISK MITIGATION

### Data Quality Risk
- **Risk**: Snapshots not captured due to async failures
- **Mitigation**: Add retry logic + alerting if snapshots missing for > 1h

### Performance Risk
- **Risk**: Large campaigns (10k+ recipients) slow down snapshot capture
- **Mitigation**: Use async job queue (Bull, etc.) for snapshot capture

### AI Accuracy Risk (Inbox Intelligence)
- **Risk**: Email analysis misclassifies intent → wrong suggested actions
- **Mitigation**: Start with high-confidence filtering (only show suggestions if confidence > 80%), let founders correct

### Founder Overwhelm Risk
- **Risk**: Too many alerts/suggestions → ignored
- **Mitigation**: Prioritize by urgency (HIGH only to Brief Panel), gating lower severity to CRM view

---

## Summary Table

| Phase | Feature | Duration | Dependencies | Est. Lines of Code |
|-------|---------|----------|--------------|-------------------|
| 0 | Foundation (tables, APIs) | 1-2 wk | None | 500 |
| 1 | What Happened (outcome engine) | 2-3 wk | Phase 0 | 1200 |
| 2a | Contact Triage | 2-3 wk | Phase 0, 1 | 1000 |
| 2b | Campaign Analytics | 2 wk | Phase 0, 1 | 800 |
| 3a | Inbox Intelligence | 2-3 wk | Phase 0 | 1500 |
| 3b | Domain Alerts | 1-2 wk | Phase 0 | 600 |
| **TOTAL** | **All Features** | **8-11 weeks** | - | **~6600** |

---

## Next Steps

1. **Review this plan** — Does it align with your vision and constraints?
2. **Prioritize phases** — Start with Phase 0 + Phase 1, then 2a/2b in parallel
3. **Break down Phase 0** — Create specific database migration tasks
4. **Assign ownership** — Which phases will you build? Which need external help?
5. **Set checkpoint reviews** — After Phase 1, measure impact before moving to Phase 2

---

**This plan transforms FounderOS from a task processor into a decision multiplier.**

Each phase compounds on the previous one. By Phase 3, founders will feel like they have a co-founder managing their email, scoring their contacts, and guiding them to the highest-impact moves.

That's a 95+/100 product.