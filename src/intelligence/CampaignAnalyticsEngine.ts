/**
 * Campaign Analytics Engine
 *
 * Purpose: Generate comprehensive campaign performance analytics including:
 * - Basic engagement metrics (opens, clicks, replies, bounces)
 * - Historical comparison (vs. founder's average)
 * - Segment performance breakdown
 * - Open timeline and trends
 * - Actionable recommendations
 *
 * Dependencies:
 * - campaign_sends table (from Phase 0)
 * - email_logs table (existing)
 * - campaigns table (existing)
 * - contacts table (for segment data)
 */

import { query } from '@/lib/db';

export interface CampaignAnalytics {
    campaign_id: string;
    campaign_name: string;

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

    // Comparison to founder's average
    open_rate_vs_avg: number;
    open_rate_vs_avg_label: string;

    // Segment breakdown
    by_segment: Record<
        string,
        {
            recipients: number;
            open_rate: number;
            click_rate: number;
            best_performing: boolean;
        }
    >;

    // Timeline
    time_to_first_open?: string;
    open_timeline: Array<{
        hours_since_send: number;
        cumulative_opens: number;
        open_rate_pct: number;
    }>;

    // Quality alerts
    bounce_rate_alert?: string;
    spam_risk_alert?: string;

    // Recommendations
    recommendations: Array<{
        type: 'subject_line' | 'segment' | 'followup' | 'engagement' | 'send_time';
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
    }>;
}

export interface DashboardAnalytics {
    total_campaigns: number;
    campaigns_sent_in_period: number;
    total_sent: number;
    avg_open_rate: number;
    avg_click_rate: number;
    avg_reply_rate: number;
    best_campaign: CampaignAnalytics | null;
    worst_campaign: CampaignAnalytics | null;
    trend: Array<{
        date: string;
        avg_open_rate: number;
        total_sent: number;
    }>;
    segment_performance: Record<string, { avg_open_rate: number; count: number }>;
}

class CampaignAnalyticsEngine {
    /**
     * Generate detailed analytics for a single campaign
     */
    async generateAnalytics(campaignId: string): Promise<CampaignAnalytics> {
        try {
            // Get campaign
            const campaignRes = await query(
                'SELECT id, name, created_at FROM campaigns WHERE id = $1',
                [campaignId]
            );

            if (!campaignRes.rows || campaignRes.rows.length === 0) {
                throw new Error('Campaign not found');
            }

            const campaign = campaignRes.rows[0];

            // Get all sends for this campaign
            const sendsRes = await query(
                `SELECT id, recipient_id, recipient_email, sent_at FROM campaign_sends
                 WHERE campaign_id = $1`,
                [campaignId]
            );

            const sends = sendsRes.rows || [];

            if (sends.length === 0) {
                return this.emptyAnalytics(campaign.id, campaign.name);
            }

            // Get engagement data from email_logs
            const engagementRes = await query(
                `SELECT campaign_id, contact_id, opened_at, clicked_at, status
                 FROM email_logs
                 WHERE campaign_id = $1`,
                [campaignId]
            );

            const engagements = engagementRes.rows || [];
            const engagementMap = new Map(engagements.map(e => [e.contact_id, e]));

            // Calculate basic metrics
            const opens = engagements.filter(e => e.opened_at).length;
            const clicks = engagements.filter(e => e.clicked_at).length;
            const replies = engagements.filter(e => e.status === 'replied').length;
            const bounces = engagements.filter(e => e.status === 'bounced').length;

            const openRate = sends.length > 0 ? (opens / sends.length) * 100 : 0;
            const clickRate = sends.length > 0 ? (clicks / sends.length) * 100 : 0;
            const replyRate = sends.length > 0 ? (replies / sends.length) * 100 : 0;
            const bounceRate = sends.length > 0 ? (bounces / sends.length) * 100 : 0;

            // Get historical average
            const historicalAvg = await this.getHistoricalOpenRate(campaign.created_at);
            const openRateVsAvg = openRate - historicalAvg;

            // Get segment breakdown
            const segments = await this.getSegmentBreakdown(campaignId, sends, engagementMap);

            // Generate open timeline
            const timeline = await this.generateOpenTimeline(sends, engagements);

            // Get first open time
            const timeToFirstOpen = this.calculateTimeToFirstOpen(sends, engagements);

            // Generate recommendations
            const recommendations = this.generateRecommendations(
                opens,
                clicks,
                replies,
                bounceRate,
                segments,
                openRate,
                historicalAvg
            );

            return {
                campaign_id: campaignId,
                campaign_name: campaign.name,
                recipients_count: sends.length,
                open_count: opens,
                open_rate_pct: parseFloat(openRate.toFixed(1)),
                click_count: clicks,
                click_rate_pct: parseFloat(clickRate.toFixed(1)),
                reply_count: replies,
                reply_rate_pct: parseFloat(replyRate.toFixed(1)),
                bounce_count: bounces,
                bounce_rate_pct: parseFloat(bounceRate.toFixed(1)),
                open_rate_vs_avg: parseFloat(openRateVsAvg.toFixed(1)),
                open_rate_vs_avg_label:
                    openRateVsAvg > 0
                        ? `+${openRateVsAvg.toFixed(1)}% above average`
                        : `${openRateVsAvg.toFixed(1)}% below average`,
                by_segment: segments,
                time_to_first_open: timeToFirstOpen,
                open_timeline: timeline,
                bounce_rate_alert: bounceRate > 5 ? `⚠️ High bounce rate (${bounceRate.toFixed(1)}%)` : undefined,
                recommendations
            };
        } catch (error) {
            console.error('Error generating campaign analytics:', error);
            throw error;
        }
    }

    /**
     * Generate dashboard analytics for a time period
     */
    async generateDashboardAnalytics(daysBack: number = 30): Promise<DashboardAnalytics> {
        try {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - daysBack);

            // Get all campaigns in period
            const campaignRes = await query(
                `SELECT id, name, created_at FROM campaigns
                 WHERE created_at >= $1 AND status = $2
                 ORDER BY created_at DESC`,
                [fromDate.toISOString(), 'completed']
            );

            const campaigns = campaignRes.rows || [];

            if (campaigns.length === 0) {
                return {
                    total_campaigns: 0,
                    campaigns_sent_in_period: 0,
                    total_sent: 0,
                    avg_open_rate: 0,
                    avg_click_rate: 0,
                    avg_reply_rate: 0,
                    best_campaign: null,
                    worst_campaign: null,
                    trend: [],
                    segment_performance: {}
                };
            }

            // Generate analytics for each campaign
            const analytics = await Promise.all(
                campaigns.map(c => this.generateAnalytics(c.id).catch(err => {
                    console.error(`Error generating analytics for campaign ${c.id}:`, err);
                    return null;
                }))
            );

            const validAnalytics = analytics.filter(a => a !== null) as CampaignAnalytics[];

            // Calculate aggregates
            const totalSent = validAnalytics.reduce((sum, a) => sum + a.recipients_count, 0);
            const avgOpenRate =
                validAnalytics.reduce((sum, a) => sum + a.open_rate_pct, 0) / validAnalytics.length;
            const avgClickRate =
                validAnalytics.reduce((sum, a) => sum + a.click_rate_pct, 0) / validAnalytics.length;
            const avgReplyRate =
                validAnalytics.reduce((sum, a) => sum + a.reply_rate_pct, 0) / validAnalytics.length;

            // Best and worst campaigns
            const bestCampaign = validAnalytics.reduce((best, current) =>
                current.open_rate_pct > best.open_rate_pct ? current : best
            );
            const worstCampaign = validAnalytics.reduce((worst, current) =>
                current.open_rate_pct < worst.open_rate_pct ? current : worst
            );

            // Generate daily trend
            const trend = this.generateTrend(validAnalytics);

            // Segment performance
            const segmentPerf = this.aggregateSegmentPerformance(validAnalytics);

            return {
                total_campaigns: campaigns.length,
                campaigns_sent_in_period: validAnalytics.length,
                total_sent: totalSent,
                avg_open_rate: parseFloat(avgOpenRate.toFixed(1)),
                avg_click_rate: parseFloat(avgClickRate.toFixed(1)),
                avg_reply_rate: parseFloat(avgReplyRate.toFixed(1)),
                best_campaign: bestCampaign,
                worst_campaign: worstCampaign,
                trend,
                segment_performance: segmentPerf
            };
        } catch (error) {
            console.error('Error generating dashboard analytics:', error);
            throw error;
        }
    }

    /**
     * Get historical average open rate for comparison
     */
    private async getHistoricalOpenRate(beforeDate: string): Promise<number> {
        try {
            const res = await query(
                `SELECT AVG(
                    CASE WHEN total_sends > 0 THEN (total_opens::numeric / total_sends) * 100 ELSE 0 END
                ) as avg_rate
                FROM (
                    SELECT
                        COUNT(*) as total_sends,
                        COUNT(CASE WHEN el.opened_at IS NOT NULL THEN 1 END) as total_opens
                    FROM campaigns c
                    LEFT JOIN email_logs el ON c.id = el.campaign_id
                    WHERE c.created_at < $1 AND c.status = $2
                ) subquery`,
                [beforeDate, 'completed']
            );

            return parseFloat(res.rows[0]?.avg_rate) || 0;
        } catch (error) {
            console.error('Error getting historical open rate:', error);
            return 0;
        }
    }

    /**
     * Get segment performance breakdown
     */
    private async getSegmentBreakdown(
        campaignId: string,
        sends: any[],
        engagementMap: Map<string, any>
    ): Promise<Record<string, any>> {
        try {
            // Get contact data for segments
            const contactIds = sends.map(s => s.recipient_id).filter(Boolean);
            if (contactIds.length === 0) return {};

            const res = await query(
                `SELECT id, industry FROM contacts WHERE id = ANY($1)`,
                [contactIds]
            );

            const contacts = res.rows || [];
            const contactMap = new Map(contacts.map(c => [c.id, c]));

            // Group by industry/segment
            const bySegment: Record<string, any> = {};

            for (const send of sends) {
                const contact = contactMap.get(send.recipient_id);
                const segment = contact?.industry || 'Unknown';
                const engagement = engagementMap.get(send.recipient_id);

                if (!bySegment[segment]) {
                    bySegment[segment] = {
                        recipients: 0,
                        opens: 0,
                        clicks: 0,
                        replies: 0,
                        open_rate: 0,
                        click_rate: 0
                    };
                }

                bySegment[segment].recipients++;
                if (engagement?.opened_at) bySegment[segment].opens++;
                if (engagement?.clicked_at) bySegment[segment].clicks++;
                if (engagement?.status === 'replied') bySegment[segment].replies++;
            }

            // Calculate rates
            for (const segment in bySegment) {
                const data = bySegment[segment];
                data.open_rate = parseFloat(((data.opens / data.recipients) * 100).toFixed(1));
                data.click_rate = parseFloat(((data.clicks / data.recipients) * 100).toFixed(1));
                data.best_performing = false;
            }

            // Mark best
            if (Object.keys(bySegment).length > 0) {
                const best = Object.entries(bySegment).reduce((prev, current) =>
                    current[1].open_rate > prev[1].open_rate ? current : prev
                );
                best[1].best_performing = true;
            }

            return bySegment;
        } catch (error) {
            console.error('Error getting segment breakdown:', error);
            return {};
        }
    }

    /**
     * Generate open timeline
     */
    private async generateOpenTimeline(sends: any[], engagements: any[]): Promise<any[]> {
        if (sends.length === 0) return [];

        const sentAt = new Date(sends[0].sent_at);
        const timeline: Map<number, number> = new Map();

        for (const engagement of engagements) {
            if (engagement.opened_at) {
                const openedAt = new Date(engagement.opened_at);
                const hoursDiff = Math.floor((openedAt.getTime() - sentAt.getTime()) / (1000 * 60 * 60));
                const cumulativeOpens = (timeline.get(hoursDiff) || 0) + 1;
                timeline.set(hoursDiff, cumulativeOpens);
            }
        }

        // Sort by hours and calculate cumulative
        const sorted = Array.from(timeline.entries())
            .sort((a, b) => a[0] - b[0])
            .slice(0, 48); // Show first 48 hours

        let cumulative = 0;
        return sorted.map(([hours, count]) => {
            cumulative += count;
            return {
                hours_since_send: hours,
                cumulative_opens: cumulative,
                open_rate_pct: parseFloat(((cumulative / sends.length) * 100).toFixed(1))
            };
        });
    }

    /**
     * Calculate time to first open
     */
    private calculateTimeToFirstOpen(sends: any[], engagements: any[]): string | undefined {
        const firstOpen = engagements.find(e => e.opened_at);
        if (!firstOpen || sends.length === 0) return undefined;

        const sentAt = new Date(sends[0].sent_at);
        const openedAt = new Date(firstOpen.opened_at);
        const diffMs = openedAt.getTime() - sentAt.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 60) return `${diffMins}m`;
        const hours = Math.floor(diffMins / 60);
        return `${hours}h`;
    }

    /**
     * Generate actionable recommendations
     */
    private generateRecommendations(
        opens: number,
        clicks: number,
        replies: number,
        bounceRate: number,
        segments: any,
        openRate: number,
        avgOpenRate: number
    ): any[] {
        const recommendations = [];

        // Subject line recommendation
        if (opens === 0) {
            recommendations.push({
                type: 'subject_line',
                title: 'No opens detected',
                description:
                    'Your subject line might not be resonating. Try re-sending with a different angle.',
                priority: 'high'
            });
        } else if (openRate < avgOpenRate * 0.8) {
            recommendations.push({
                type: 'subject_line',
                title: 'Below-average open rate',
                description: `Your open rate (${openRate.toFixed(1)}%) is ${(avgOpenRate - openRate).toFixed(1)}% below your average.`,
                priority: 'medium'
            });
        }

        // Engagement recommendation
        if (opens > 0 && clicks === 0) {
            recommendations.push({
                type: 'followup',
                title: 'Good opens but no clicks',
                description:
                    'Recipients are opening but not engaging. Consider a follow-up email to warm leads.',
                priority: 'medium'
            });
        }

        // Segment recommendation
        const bestSegment = Object.entries(segments).find(
            ([, data]: [string, any]) => data.best_performing
        );
        if (
            bestSegment &&
            ((bestSegment[1] as any).open_rate / openRate > 1.5 || Object.keys(segments).length > 1)
        ) {
            recommendations.push({
                type: 'segment',
                title: `${bestSegment[0]} segment performs best`,
                description: `${bestSegment[0]} has ${((bestSegment[1] as any).open_rate).toFixed(1)}% open rate. Consider targeting more similar contacts.`,
                priority: 'low'
            });
        }

        // Bounce rate recommendation
        if (bounceRate > 5) {
            recommendations.push({
                type: 'engagement',
                title: 'High bounce rate',
                description: `${bounceRate.toFixed(1)}% bounce rate is high. Check email list quality.`,
                priority: 'high'
            });
        }

        return recommendations;
    }

    /**
     * Generate daily trend
     */
    private generateTrend(campaigns: CampaignAnalytics[]): any[] {
        const trendMap: Map<string, { totalSent: number; totalOpens: number }> = new Map();

        for (const campaign of campaigns) {
            // Using creation date as proxy for send date
            const dateStr = campaign.campaign_id.substring(0, 10); // Simplified
            if (!trendMap.has(dateStr)) {
                trendMap.set(dateStr, { totalSent: 0, totalOpens: 0 });
            }
            const trend = trendMap.get(dateStr)!;
            trend.totalSent += campaign.recipients_count;
            trend.totalOpens += campaign.open_count;
        }

        return Array.from(trendMap.entries()).map(([date, data]) => ({
            date,
            avg_open_rate: parseFloat(((data.totalOpens / data.totalSent) * 100).toFixed(1)),
            total_sent: data.totalSent
        }));
    }

    /**
     * Aggregate segment performance across campaigns
     */
    private aggregateSegmentPerformance(campaigns: CampaignAnalytics[]): Record<string, any> {
        const aggregate: Record<string, any> = {};

        for (const campaign of campaigns) {
            for (const [segment, data] of Object.entries(campaign.by_segment)) {
                if (!aggregate[segment]) {
                    aggregate[segment] = { total_rate: 0, count: 0, avg_open_rate: 0 };
                }
                aggregate[segment].total_rate += (data as any).open_rate;
                aggregate[segment].count++;
            }
        }

        for (const segment in aggregate) {
            aggregate[segment].avg_open_rate = parseFloat(
                (aggregate[segment].total_rate / aggregate[segment].count).toFixed(1)
            );
        }

        return aggregate;
    }

    /**
     * Empty analytics for campaign with no sends
     */
    private emptyAnalytics(campaignId: string, campaignName: string): CampaignAnalytics {
        return {
            campaign_id: campaignId,
            campaign_name: campaignName,
            recipients_count: 0,
            open_count: 0,
            open_rate_pct: 0,
            click_count: 0,
            click_rate_pct: 0,
            reply_count: 0,
            reply_rate_pct: 0,
            bounce_count: 0,
            bounce_rate_pct: 0,
            open_rate_vs_avg: 0,
            open_rate_vs_avg_label: 'No data',
            by_segment: {},
            open_timeline: [],
            recommendations: [
                {
                    type: 'engagement',
                    title: 'No sends recorded',
                    description: 'This campaign has not been sent yet.',
                    priority: 'medium'
                }
            ]
        };
    }
}

// Export singleton
export const campaignAnalyticsEngine = new CampaignAnalyticsEngine();
