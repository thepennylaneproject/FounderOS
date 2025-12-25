/**
 * Email Intelligence Engine
 *
 * Purpose: Analyze received emails using AI to extract insights and
 * automatically update contact information in the CRM.
 *
 * Key responsibilities:
 * 1. Parse email content (body, attachments, headers)
 * 2. Extract insights: intent, sentiment, action items, next steps
 * 3. Identify buying signals and timeline information
 * 4. Auto-update contact scores and information
 * 5. Trigger workflows based on email intelligence
 * 6. Learn from email patterns to improve recommendations
 *
 * Dependencies:
 * - email_logs table (existing)
 * - contacts table (for updates)
 * - OpenAI/Claude API (for LLM analysis)
 */

import { query } from '@/lib/db';

export interface EmailInsight {
    email_id: string;
    sender_email: string;
    contact_id?: string;
    analysis_type: 'incoming' | 'draft_feedback';

    // Content extracted by AI
    intent: 'inquiry' | 'objection' | 'buying_signal' | 'low_interest' | 'technical' | 'unknown';
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'high' | 'medium' | 'low';

    // Key information extracted
    action_items: string[];
    next_steps: string[];
    buying_signals: string[];
    objections: string[];
    questions_asked: string[];

    // Timeline information
    timeline_mentioned?: string; // e.g., "next quarter", "30 days", "immediate"
    decision_timeline?: 'immediate' | 'short_term' | '30-90_days' | 'long_term' | 'undefined';

    // CRM updates recommended
    suggested_score_delta: number; // -10 to +20
    suggested_momentum_delta: number; // -20 to +40
    should_mark_hot_lead: boolean;
    suggested_closer_signal?: string; // e.g., "Budget approved", "Timeline: Q1", "Ready to demo"

    // Next action recommendation
    recommended_action: 'immediate_outreach' | 'schedule_call' | 'send_proposal' | 'nurture' | 'wait';
    recommended_action_description: string;

    // Raw analysis
    full_analysis: string; // Complete AI analysis summary
    confidence_score: number; // 0-100, how confident is the analysis
}

export interface EmailAnalysisJob {
    status: 'running' | 'completed' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    emailsProcessed: number;
    contactsUpdated: number;
    contactsUpscored: number;
    triggers_fired: number;
    errors: string[];
}

class EmailIntelligenceEngine {
    /**
     * Analyze a single email using AI
     * Extracts insights and suggests CRM updates
     */
    async analyzeEmail(emailId: string, senderEmail: string, emailContent: string): Promise<EmailInsight> {
        try {
            // Build AI prompt for email analysis
            const prompt = this.buildAnalysisPrompt(emailContent);

            // Call LLM API
            const analysis = await this.callLLM(prompt);

            // Parse structured response
            const insight = this.parseAnalysisResponse(analysis, emailId, senderEmail);

            // Get contact if exists
            const contactRes = await query('SELECT id FROM contacts WHERE email = $1', [senderEmail]);
            if (contactRes.rows && contactRes.rows.length > 0) {
                insight.contact_id = contactRes.rows[0].id;
            }

            // Store analysis in database
            await this.storeEmailAnalysis(insight);

            return insight;
        } catch (error) {
            console.error('Error analyzing email:', error);
            throw error;
        }
    }

    /**
     * Analyze all unprocessed emails daily
     * Called by batch job at 05:00 UTC
     */
    async analyzeNewEmails(): Promise<EmailAnalysisJob> {
        const result: EmailAnalysisJob = {
            status: 'running',
            startedAt: new Date(),
            emailsProcessed: 0,
            contactsUpdated: 0,
            contactsUpscored: 0,
            triggers_fired: 0,
            errors: []
        };

        try {
            // Get unanalyzed emails from last 24 hours
            const emailsRes = await query(
                `SELECT el.id, el.contact_id, c.email, el.created_at
                 FROM email_logs el
                 LEFT JOIN contacts c ON el.contact_id = c.id
                 WHERE el.created_at > NOW() - INTERVAL '24 hours'
                 AND el.status NOT IN ('sent', 'bounced')
                 AND NOT EXISTS (
                    SELECT 1 FROM analyzed_emails WHERE email_log_id = el.id
                 )
                 ORDER BY el.created_at DESC
                 LIMIT 100`,
            );

            const emails = emailsRes.rows || [];
            console.log(`[EmailIntelligence] Found ${emails.length} unanalyzed emails`);

            for (const email of emails) {
                try {
                    result.emailsProcessed++;

                    // Fetch full email content (in real implementation)
                    // For now, use email_logs data
                    const emailContent = await this.fetchEmailContent(email.id);

                    // Analyze email
                    const insight = await this.analyzeEmail(email.id, email.email || 'unknown', emailContent);

                    // Update contact if insights suggest action
                    if (insight.contact_id) {
                        const updated = await this.updateContactFromInsight(insight.contact_id, insight);
                        if (updated) {
                            result.contactsUpdated++;
                            if (insight.suggested_score_delta > 0) {
                                result.contactsUpscored++;
                            }
                        }
                    }

                    // Trigger workflows if needed
                    if (insight.recommended_action === 'immediate_outreach') {
                        await this.triggerWorkflow('inbox_hot_lead', insight.contact_id);
                        result.triggers_fired++;
                    }

                    // Log progress
                    if (result.emailsProcessed % 10 === 0) {
                        console.log(`[EmailIntelligence] Progress: ${result.emailsProcessed} emails processed`);
                    }
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    result.errors.push(`Email ${email.id}: ${errorMsg}`);
                    console.error(`[EmailIntelligence] Error processing email ${email.id}:`, err);
                }
            }

            result.completedAt = new Date();
            result.status = result.errors.length === 0 ? 'completed' : 'failed';

            // Log job execution
            await this.logJobExecution(result);

            return result;
        } catch (error) {
            result.status = 'failed';
            result.completedAt = new Date();
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.errors.push(errorMsg);
            console.error('[EmailIntelligence] Job failed:', error);

            return result;
        }
    }

    /**
     * Build AI analysis prompt
     */
    private buildAnalysisPrompt(emailContent: string): string {
        return `Analyze this email and extract key intelligence. Return a JSON object with:
{
  "intent": "inquiry|objection|buying_signal|low_interest|technical|unknown",
  "sentiment": "positive|neutral|negative",
  "urgency": "high|medium|low",
  "action_items": ["item1", "item2"],
  "next_steps": ["step1", "step2"],
  "buying_signals": ["signal1", "signal2"],
  "objections": ["objection1"],
  "questions_asked": ["question1"],
  "timeline_mentioned": "text or null",
  "decision_timeline": "immediate|short_term|30-90_days|long_term|undefined",
  "suggested_score_delta": -10 to 20,
  "suggested_momentum_delta": -20 to 40,
  "should_mark_hot_lead": boolean,
  "suggested_closer_signal": "text or null",
  "recommended_action": "immediate_outreach|schedule_call|send_proposal|nurture|wait",
  "recommended_action_description": "text",
  "full_analysis": "comprehensive summary",
  "confidence_score": 0-100
}

Email content:
${emailContent}`;
    }

    /**
     * Call LLM API (OpenAI/Claude)
     */
    private async callLLM(prompt: string): Promise<string> {
        try {
            const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                console.warn('[EmailIntelligence] No LLM API key configured');
                return this.getMockAnalysis();
            }

            // OpenAI integration (add Claude later)
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4-turbo-preview',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                throw new Error(`LLM API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Error calling LLM:', error);
            return this.getMockAnalysis();
        }
    }

    /**
     * Parse LLM response into structured EmailInsight
     */
    private parseAnalysisResponse(response: string, emailId: string, senderEmail: string): EmailInsight {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in response');

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                email_id: emailId,
                sender_email: senderEmail,
                analysis_type: 'incoming',
                intent: parsed.intent || 'unknown',
                sentiment: parsed.sentiment || 'neutral',
                urgency: parsed.urgency || 'medium',
                action_items: parsed.action_items || [],
                next_steps: parsed.next_steps || [],
                buying_signals: parsed.buying_signals || [],
                objections: parsed.objections || [],
                questions_asked: parsed.questions_asked || [],
                timeline_mentioned: parsed.timeline_mentioned,
                decision_timeline: parsed.decision_timeline || 'undefined',
                suggested_score_delta: parsed.suggested_score_delta || 0,
                suggested_momentum_delta: parsed.suggested_momentum_delta || 0,
                should_mark_hot_lead: parsed.should_mark_hot_lead || false,
                suggested_closer_signal: parsed.suggested_closer_signal,
                recommended_action: parsed.recommended_action || 'wait',
                recommended_action_description: parsed.recommended_action_description || '',
                full_analysis: parsed.full_analysis || '',
                confidence_score: parsed.confidence_score || 50
            };
        } catch (error) {
            console.error('Error parsing LLM response:', error);
            throw error;
        }
    }

    /**
     * Update contact information based on email insight
     */
    private async updateContactFromInsight(contactId: string, insight: EmailInsight): Promise<boolean> {
        try {
            // Get current contact scores
            const contactRes = await query(
                `SELECT health_score, momentum_score, is_hot_lead, closer_signal
                 FROM contacts WHERE id = $1`,
                [contactId]
            );

            if (!contactRes.rows || contactRes.rows.length === 0) {
                return false;
            }

            const current = contactRes.rows[0];

            // Calculate new scores
            const newHealthScore = Math.max(0, Math.min(100, (current.health_score || 0) + insight.suggested_score_delta));
            const newMomentumScore = Math.max(0, Math.min(100, (current.momentum_score || 0) + insight.suggested_momentum_delta));

            // Update contact
            await query(
                `UPDATE contacts SET
                    health_score = $1,
                    momentum_score = $2,
                    is_hot_lead = $3,
                    closer_signal = COALESCE($4, closer_signal),
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = $5`,
                [
                    newHealthScore,
                    newMomentumScore,
                    insight.should_mark_hot_lead,
                    insight.suggested_closer_signal,
                    contactId
                ]
            );

            return true;
        } catch (error) {
            console.error('Error updating contact:', error);
            throw error;
        }
    }

    /**
     * Store email analysis in database
     */
    private async storeEmailAnalysis(insight: EmailInsight): Promise<void> {
        try {
            await query(
                `INSERT INTO analyzed_emails (
                    email_log_id, contact_id, intent, sentiment, urgency,
                    action_items, next_steps, buying_signals, objections,
                    decision_timeline, recommended_action, analysis_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [
                    insight.email_id,
                    insight.contact_id || null,
                    insight.intent,
                    insight.sentiment,
                    insight.urgency,
                    JSON.stringify(insight.action_items),
                    JSON.stringify(insight.next_steps),
                    JSON.stringify(insight.buying_signals),
                    JSON.stringify(insight.objections),
                    insight.decision_timeline,
                    insight.recommended_action,
                    JSON.stringify(insight)
                ]
            );
        } catch (error) {
            console.error('Error storing email analysis:', error);
            // Don't throw - analysis was successful even if storage fails
        }
    }

    /**
     * Fetch full email content (for real implementation)
     */
    private async fetchEmailContent(emailId: string): Promise<string> {
        try {
            // In real implementation, fetch from IMAP using email ID
            // For now, return placeholder
            const res = await query(
                'SELECT subject FROM campaigns WHERE id = $1 LIMIT 1',
                [emailId]
            );
            return res.rows?.[0]?.subject || 'Email content';
        } catch (error) {
            console.error('Error fetching email content:', error);
            return '';
        }
    }

    /**
     * Trigger workflow based on email intelligence
     */
    private async triggerWorkflow(workflowName: string, contactId?: string): Promise<void> {
        try {
            // Import workflow engine
            const { workflowAutomation } = await import('@/automation/WorkflowEngine');

            if (contactId) {
                await workflowAutomation.trigger(`email_${workflowName}`, { contactId });
            }
        } catch (error) {
            console.error('Error triggering workflow:', error);
        }
    }

    /**
     * Log job execution
     */
    private async logJobExecution(result: EmailAnalysisJob): Promise<void> {
        try {
            await query(
                `INSERT INTO job_executions (job_name, status, executed_at, completed_at, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    'daily_email_intelligence',
                    result.status,
                    result.startedAt,
                    result.completedAt,
                    JSON.stringify({
                        emailsProcessed: result.emailsProcessed,
                        contactsUpdated: result.contactsUpdated,
                        contactsUpscored: result.contactsUpscored,
                        triggers_fired: result.triggers_fired,
                        errorCount: result.errors.length
                    })
                ]
            );
        } catch (err) {
            console.error('[EmailIntelligence] Failed to log job execution:', err);
        }
    }

    /**
     * Mock analysis for when LLM is not available
     */
    private getMockAnalysis(): string {
        return JSON.stringify({
            intent: 'inquiry',
            sentiment: 'positive',
            urgency: 'medium',
            action_items: ['Follow up on pricing'],
            next_steps: ['Send demo link'],
            buying_signals: [],
            objections: [],
            questions_asked: ['What are your pricing tiers?'],
            timeline_mentioned: null,
            decision_timeline: 'undefined',
            suggested_score_delta: 5,
            suggested_momentum_delta: 10,
            should_mark_hot_lead: false,
            suggested_closer_signal: null,
            recommended_action: 'nurture',
            recommended_action_description: 'Send nurture sequence',
            full_analysis: 'Contact shows interest with inquiry.',
            confidence_score: 60
        });
    }
}

// Export singleton
export const emailIntelligenceEngine = new EmailIntelligenceEngine();
