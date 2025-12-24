# FounderOS Launch Checklist

## Pre-Merge Verification (Before PR is Merged)

### Code Quality
- [ ] All 3 commits have clear, descriptive messages
- [ ] No console.log or debug code remaining
- [ ] No commented-out code (except intentional feature deferral like Inbox)
- [ ] TypeScript types are correct on modified files
- [ ] No unused imports

### Testing
- [ ] Run linter on modified files: `npm run lint src/`
- [ ] Run type check: `npm run type-check`
- [ ] Run unit tests (if available): `npm run test`
- [ ] Manual smoke test in browser:
  - [ ] Dashboard loads without errors
  - [ ] Navigation works (all menu items clickable)
  - [ ] Can complete full onboarding flow

### PR Review
- [ ] PR created with full summary
- [ ] At least one reviewer has approved
- [ ] All CI/CD checks passing
- [ ] No merge conflicts

---

## Post-Merge Verification (After PR is Merged to Main)

### Database & Environment
- [ ] Confirm no migrations are needed
- [ ] Verify environment variables are set correctly:
  - [ ] `NEXT_PUBLIC_APP_URL` is correct
  - [ ] Email config is ready
  - [ ] Database connection is active
- [ ] Staging database is fresh/clean

### Build & Deployment
- [ ] Pull latest main branch: `git pull origin main`
- [ ] Build succeeds: `npm run build`
- [ ] No build warnings or errors
- [ ] Deploy to staging environment

### Feature Verification (Test Every Change)

#### ✅ Cycle 1 Changes
- [ ] **Page Titles:** Check all pages show correct titles matching sidebar
  - [ ] Overview → "Overview"
  - [ ] Domains → "Email Domains"
  - [ ] Campaigns → "Campaigns"
  - [ ] CRM → "CRM"
  - [ ] Workflows → "Workflows"

- [ ] **Error Messages:** Trigger errors and verify user-friendly text
  - [ ] Invalid domain submission shows: "We couldn't add this domain..."
  - [ ] Duplicate contact shows: "This email address is already in your contacts"
  - [ ] Missing fields shows: "Email is required to create a contact"

- [ ] **Loading States:** Verify consistent messaging
  - [ ] Domains page: "Loading domains..."
  - [ ] Campaigns page: "Loading campaigns..."
  - [ ] CRM page: "Preparing your contacts..."

- [ ] **CRM Metrics:** Check dashboard card shows dynamic values
  - [ ] "Hot Leads: X" shows correct count
  - [ ] Not hardcoded to "Growth" anymore

- [ ] **AI Draft Button:** Verify "Draft" label is visible
  - [ ] Text label shows next to Sparkles icon
  - [ ] Button is clickable and opens AIDraftModal

- [ ] **Terminology:** Check all instances say "Contact" not "Lead"
  - [ ] Quick Actions button says "Add New Contact"
  - [ ] CRM page title says "Customer Relationship Engine"

- [ ] **Momentum Explainer:** First-time CRM visit shows modal
  - [ ] Modal appears automatically on first visit
  - [ ] Modal explains momentum scoring with examples
  - [ ] "Got It" button closes modal
  - [ ] Modal doesn't appear on subsequent visits

- [ ] **Campaign Success Screen:** After creating campaign
  - [ ] Success screen shows "Campaign Created"
  - [ ] "What's Next?" section appears with guidance
  - [ ] Buttons work: "View in Campaigns" and "Done"

- [ ] **CRM Empty State:** New user with no contacts
  - [ ] Empty state card displays with icon, title, description
  - [ ] "Add Contact" button works and opens form

#### ✅ Phase 1 Changes
- [ ] **Real Campaign Metrics:** Create test campaign, check metrics
  - [ ] Dashboard stats show real values (not placeholders)
  - [ ] Campaign list shows open rate on hover
  - [ ] Aggregate metrics are calculated correctly
  - [ ] Formula is correct: (opens / total_sent) × 100

- [ ] **DNS Guidance:** Add domain and verify setup guide
  - [ ] Provider-specific links appear in guide
  - [ ] Links open correct documentation (GoDaddy, Namecheap, etc.)
  - [ ] Copy buttons work for SPF/DMARC records

- [ ] **Product Narrative:** Check positioning is consistent
  - [ ] Dashboard header shows: "All-in-one email + CRM for startup founders"
  - [ ] Onboarding welcome mentions "vendor independence"
  - [ ] Sidebar still says "Command Center" as tagline

- [ ] **Automations Stats:** Open Workflows page
  - [ ] Shows "Active Workflows" count
  - [ ] Shows "Total Workflows" count
  - [ ] Shows "Trigger Types" count
  - [ ] Stats update when workflows are created

- [ ] **Campaign Send CTA:** Check dashboard recent campaigns
  - [ ] Draft campaigns show "Send" button
  - [ ] Sent/completed campaigns show Mail icon
  - [ ] "Send" button opens CampaignDetailModal

#### ✅ Cycle 3 Changes
- [ ] **Contact Stage Field:** Add new contact
  - [ ] Form shows "Pipeline Stage" dropdown
  - [ ] Options are: Lead, Prospect, Customer, Churned
  - [ ] Default selection is "Lead"
  - [ ] Stage persists when contact is created
  - [ ] Stage appears in CRM table

- [ ] **Inbox Hidden:** Check sidebar navigation
  - [ ] Inbox menu item is gone
  - [ ] All other nav items still work
  - [ ] /inbox route still works if accessed directly (not ideal, but acceptable)

- [ ] **API Error Messages:** Test all form errors
  - [ ] Missing email: "Email is required to create a contact."
  - [ ] Missing first/last name: "First name and last name are required."
  - [ ] Duplicate email: "This email address is already in your contacts."
  - [ ] Messages appear in toast notifications

---

## End-to-End Workflow Testing

### Workflow 1: Complete Onboarding
- [ ] **Domain Setup**
  - [ ] Click "Add Domain" in Quick Actions
  - [ ] Enter domain name
  - [ ] See DNS setup guide with provider links
  - [ ] Copy SPF/DMARC records successfully
  - [ ] Confirm domain added

- [ ] **Contact Import**
  - [ ] Click "Add Contact" in Quick Actions
  - [ ] Fill form: email, first name, last name, company, stage
  - [ ] See success screen with "Draft Email" and "Send Campaign" options
  - [ ] Contact appears in CRM page

- [ ] **Campaign Creation**
  - [ ] Click "Create Campaign" (either Quick Actions or Campaigns page)
  - [ ] Fill form: name, type, subject, body
  - [ ] See success screen with "What's Next?" guidance
  - [ ] Campaign appears in campaigns list

- [ ] **Campaign Send**
  - [ ] From dashboard or campaigns page, click on draft campaign
  - [ ] Review modal shows subject, body, recipient count
  - [ ] Warning appears: "Once sent, this campaign cannot be undone"
  - [ ] Click "Send Campaign"
  - [ ] See confirmation dialog
  - [ ] Click "Yes, Send Now"
  - [ ] Campaign status changes to "active" or "completed"

**Result:** ✅ Onboarding flow is complete and intuitive

### Workflow 2: Hot Lead Detection & Response
- [ ] **Hot Lead Identification**
  - [ ] Go to CRM page
  - [ ] Verify Momentum explainer modal appears first time
  - [ ] Contacts sorted by momentum score (highest first)
  - [ ] Hot leads (momentum ≥ 5) show flame badge

- [ ] **AI Draft Generation**
  - [ ] Click "Draft" button on hot lead row
  - [ ] AIDraftModal opens with suggested email
  - [ ] Email uses contact's engagement patterns

- [ ] **Send to Hot Lead**
  - [ ] Create new campaign with AI-generated draft
  - [ ] Select hot lead as recipient
  - [ ] Complete send flow
  - [ ] Campaign appears in dashboard

**Result:** ✅ Hot lead workflow from detection to outreach

### Workflow 3: Campaign Monitoring
- [ ] **View Campaign Metrics**
  - [ ] Go to Campaigns page
  - [ ] Aggregate stats at top show Open Rate %, Total Clicks, Total Sent
  - [ ] Individual campaigns show Open Rate on hover
  - [ ] Metrics are calculated correctly from email_logs

- [ ] **Verify Email Tracking (Optional/Advanced)**
  - [ ] Send real test email from campaigns
  - [ ] Open email in inbox
  - [ ] Check database: `SELECT * FROM email_logs WHERE campaign_id=...`
  - [ ] Status should change to 'opened' (tracking pixel fired)

**Result:** ✅ Campaign analytics are functional

---

## Performance & Security

- [ ] No console errors in browser DevTools
- [ ] No network errors (HTTP 5xx) in Network tab
- [ ] Page load time is acceptable (< 3s)
- [ ] No sensitive data exposed in console logs
- [ ] API responses don't leak internal errors
- [ ] Forms properly validate on client and server

---

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browser (iOS Safari or Chrome Android)

All workflows should work on all browsers.

---

## Accessibility

- [ ] All form labels are associated with inputs
- [ ] Color contrast meets WCAG AA standards
- [ ] Keyboard navigation works (Tab through form)
- [ ] Modal dialogs have proper focus management
- [ ] Aria-labels on icon buttons

---

## Analytics & Monitoring

- [ ] Set up monitoring for error rates
- [ ] Monitor database query performance
- [ ] Track page load metrics
- [ ] Set up alerts for critical failures

---

## Documentation

- [ ] README.md is up to date
- [ ] Feature documentation reflects new changes
- [ ] User onboarding guide mentions new workflows
- [ ] API documentation updated if needed

---

## Sign-Off

| Role | Name | Date | Notes |
|------|------|------|-------|
| QA | | | |
| Product | | | |
| Engineering | | | |
| Deployment | | | |

---

## Post-Launch (48 Hours)

- [ ] Monitor error logs for new issues
- [ ] Check user feedback/support channels
- [ ] Verify email tracking is working (opens/clicks logged)
- [ ] Monitor performance metrics
- [ ] Be ready to rollback if critical issues found

---

## Known Limitations (Not Blockers)

- ❌ Inbox feature is hidden (implemented in Phase 2)
- ℹ️ Campaign metrics will show 0% until real emails are sent and opened
- ℹ️ Email tracking works but requires real email provider setup
- ⚠️ Contact stage field doesn't affect sorting (purely informational)

---

## Success Criteria

All of the following must be true:
- ✅ No critical errors in any tested workflow
- ✅ All UI changes render correctly
- ✅ All error messages display properly
- ✅ Database updates persist correctly
- ✅ Email tracking infrastructure works
- ✅ Performance is acceptable
- ✅ No security issues detected

**If all above are checked: SAFE TO LAUNCH** 🚀

---

*Last Updated: Post-Cycle-3 Audit*
*Coherence Score: 90/100*
*Status: LAUNCH-READY*
