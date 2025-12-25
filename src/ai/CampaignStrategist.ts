/**
 * AI Campaign Strategist
 *
 * Designs complete email campaign strategies including timing,
 * sequencing, A/B testing, and audience segmentation recommendations.
 */

import { v4 as uuid } from 'uuid';
import { getRouter } from './AIRouter';
import { EmailPurpose } from './Copywriter';

// ============================================================================
// Types
// ============================================================================

/**
 * Campaign strategy request
 */
export interface StrategyRequest {
  userId: string;

  // Campaign basics
  campaignGoal: CampaignGoal;
  productOrService: string;
  targetAudience: string;

  // Context
  audienceSize?: number;
  industry?: string;
  currentChallenges?: string[];

  // Constraints
  budget?: 'low' | 'medium' | 'high';
  timeline?: 'urgent' | 'standard' | 'flexible';
  resourceLevel?: 'solo' | 'small-team' | 'full-team';
}

export type CampaignGoal =
  | 'lead-generation'
  | 'product-launch'
  | 'nurture-sequence'
  | 'reactivation'
  | 'onboarding'
  | 'promotion'
  | 'event-promotion'
  | 'content-marketing'
  | 'customer-retention'
  | 'upsell-cross-sell'
  | 'feedback-collection'
  | 'brand-awareness';

/**
 * Complete campaign strategy
 */
export interface CampaignStrategy {
  id: string;
  name: string;
  description: string;
  goal: CampaignGoal;

  // Email sequence
  emails: EmailInSequence[];

  // Timing
  sendingSchedule: SendingSchedule;

  // Audience
  segmentation: SegmentationStrategy;

  // Testing
  abTests: ABTestPlan[];

  // Metrics to track
  kpis: KPITarget[];

  // Additional recommendations
  recommendations: StrategyRecommendation[];

  // Estimated outcomes
  projectedMetrics: ProjectedMetrics;
}

export interface EmailInSequence {
  id: string;
  order: number;
  name: string;
  purpose: EmailPurpose;
  description: string;

  // Timing
  sendTiming: SendTiming;

  // Content guidance
  subjectGuidance: string;
  contentFocus: string[];
  callToAction: string;

  // Conditions
  sendCondition?: EmailCondition;
}

export interface SendTiming {
  type: 'immediate' | 'delay' | 'trigger' | 'scheduled';
  delayDays?: number;
  delayHours?: number;
  triggerEvent?: string;
  scheduledTime?: string;
  optimalDays?: string[];
  optimalTimeRange?: { start: string; end: string };
}

export interface EmailCondition {
  type: 'opened' | 'clicked' | 'not_opened' | 'not_clicked' | 'purchased' | 'segment';
  previousEmailId?: string;
  segmentId?: string;
}

export interface SendingSchedule {
  timezone: string;
  optimalDays: string[];
  optimalTimeSlots: TimeSlot[];
  avoidDays?: string[];
  frequency: 'daily' | 'every-other-day' | 'twice-weekly' | 'weekly' | 'bi-weekly';
}

export interface TimeSlot {
  start: string;  // "09:00"
  end: string;    // "11:00"
  priority: number;
  rationale: string;
}

export interface SegmentationStrategy {
  primarySegments: AudienceSegment[];
  exclusions: string[];
  personalizationDepth: 'basic' | 'moderate' | 'deep';
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  estimatedSize?: string;
  priority: number;
  customApproach?: string;
}

export interface ABTestPlan {
  id: string;
  emailId: string;
  testType: 'subject' | 'content' | 'cta' | 'send-time' | 'sender-name';
  variants: ABVariant[];
  splitRatio: number[];  // e.g., [50, 50] or [33, 33, 34]
  winningCriteria: 'open-rate' | 'click-rate' | 'conversion-rate';
  testDuration: string;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
}

export interface KPITarget {
  metric: string;
  target: string;
  benchmark: string;
  importance: 'primary' | 'secondary';
}

export interface StrategyRecommendation {
  category: 'timing' | 'content' | 'audience' | 'technical' | 'testing';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface ProjectedMetrics {
  openRate: { low: number; expected: number; high: number };
  clickRate: { low: number; expected: number; high: number };
  conversionRate: { low: number; expected: number; high: number };
  revenueImpact?: { low: number; expected: number; high: number };
}

/**
 * Quick campaign idea
 */
export interface CampaignIdea {
  id: string;
  name: string;
  description: string;
  goal: CampaignGoal;
  emailCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: string;
  bestFor: string[];
}

// ============================================================================
// Campaign Strategist Service
// ============================================================================

export class CampaignStrategist {

  /**
   * Generate a complete campaign strategy
   */
  async generateStrategy(request: StrategyRequest): Promise<CampaignStrategy> {
    const router = getRouter();

    const goalContext = this.getGoalContext(request.campaignGoal);
    const constraintsContext = this.getConstraintsContext(request);

    const prompt = `Design a complete email campaign strategy.

CAMPAIGN CONTEXT:
- Goal: ${request.campaignGoal} (${goalContext})
- Product/Service: ${request.productOrService}
- Target Audience: ${request.targetAudience}
- Audience Size: ${request.audienceSize || 'Unknown'}
- Industry: ${request.industry || 'Not specified'}
${request.currentChallenges?.length ? `- Current Challenges: ${request.currentChallenges.join(', ')}` : ''}

CONSTRAINTS:
${constraintsContext}

Create a comprehensive strategy including:

1. EMAIL SEQUENCE (3-7 emails):
   - Purpose of each email
   - Optimal timing between emails
   - Subject line guidance
   - Content focus areas
   - Call-to-action for each

2. SENDING SCHEDULE:
   - Best days to send
   - Optimal time slots with rationale
   - Frequency recommendations

3. AUDIENCE SEGMENTATION:
   - Primary segments to target
   - Exclusions
   - Personalization depth

4. A/B TESTING PLAN:
   - What to test on which emails
   - Hypothesis for each test
   - Success criteria

5. KPIs TO TRACK:
   - Primary and secondary metrics
   - Realistic targets

6. ADDITIONAL RECOMMENDATIONS:
   - Quick wins
   - Advanced tactics

7. PROJECTED OUTCOMES:
   - Expected open rates (range)
   - Expected click rates (range)
   - Expected conversions (range)

Respond in this exact JSON format:
{
  "name": "Campaign Name",
  "description": "Brief campaign description",
  "emails": [
    {
      "order": 1,
      "name": "Email Name",
      "purpose": "welcome|newsletter|product-launch|etc",
      "description": "What this email does",
      "sendTiming": {
        "type": "immediate|delay|trigger",
        "delayDays": 0,
        "optimalDays": ["Tuesday", "Thursday"],
        "optimalTimeRange": { "start": "09:00", "end": "11:00" }
      },
      "subjectGuidance": "Subject line approach",
      "contentFocus": ["Point 1", "Point 2"],
      "callToAction": "Primary CTA"
    }
  ],
  "sendingSchedule": {
    "timezone": "recipient",
    "optimalDays": ["Tuesday", "Wednesday", "Thursday"],
    "optimalTimeSlots": [
      { "start": "09:00", "end": "11:00", "priority": 1, "rationale": "..." }
    ],
    "frequency": "twice-weekly"
  },
  "segmentation": {
    "primarySegments": [
      {
        "name": "Segment Name",
        "description": "Who they are",
        "criteria": ["criteria 1"],
        "estimatedSize": "40%",
        "priority": 1
      }
    ],
    "exclusions": ["Recent purchasers"],
    "personalizationDepth": "moderate"
  },
  "abTests": [
    {
      "emailId": "email-1",
      "testType": "subject",
      "variants": [
        { "name": "Variant A", "description": "...", "hypothesis": "..." }
      ],
      "splitRatio": [50, 50],
      "winningCriteria": "open-rate",
      "testDuration": "24 hours"
    }
  ],
  "kpis": [
    { "metric": "Open Rate", "target": "25%", "benchmark": "20%", "importance": "primary" }
  ],
  "recommendations": [
    {
      "category": "timing",
      "title": "Recommendation",
      "description": "Details",
      "impact": "high",
      "effort": "low"
    }
  ],
  "projectedMetrics": {
    "openRate": { "low": 18, "expected": 25, "high": 35 },
    "clickRate": { "low": 2, "expected": 4, "high": 7 },
    "conversionRate": { "low": 0.5, "expected": 1.5, "high": 3 }
  }
}`;

    try {
      const response = await router.generate({
        userId: request.userId,
        prompt,
        taskType: 'campaign-strategy',
        routingMode: 'quality',
        maxTokens: 4000,
      });

      const parsed = JSON.parse(response.content);

      // Add IDs to all items
      return {
        id: uuid(),
        goal: request.campaignGoal,
        name: parsed.name,
        description: parsed.description,
        emails: parsed.emails.map((e: any, i: number) => ({
          ...e,
          id: uuid(),
          order: e.order || i + 1,
        })),
        sendingSchedule: parsed.sendingSchedule,
        segmentation: {
          ...parsed.segmentation,
          primarySegments: parsed.segmentation.primarySegments.map((s: any) => ({
            ...s,
            id: uuid(),
          })),
        },
        abTests: parsed.abTests.map((t: any) => ({
          ...t,
          id: uuid(),
          variants: t.variants.map((v: any) => ({ ...v, id: uuid() })),
        })),
        kpis: parsed.kpis,
        recommendations: parsed.recommendations,
        projectedMetrics: parsed.projectedMetrics,
      };
    } catch (error) {
      console.error('Strategy generation failed:', error);
      throw error;
    }
  }

  /**
   * Get quick campaign ideas based on goal
   */
  async getCampaignIdeas(
    userId: string,
    goal?: CampaignGoal
  ): Promise<CampaignIdea[]> {
    // Pre-built campaign templates
    const allIdeas: CampaignIdea[] = [
      {
        id: uuid(),
        name: 'Welcome Sequence',
        description: 'Onboard new subscribers with a warm introduction to your brand',
        goal: 'onboarding',
        emailCount: 5,
        complexity: 'moderate',
        estimatedSetupTime: '2-3 hours',
        bestFor: ['New subscriber engagement', 'Setting expectations', 'Building relationship'],
      },
      {
        id: uuid(),
        name: 'Product Launch Blitz',
        description: 'Build anticipation and drive sales for a new product',
        goal: 'product-launch',
        emailCount: 4,
        complexity: 'moderate',
        estimatedSetupTime: '3-4 hours',
        bestFor: ['New products', 'Feature releases', 'Major updates'],
      },
      {
        id: uuid(),
        name: 'Re-engagement Campaign',
        description: 'Win back inactive subscribers before they churn',
        goal: 'reactivation',
        emailCount: 3,
        complexity: 'simple',
        estimatedSetupTime: '1-2 hours',
        bestFor: ['Inactive users', 'Reducing churn', 'List hygiene'],
      },
      {
        id: uuid(),
        name: 'Lead Nurture Drip',
        description: 'Move leads through your funnel with educational content',
        goal: 'nurture-sequence',
        emailCount: 7,
        complexity: 'complex',
        estimatedSetupTime: '4-6 hours',
        bestFor: ['B2B sales', 'High-ticket products', 'Long sales cycles'],
      },
      {
        id: uuid(),
        name: 'Flash Sale',
        description: 'Create urgency with a time-limited promotion',
        goal: 'promotion',
        emailCount: 3,
        complexity: 'simple',
        estimatedSetupTime: '1-2 hours',
        bestFor: ['Inventory clearing', 'Revenue boost', 'Engagement spike'],
      },
      {
        id: uuid(),
        name: 'Event Promotion Series',
        description: 'Fill seats for your webinar, conference, or event',
        goal: 'event-promotion',
        emailCount: 5,
        complexity: 'moderate',
        estimatedSetupTime: '2-3 hours',
        bestFor: ['Webinars', 'Conferences', 'Product demos'],
      },
      {
        id: uuid(),
        name: 'Customer Feedback Loop',
        description: 'Gather reviews, testimonials, and product feedback',
        goal: 'feedback-collection',
        emailCount: 2,
        complexity: 'simple',
        estimatedSetupTime: '1 hour',
        bestFor: ['Post-purchase', 'Product improvement', 'Social proof'],
      },
      {
        id: uuid(),
        name: 'Upsell/Cross-sell Sequence',
        description: 'Increase customer lifetime value with relevant offers',
        goal: 'upsell-cross-sell',
        emailCount: 4,
        complexity: 'moderate',
        estimatedSetupTime: '2-3 hours',
        bestFor: ['Existing customers', 'Revenue growth', 'Product adoption'],
      },
      {
        id: uuid(),
        name: 'Educational Newsletter',
        description: 'Build authority with valuable weekly content',
        goal: 'content-marketing',
        emailCount: 1,
        complexity: 'simple',
        estimatedSetupTime: '1-2 hours per issue',
        bestFor: ['Thought leadership', 'Engagement', 'Traffic driving'],
      },
      {
        id: uuid(),
        name: 'Customer Retention',
        description: 'Keep customers engaged and reduce churn',
        goal: 'customer-retention',
        emailCount: 6,
        complexity: 'complex',
        estimatedSetupTime: '4-5 hours',
        bestFor: ['SaaS', 'Subscriptions', 'Membership sites'],
      },
    ];

    if (goal) {
      return allIdeas.filter(idea => idea.goal === goal);
    }

    return allIdeas;
  }

  /**
   * Analyze an existing campaign and suggest improvements
   */
  async analyzeCampaign(
    userId: string,
    campaignData: {
      emails: Array<{
        subject: string;
        content: string;
        openRate?: number;
        clickRate?: number;
      }>;
      overallOpenRate?: number;
      overallClickRate?: number;
      goal?: string;
    }
  ): Promise<{
    score: number;
    strengths: string[];
    weaknesses: string[];
    improvements: StrategyRecommendation[];
  }> {
    const router = getRouter();

    const emailSummaries = campaignData.emails.map((e, i) => `
Email ${i + 1}:
- Subject: ${e.subject}
- Content preview: ${e.content.substring(0, 200)}...
- Open Rate: ${e.openRate ? `${e.openRate}%` : 'N/A'}
- Click Rate: ${e.clickRate ? `${e.clickRate}%` : 'N/A'}
`).join('\n');

    const prompt = `Analyze this email campaign and provide improvement recommendations.

CAMPAIGN DATA:
${emailSummaries}

Overall Metrics:
- Open Rate: ${campaignData.overallOpenRate ? `${campaignData.overallOpenRate}%` : 'N/A'}
- Click Rate: ${campaignData.overallClickRate ? `${campaignData.overallClickRate}%` : 'N/A'}
- Goal: ${campaignData.goal || 'Not specified'}

Analyze for:
1. Subject line effectiveness
2. Content quality and relevance
3. Email sequence flow
4. CTA clarity and placement
5. Personalization usage
6. Timing considerations

Provide:
1. Overall score (0-100)
2. Key strengths
3. Key weaknesses
4. Specific improvements (prioritized by impact/effort)

Respond in this exact JSON format:
{
  "score": 72,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "improvements": [
    {
      "category": "content|timing|audience|technical|testing",
      "title": "Improvement title",
      "description": "Detailed recommendation",
      "impact": "high",
      "effort": "low"
    }
  ]
}`;

    try {
      const response = await router.generate({
        userId,
        prompt,
        taskType: 'analysis',
        routingMode: 'quality',
        maxTokens: 2000,
      });

      return JSON.parse(response.content);
    } catch (error) {
      console.error('Campaign analysis failed:', error);
      throw error;
    }
  }

  /**
   * Suggest optimal send time for a specific audience
   */
  async suggestSendTime(
    userId: string,
    audienceInfo: {
      timezone?: string;
      industry?: string;
      audienceType?: 'b2b' | 'b2c' | 'mixed';
      previousBestTimes?: string[];
    }
  ): Promise<{
    recommendedSlots: TimeSlot[];
    avoidTimes: string[];
    rationale: string;
  }> {
    const router = getRouter();

    const prompt = `Recommend optimal email send times based on this audience.

AUDIENCE INFO:
- Primary Timezone: ${audienceInfo.timezone || 'Mixed US'}
- Industry: ${audienceInfo.industry || 'General'}
- Audience Type: ${audienceInfo.audienceType || 'mixed'}
${audienceInfo.previousBestTimes?.length ? `- Historical Best Times: ${audienceInfo.previousBestTimes.join(', ')}` : ''}

Based on email marketing best practices and audience characteristics:

1. Recommend 3 optimal time slots (ranked by priority)
2. Identify times to avoid
3. Explain the rationale

Consider:
- Work schedules for the audience type
- Industry norms
- Competition for inbox attention
- Mobile vs desktop reading patterns

Respond in this exact JSON format:
{
  "recommendedSlots": [
    { "start": "09:00", "end": "10:00", "priority": 1, "rationale": "..." },
    { "start": "14:00", "end": "15:00", "priority": 2, "rationale": "..." }
  ],
  "avoidTimes": ["Monday morning", "Friday afternoon", "Weekends"],
  "rationale": "Overall explanation of timing strategy"
}`;

    try {
      const response = await router.generate({
        userId,
        prompt,
        taskType: 'analysis',
        routingMode: 'speed',
        maxTokens: 800,
      });

      return JSON.parse(response.content);
    } catch (error) {
      console.error('Send time suggestion failed:', error);
      return {
        recommendedSlots: [
          { start: '09:00', end: '10:00', priority: 1, rationale: 'Morning inbox check' },
          { start: '14:00', end: '15:00', priority: 2, rationale: 'Post-lunch lull' },
        ],
        avoidTimes: ['Monday morning', 'Friday afternoon'],
        rationale: 'Standard recommendations based on general best practices',
      };
    }
  }

  /**
   * Generate A/B test ideas for an email
   */
  async generateABTestIdeas(
    userId: string,
    email: {
      subject: string;
      content: string;
      cta: string;
    }
  ): Promise<ABTestPlan[]> {
    const router = getRouter();

    const prompt = `Generate A/B test ideas for this email.

EMAIL:
Subject: ${email.subject}
Content: ${email.content.substring(0, 500)}...
CTA: ${email.cta}

Generate 3 different A/B tests, one each for:
1. Subject line test
2. Content/layout test
3. CTA test

For each test:
- Create 2 variants
- State the hypothesis
- Define success criteria
- Suggest test duration

Respond in this exact JSON format:
{
  "tests": [
    {
      "testType": "subject",
      "variants": [
        { "name": "Control", "description": "Current subject", "hypothesis": "Baseline" },
        { "name": "Urgency", "description": "Add urgency element", "hypothesis": "Creating urgency will increase open rates by 15%" }
      ],
      "splitRatio": [50, 50],
      "winningCriteria": "open-rate",
      "testDuration": "24-48 hours"
    }
  ]
}`;

    try {
      const response = await router.generate({
        userId,
        prompt,
        taskType: 'analysis',
        routingMode: 'speed',
        maxTokens: 1200,
      });

      const parsed = JSON.parse(response.content);

      return parsed.tests.map((t: any) => ({
        id: uuid(),
        emailId: 'current',
        testType: t.testType,
        variants: t.variants.map((v: any) => ({ ...v, id: uuid() })),
        splitRatio: t.splitRatio,
        winningCriteria: t.winningCriteria,
        testDuration: t.testDuration,
      }));
    } catch (error) {
      console.error('A/B test generation failed:', error);
      return [];
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getGoalContext(goal: CampaignGoal): string {
    const contexts: Record<CampaignGoal, string> = {
      'lead-generation': 'Capture new leads and grow email list',
      'product-launch': 'Launch a new product or feature with maximum impact',
      'nurture-sequence': 'Educate and warm up leads over time',
      'reactivation': 'Re-engage inactive subscribers',
      'onboarding': 'Welcome and activate new customers/subscribers',
      'promotion': 'Drive sales with special offers',
      'event-promotion': 'Fill registrations for an event',
      'content-marketing': 'Build authority through valuable content',
      'customer-retention': 'Keep customers engaged and reduce churn',
      'upsell-cross-sell': 'Increase revenue from existing customers',
      'feedback-collection': 'Gather reviews and testimonials',
      'brand-awareness': 'Increase brand recognition and recall',
    };
    return contexts[goal] || goal;
  }

  private getConstraintsContext(request: StrategyRequest): string {
    const parts: string[] = [];

    if (request.budget) {
      const budgetMap = {
        low: 'Limited budget - focus on efficiency',
        medium: 'Moderate budget - balanced approach',
        high: 'Flexible budget - can invest in premium tactics',
      };
      parts.push(budgetMap[request.budget]);
    }

    if (request.timeline) {
      const timelineMap = {
        urgent: 'Urgent timeline - need quick results',
        standard: 'Standard timeline - 2-4 weeks',
        flexible: 'Flexible timeline - can take time for optimal setup',
      };
      parts.push(timelineMap[request.timeline]);
    }

    if (request.resourceLevel) {
      const resourceMap = {
        solo: 'Solo operator - needs to be manageable by one person',
        'small-team': 'Small team - some collaboration possible',
        'full-team': 'Full team - can handle complex campaigns',
      };
      parts.push(resourceMap[request.resourceLevel]);
    }

    return parts.length > 0 ? parts.join('\n') : 'No specific constraints';
  }
}

// Singleton instance
let strategistInstance: CampaignStrategist | null = null;

export function getCampaignStrategist(): CampaignStrategist {
  if (!strategistInstance) {
    strategistInstance = new CampaignStrategist();
  }
  return strategistInstance;
}
