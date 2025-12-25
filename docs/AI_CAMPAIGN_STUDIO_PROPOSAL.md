# AI Campaign Studio: Proposal

## The Opportunity

Current email marketing tools treat AI as a feature bolt-on: "Generate subject line." FounderOS can treat AI as the **primary interface** — campaigns emerge from conversation with an intelligent system that knows your contacts, your brand, and what's worked before.

**Vision:** A solo founder describes what they want to achieve. The system creates the campaign — copy, visuals, segmentation, timing — and explains why.

---

## Core Concept: The Campaign Agent

Instead of a form-based campaign builder, introduce a **conversational campaign agent**:

```
Founder: "I want to re-engage customers who bought in Q1 but haven't
         returned. Offer them early access to the new feature."

Agent:   Based on your CRM, I found 127 contacts matching this criteria.

         Looking at your past campaigns, "early access" messaging had
         34% higher open rates than discount offers.

         I've drafted a 2-email sequence:

         Email 1: "You're in" (curiosity-driven, no hard sell)
         Email 2: "Here's your access" (3 days later, to openers only)

         [Preview] [Edit] [Adjust Targeting] [Send Test]
```

The agent has **context** that no generic AI has:
- Your contact database and engagement history
- Your past campaign performance
- Your domain's deliverability health
- Your brand voice (learned from sent emails)

---

## Feature Modules

### 1. Campaign Copywriter Agent

**What it does:**
- Generates full email copy (subject, preview, body, CTA)
- Maintains brand voice consistency
- Optimizes for deliverability (avoids spam trigger words)
- Creates variants for A/B testing automatically

**Context it uses:**
| Data Source | How It's Used |
|-------------|---------------|
| Past campaigns | Learn what subject lines got opens |
| Contact segments | Personalize by industry/stage |
| Email Intelligence | Mirror successful reply patterns |
| Deliverability Engine | Avoid patterns that hurt inbox rate |

**User Experience:**
```
┌─────────────────────────────────────────────────────────┐
│ What's the goal of this email?                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Announce our Series A and thank early customers     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Tone:  [Founder-direct ▾]  Length: [Short ▾]           │
│                                                         │
│ ┌─ Generated Draft ─────────────────────────────────┐   │
│ │ Subject: We just raised $4M (and you made it      │   │
│ │          happen)                                   │   │
│ │                                                    │   │
│ │ Hey {{first_name}},                               │   │
│ │                                                    │   │
│ │ Quick note: we closed our Series A this morning.  │   │
│ │                                                    │   │
│ │ You were one of the first 50 people to believe    │   │
│ │ in what we're building. That matters.             │   │
│ │                                                    │   │
│ │ What's next? More features, faster. Starting with │   │
│ │ [the thing you've been asking for].               │   │
│ │                                                    │   │
│ │ — Sarah                                           │   │
│ └────────────────────────────────────────────────────┘   │
│                                                         │
│ [Regenerate] [Make Shorter] [Add CTA] [Use This →]      │
└─────────────────────────────────────────────────────────┘
```

**Differentiators vs. Generic AI:**
- Knows `{{first_name}}` from your CRM
- Knows "50 people" is your actual early customer count
- Suggests "the thing you've been asking for" based on Email Intelligence extracted requests

---

### 2. Visual Asset Generator

**What it does:**
- Generates hero images, product mockups, diagrams
- Maintains visual brand consistency
- Optimizes for email clients (file size, alt text)
- Creates social preview images automatically

**Generation Types:**

| Type | Example Use Case | Model |
|------|-----------------|-------|
| **Hero Images** | Abstract backgrounds, conceptual art | DALL-E 3 / Midjourney API |
| **Product Mockups** | Screenshot in device frame | Template + Compositing |
| **Data Visualizations** | "Your metrics this month" charts | Programmatic (D3/Chart.js → PNG) |
| **Diagrams** | How-it-works explanations | Structured generation |
| **Headshots/Avatars** | Founder signature images | Uploaded + styled |

**User Experience:**
```
┌─────────────────────────────────────────────────────────┐
│ Generate Image                                          │
│                                                         │
│ Describe what you need:                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Abstract image representing growth and momentum,    │ │
│ │ green and gold tones, minimal, professional         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Style: [Minimal ▾]  Aspect: [Email Hero 600x200 ▾]     │
│                                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ Option 1 │ │ Option 2 │ │ Option 3 │ │ Option 4 │    │
│ │  [img]   │ │  [img]   │ │  [img]   │ │  [img]   │    │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                         │
│ [Regenerate All] [Refine Selected] [Use in Campaign]   │
└─────────────────────────────────────────────────────────┘
```

**Smart Features:**
- **Brand Memory:** "Use the same style as my last 3 campaigns"
- **Email-Safe Export:** Auto-compresses, adds alt text, inlines for compatibility
- **Responsive Variants:** Generates mobile-optimized crop automatically

---

### 3. Personalization Engine

**What it does:**
- Generates unique copy variants per contact segment
- Creates dynamic content blocks based on CRM data
- Writes personalized opening lines at scale

**The Problem It Solves:**

Generic personalization:
> "Hi {{first_name}}, I noticed you work at {{company}}..."

Intelligent personalization:
> "Hi Jake, saw Acme just closed their Series B — congrats.
> We helped 3 other dev tools companies at your stage with..."

**How it works:**
```
┌─────────────────────────────────────────────────────────┐
│ Personalization Depth                                   │
│                                                         │
│ ○ Basic (name, company)                                │
│ ○ Segment-aware (different copy per industry)          │
│ ● Hyper-personalized (unique opener per contact)       │
│                                                         │
│ Preview for 3 contacts:                                 │
│                                                         │
│ ┌─ Jake Chen (Acme Corp) ────────────────────────────┐ │
│ │ "Saw Acme just closed Series B — congrats. When    │ │
│ │ dev tools companies hit this stage, onboarding     │ │
│ │ usually becomes the bottleneck..."                  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ Maria Santos (CloudFirst) ────────────────────────┐ │
│ │ "Your post about migrating to Kubernetes resonated │ │
│ │ — we see that pain daily. Quick thought on making  │ │
│ │ the transition smoother..."                         │ │
│ └────────────────────────────────────────────────────┘ │
│                                                         │
│ Cost: ~$0.02/contact for hyper-personalization         │
│                                                         │
│ [Generate All] [Edit Individual] [Approve & Queue]     │
└─────────────────────────────────────────────────────────┘
```

**Context Sources:**
- CRM enrichment data (company, industry, stage)
- LinkedIn activity (if integrated)
- Past email exchanges (via Email Intelligence)
- News/funding APIs for company updates

---

### 4. Campaign Strategist Agent

**What it does:**
- Suggests campaign ideas based on your goals
- Recommends timing, frequency, segmentation
- Predicts performance based on historical data
- Proposes multi-email sequences

**User Experience:**
```
You: "I want to increase MRR by 20% this quarter"

Strategist: Based on your data, here are 3 highest-impact campaigns:

1. WIN-BACK SEQUENCE (Est. impact: +$2,400 MRR)
   Target: 34 churned customers from last 6 months
   Approach: 3-email sequence highlighting new features
   Why: Your win-back campaigns have 12% conversion historically
   [Create This Campaign]

2. EXPANSION CAMPAIGN (Est. impact: +$1,800 MRR)
   Target: 28 customers on Starter plan with high usage
   Approach: Personal outreach about Pro tier benefits
   Why: 8 contacts hit usage limits last month
   [Create This Campaign]

3. REFERRAL ASK (Est. impact: +$3,200 MRR)
   Target: 15 customers with Health Score >80
   Approach: Ask for 1 warm intro, offer credit
   Why: Your happiest customers haven't been asked
   [Create This Campaign]

Want me to create all 3 as a quarterly sequence?
```

**What Makes This Powerful:**
- Uses your actual data (not generic advice)
- Quantifies expected impact
- One-click to generate the full campaign
- Learns from results to improve predictions

---

### 5. Document & Asset Generator

**What it does:**
- Creates PDF attachments (one-pagers, case studies, proposals)
- Generates branded documents from templates
- Builds personalized pitch decks
- Creates comparison charts and spec sheets

**Use Cases:**

| Document Type | When Generated | Personalization |
|--------------|----------------|-----------------|
| One-Pager | Attached to outreach | Company name, relevant case study |
| Proposal | Post-demo follow-up | Pricing, timeline, their requirements |
| Case Study | When contact matches profile | Industry-specific results |
| ROI Calculator | For enterprise leads | Their metrics pre-filled |

**User Experience:**
```
┌─────────────────────────────────────────────────────────┐
│ Generate Attachment                                     │
│                                                         │
│ Document Type: [One-Pager ▾]                           │
│                                                         │
│ Personalize for:                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑ Acme Corp (Series B, Dev Tools)                  │ │
│ │ ☑ CloudFirst (Seed, Infrastructure)               │ │
│ │ ☐ TechNova (Series A, Fintech)                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Include:                                                │
│ ☑ Company-specific headline                            │
│ ☑ Relevant case study (auto-selected)                  │
│ ☑ Industry-specific metrics                            │
│ ☐ Pricing (add manually)                               │
│                                                         │
│ [Preview] [Generate 2 PDFs] [Attach to Campaign]       │
└─────────────────────────────────────────────────────────┘
```

---

## 6. AI-Powered Automation Hub (Zapier-Style)

**The Big Idea:** Combine AI generation with event-driven automation. When something happens (trigger), the AI creates context-aware content (generate), then the system takes action (execute).

### Why This Changes Everything

Current Zapier/Make workflows:
```
Trigger: New Stripe payment
Action: Send email template #47
```

FounderOS AI Automation:
```
Trigger: New Stripe payment
AI Generate: Personalized welcome email based on:
  - What plan they bought
  - Their company size (from CRM enrichment)
  - Which features matter for their industry
Action: Send generated email + create follow-up task for day 7
```

The automation doesn't just connect pipes — it **thinks**.

---

### Trigger Sources

#### Internal Triggers (FounderOS Events)

| Trigger | Example Use |
|---------|-------------|
| `contact.created` | Generate personalized welcome sequence |
| `contact.score_changed` | When score drops, generate re-engagement email |
| `contact.stage_changed` | Lead → Customer: generate onboarding sequence |
| `email.opened` | Generate follow-up based on which links clicked |
| `email.replied` | Analyze reply, suggest next action |
| `campaign.completed` | Generate performance report + next campaign suggestion |
| `momentum.hot_lead` | Generate "strike while hot" outreach |
| `momentum.slipping` | Generate win-back sequence |

#### External Triggers (Webhooks & Integrations)

| Source | Trigger | AI Response |
|--------|---------|-------------|
| **Stripe** | `payment.succeeded` | Generate welcome + onboarding based on plan tier |
| **Stripe** | `subscription.cancelled` | Generate win-back sequence citing their specific usage |
| **Stripe** | `invoice.payment_failed` | Generate gentle dunning email |
| **Calendly** | `meeting.scheduled` | Generate pre-meeting brief + prep email |
| **Calendly** | `meeting.cancelled` | Generate reschedule outreach |
| **Typeform** | `response.submitted` | Generate personalized follow-up based on answers |
| **GitHub** | `issue.created` | (For open source) Generate thank-you + triage response |
| **Intercom** | `conversation.closed` | Generate NPS/feedback request |
| **Slack** | `message.received` (in channel) | Generate email summary for external stakeholders |

#### Scheduled Triggers

| Schedule | AI Task |
|----------|---------|
| Weekly | Generate "This Week's Hot Leads" brief |
| Monthly | Generate campaign performance digest |
| Quarterly | Generate strategic recommendations |
| Custom | "Every Tuesday at 9am, generate newsletter draft" |

---

### The Automation Builder UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Create Automation                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ WHEN this happens...                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ▾ Stripe: Payment Succeeded                                 │ │
│ │   Filter: Plan = "Pro" or "Scale"                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│        ↓                                                         │
│                                                                  │
│ AI GENERATES...                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ● Email Copy                                                │ │
│ │ ○ Image Asset                                               │ │
│ │ ○ PDF Document                                              │ │
│ │                                                              │ │
│ │ Prompt:                                                      │ │
│ │ "Write a warm welcome email for a new {{plan_name}}         │ │
│ │  customer. Mention their industry ({{contact.industry}})    │ │
│ │  and highlight the 3 features most relevant to them.        │ │
│ │  Keep it under 150 words, founder-direct tone."             │ │
│ │                                                              │ │
│ │ ☑ Use brand voice                                           │ │
│ │ ☑ Include CRM context                                       │ │
│ │ ☐ Generate A/B variant                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│        ↓                                                         │
│                                                                  │
│ THEN do this...                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Action 1: Send generated email                              │ │
│ │ Action 2: Wait 7 days                                       │ │
│ │ Action 3: IF no reply → Generate follow-up → Send          │ │
│ │ Action 4: Update contact stage to "Onboarding"             │ │
│ │ Action 5: Create task "Check in call" for day 14           │ │
│ │                                                              │ │
│ │ [+ Add Action]                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [Save as Draft]  [Test with Sample Data]  [Activate →]          │
└─────────────────────────────────────────────────────────────────┘
```

---

### Pre-Built Automation Templates

#### Revenue Operations
| Template | Trigger → AI → Action |
|----------|----------------------|
| **New Customer Onboarding** | Stripe payment → Generate personalized welcome sequence (3 emails) → Send over 14 days |
| **Upgrade Nudge** | Usage hits 80% of limit → Generate upgrade pitch citing their usage → Send |
| **Churn Prevention** | Subscription cancel intent → Generate personalized save offer → Send immediately |
| **Failed Payment Recovery** | Invoice failed → Generate friendly dunning (3-email sequence) → Send with delays |
| **Expansion Revenue** | Customer hits 90 days + high health score → Generate case study request → Send |

#### Sales Automation
| Template | Trigger → AI → Action |
|----------|----------------------|
| **Lead Qualification** | Contact created → Enrich → Generate qualification email with questions → Send |
| **Demo Follow-up** | Calendly meeting completed → Generate personalized recap + next steps → Send 2 hours later |
| **Proposal Generator** | Contact stage → Proposal → Generate PDF proposal with their requirements → Attach and send |
| **Stale Lead Revival** | No engagement 30 days → Generate "checking in" email → Send |
| **Hot Lead Alert** | Momentum score spikes → Generate brief + suggested outreach → Notify founder |

#### Content & Engagement
| Template | Trigger → AI → Action |
|----------|----------------------|
| **Newsletter Drafting** | Every Tuesday 9am → Generate newsletter draft from notes/links → Save to drafts |
| **Social Proof Request** | NPS score > 8 → Generate testimonial request → Send |
| **Event Follow-up** | Typeform "attended webinar" → Generate personalized follow-up → Send |
| **Referral Ask** | Customer 6-month anniversary + high score → Generate referral request → Send |

---

### Advanced: AI Decision Nodes

Let the AI make routing decisions, not just generate content:

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Decision Node                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Analyze the incoming email reply and decide:                     │
│                                                                  │
│ IF sentiment = positive AND contains buying signal:              │
│   → Route to "Hot Lead" branch                                  │
│   → Generate meeting request email                               │
│   → Send immediately                                             │
│                                                                  │
│ IF sentiment = negative OR contains objection:                   │
│   → Route to "Objection Handling" branch                        │
│   → Generate response addressing their specific concern          │
│   → Queue for human review before sending                        │
│                                                                  │
│ IF contains question:                                            │
│   → Route to "Q&A" branch                                       │
│   → Generate answer from knowledge base                          │
│   → Send with "Let me know if you need more detail"             │
│                                                                  │
│ ELSE:                                                            │
│   → Route to "Nurture" branch                                   │
│   → Wait 3 days                                                  │
│   → Generate soft follow-up                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

This transforms FounderOS from "send the right email" to "**have the right conversation**."

---

### Integration Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL WORLD                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Stripe  │ │Calendly │ │Typeform │ │  Slack  │ │ Webhooks│      │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘      │
│       │           │           │           │           │            │
│       └───────────┴───────────┴───────────┴───────────┘            │
│                               │                                     │
│                               ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WEBHOOK RECEIVER                          │   │
│  │                   /api/webhooks/:source                      │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
├────────────────────────────────┼────────────────────────────────────┤
│                     FOUNDEROS  │  AUTOMATION LAYER                  │
├────────────────────────────────┼────────────────────────────────────┤
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   AUTOMATION ENGINE                          │   │
│  │  • Event queue (Redis/Postgres)                             │   │
│  │  • Trigger matching                                          │   │
│  │  • Workflow execution                                        │   │
│  │  • Retry handling                                            │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│            ┌───────────────────┼───────────────────┐               │
│            ▼                   ▼                   ▼               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│  │  AI GENERATE │   │   ACTIONS    │   │   OUTPUTS    │           │
│  │              │   │              │   │              │           │
│  │ • Copywriter │   │ • Send email │   │ • Logs       │           │
│  │ • Image gen  │   │ • Update CRM │   │ • Metrics    │           │
│  │ • Doc gen    │   │ • Create task│   │ • Alerts     │           │
│  │ • Decisions  │   │ • Wait/delay │   │              │           │
│  └──────────────┘   │ • Webhook out│   └──────────────┘           │
│                     └──────────────┘                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

### Database Schema for Automations

```sql
-- Automation definitions
CREATE TABLE automations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  description TEXT,
  trigger_type VARCHAR(100), -- 'webhook', 'internal', 'schedule'
  trigger_config JSONB,      -- Source, filters, conditions
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Steps within an automation
CREATE TABLE automation_steps (
  id UUID PRIMARY KEY,
  automation_id UUID REFERENCES automations(id),
  step_order INTEGER,
  step_type VARCHAR(50),    -- 'ai_generate', 'action', 'decision', 'wait'
  config JSONB,             -- Step-specific configuration
  created_at TIMESTAMP DEFAULT NOW()
);

-- Execution history
CREATE TABLE automation_runs (
  id UUID PRIMARY KEY,
  automation_id UUID REFERENCES automations(id),
  trigger_event JSONB,      -- What triggered this run
  status VARCHAR(50),       -- 'running', 'completed', 'failed', 'paused'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Individual step executions
CREATE TABLE automation_step_runs (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES automation_runs(id),
  step_id UUID REFERENCES automation_steps(id),
  input JSONB,              -- Data going into the step
  output JSONB,             -- Data coming out (including AI generations)
  status VARCHAR(50),
  executed_at TIMESTAMP DEFAULT NOW(),
  duration_ms INTEGER
);

-- Webhook configurations
CREATE TABLE webhook_sources (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  source_name VARCHAR(100), -- 'stripe', 'calendly', 'custom'
  webhook_url VARCHAR(500), -- The URL we give them
  secret_key VARCHAR(255),  -- For signature verification
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### API Endpoints

```typescript
// Webhook receiver (public, signature-verified)
// POST /api/webhooks/:source_id
interface WebhookPayload {
  // Raw payload from external service
  [key: string]: any;
}

// Automation CRUD
// GET/POST /api/automations
interface AutomationCreate {
  name: string;
  trigger: {
    type: 'webhook' | 'internal' | 'schedule';
    source?: string;        // 'stripe', 'calendly', etc.
    event?: string;         // 'payment.succeeded', etc.
    filters?: Record<string, any>;
    schedule?: string;      // Cron expression
  };
  steps: AutomationStep[];
}

interface AutomationStep {
  type: 'ai_generate' | 'send_email' | 'update_contact' |
        'create_task' | 'wait' | 'decision' | 'webhook_out';
  config: {
    // For ai_generate
    prompt?: string;
    output_type?: 'email' | 'image' | 'document';
    use_brand_voice?: boolean;

    // For send_email
    use_generated?: boolean;  // Use output from previous AI step
    template_id?: string;

    // For wait
    duration?: string;        // '3 days', '2 hours'
    until_event?: string;     // 'email.opened'

    // For decision
    conditions?: DecisionCondition[];
  };
}

// Manual trigger for testing
// POST /api/automations/:id/test
interface TestTrigger {
  sample_data: Record<string, any>;
  dry_run?: boolean;  // Don't actually send emails
}
```

---

### Example: Complete Automation Flow

**Scenario:** New Pro customer signs up via Stripe

```yaml
Automation: "Pro Customer Onboarding"
Trigger: Stripe webhook → payment.succeeded (plan = "pro")

Steps:
  1. ENRICH
     - Look up contact by email in CRM
     - If not found, create contact with Stripe metadata
     - Enrich with company data

  2. AI GENERATE (Welcome Email)
     - Prompt: "Write a warm welcome email for {{contact.first_name}}
       at {{contact.company}}. They just bought the Pro plan.
       Their industry is {{contact.industry}}. Mention the 3 Pro
       features most relevant to their industry. Founder-direct tone."
     - Output: email_1

  3. SEND email_1
     - From: founder@company.com
     - To: {{contact.email}}

  4. WAIT 3 days

  5. DECISION (Check engagement)
     - IF email_1 was opened:
         → Continue to step 6
     - ELSE:
         → Generate "checking in" email
         → Send
         → End automation

  6. AI GENERATE (Feature Highlight)
     - Prompt: "Write a short email highlighting the 'Advanced
       Analytics' feature. Reference that they've been using the
       product for 3 days. Ask if they need help setting it up."
     - Output: email_2

  7. SEND email_2

  8. CREATE TASK
     - Title: "Check-in call with {{contact.first_name}}"
     - Due: 7 days from now
     - Note: "Pro customer, day 10 of onboarding"

  9. UPDATE CONTACT
     - Stage: "Onboarding"
     - Tag: "pro-onboarding-complete"
```

**Result:** The founder does nothing. The system sends personalized, context-aware emails and creates follow-up tasks automatically.

---

## Architecture Integration

### How It Fits With Existing Engines

```
┌─────────────────────────────────────────────────────────────┐
│                    AI CAMPAIGN STUDIO                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Copywriter  │  │   Visual     │  │ Personalize  │       │
│  │    Agent     │  │  Generator   │  │    Engine    │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│  ┌──────┴─────────────────┴─────────────────┴──────┐        │
│  │              Campaign Strategist                 │        │
│  └──────────────────────┬───────────────────────────┘        │
│                         │                                    │
├─────────────────────────┼────────────────────────────────────┤
│         EXISTING        │        INTELLIGENCE LAYER          │
├─────────────────────────┼────────────────────────────────────┤
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Context Provider                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ • CRM Engine (contacts, segments, scores)            │   │
│  │ • Campaign Engine (past performance, what worked)    │   │
│  │ • Email Intelligence (tone, patterns, requests)      │   │
│  │ • Momentum Engine (who's hot, who's cold)           │   │
│  │ • Deliverability Engine (what to avoid)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### New Database Tables

```sql
-- Store generated assets
CREATE TABLE generated_assets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  asset_type VARCHAR(50), -- 'copy', 'image', 'document'
  prompt TEXT,
  result JSONB, -- Generated content
  model_used VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track brand voice preferences
CREATE TABLE brand_voice (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  voice_description TEXT,
  example_emails TEXT[], -- Array of good examples
  avoid_phrases TEXT[],  -- Words/phrases to never use
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign generation sessions
CREATE TABLE campaign_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  conversation JSONB, -- Full agent conversation
  generated_campaign_id UUID REFERENCES campaigns(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Design

```typescript
// New API Routes

// POST /api/ai/generate-copy
interface GenerateCopyRequest {
  goal: string;
  tone: 'professional' | 'casual' | 'founder-direct';
  length: 'short' | 'medium' | 'long';
  segment_id?: string; // For segment-aware generation
  include_personalization?: boolean;
}

// POST /api/ai/generate-image
interface GenerateImageRequest {
  prompt: string;
  style: 'minimal' | 'bold' | 'photographic' | 'illustrated';
  aspect: 'hero' | 'square' | 'social';
  brand_colors?: string[]; // Hex codes
}

// POST /api/ai/strategist
interface StrategistRequest {
  goal: string; // Natural language goal
  constraints?: {
    budget?: number;
    timeline?: string;
    exclude_segments?: string[];
  };
}

// POST /api/ai/personalize
interface PersonalizeRequest {
  base_copy: string;
  contact_ids: string[];
  depth: 'basic' | 'segment' | 'hyper';
}
```

---

## Competitive Positioning

### Current Landscape

| Tool | AI Capabilities | Limitation |
|------|----------------|------------|
| **Klaviyo** | Subject line suggestions | No context, generic |
| **HubSpot** | Content assistant | Doesn't know your CRM deeply |
| **Jasper** | General copywriting | Not email-specific, no sending |
| **Copy.ai** | Templates | No CRM integration |
| **Superhuman** | Write for me | Only for replies, not campaigns |

### FounderOS Advantage

**"AI that knows your business"**

Generic AI tools don't know:
- That your best customers are Series A dev tools companies
- That "ROI" in subject lines tanks your open rates
- That Maria at CloudFirst asked about Kubernetes 3 emails ago
- That your domain's spam score spikes when you use exclamation marks

FounderOS AI knows all of this. Every generation is informed by your data.

---

## Implementation Phases

### Phase 1: Copywriter Agent (4-6 weeks)
- Basic copy generation with tone control
- Subject line optimization
- CRM variable injection ({{first_name}}, etc.)
- "What worked before" context from past campaigns

### Phase 2: Visual Generator (3-4 weeks)
- Integration with image generation API (DALL-E/Stability)
- Email-safe export pipeline
- Brand color/style memory
- Template-based product mockups

### Phase 3: Personalization Engine (4-5 weeks)
- Segment-aware copy variants
- Hyper-personalization with enrichment data
- Cost estimation and budgeting
- Preview and approval workflow

### Phase 4: Campaign Strategist (3-4 weeks)
- Goal → campaign recommendation engine
- Impact prediction based on historical data
- Multi-campaign sequence planning
- Quarterly planning assistant

### Phase 5: Document Generator (3-4 weeks)
- PDF generation pipeline
- Template library (one-pagers, proposals)
- Personalized document merging
- Attachment tracking in campaigns

### Phase 6: Automation Hub (5-7 weeks)
- Webhook receiver infrastructure (Stripe, Calendly, etc.)
- Visual automation builder UI
- AI generation as automation step
- Decision nodes with AI routing
- Pre-built automation templates (10+)
- Execution logging and debugging

**Total Estimate: 22-30 weeks for full suite**

---

## Monetization Angle

AI generation has natural usage-based pricing:

| Tier | Included | Overage |
|------|----------|---------|
| Starter | 100 generations/mo | $0.05/generation |
| Pro | 500 generations/mo | $0.03/generation |
| Scale | Unlimited | — |

This aligns costs with value delivered and creates expansion revenue.

---

## Open Questions

1. **Build vs. API?**
   - Image generation: Definitely API (DALL-E, Stability, Replicate)
   - Copy generation: Could use Claude API, or fine-tune smaller model
   - Trade-off: Control vs. speed-to-market

2. **Brand Voice Training**
   - How many examples needed for consistent voice?
   - Should users "approve" generations to train the model?
   - Privacy implications of using their email content?

3. **Personalization Limits**
   - At what point does hyper-personalization feel creepy?
   - How to handle contacts with minimal data?
   - Should we warn about potential "uncanny valley" effect?

4. **Cost Transparency**
   - Show cost per generation upfront?
   - Bundle into subscription or charge separately?
   - How to prevent runaway costs for power users?

---

## Summary

The AI Campaign Studio transforms FounderOS from a "tool you use" to an **autonomous business development partner**. It combines:

1. **AI Generation** — Creates copy, images, and documents with full business context
2. **Zapier-Style Automation** — Connects to external tools (Stripe, Calendly, etc.)
3. **Intelligent Routing** — AI makes decisions, not just generates content

The result is campaigns that are:

- **Contextual:** Knows your contacts, history, and performance data
- **Personalized:** Creates unique content per segment or contact
- **Visual:** Generates images, not just text
- **Strategic:** Suggests what to send, not just how to send it
- **Autonomous:** Runs 24/7, responding to events without founder intervention
- **Integrated:** Connects to the tools founders already use

### The Competitive Moat

| Competitor | What They Have | What They Lack |
|------------|---------------|----------------|
| **Zapier/Make** | Automation | AI generation, CRM context |
| **Jasper/Copy.ai** | AI writing | Sending, CRM, automation |
| **Klaviyo/HubSpot** | Email + CRM | Deep AI, external triggers |
| **FounderOS** | All three, unified | — |

This is the "Linear of founder automation" — opinionated, AI-native, and impossible to replicate with duct-taped point solutions.

---

*Proposal created: December 2025*
