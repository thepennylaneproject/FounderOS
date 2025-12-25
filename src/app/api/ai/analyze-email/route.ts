/**
 * POST /api/ai/analyze-email
 *
 * Analyze a single email using AI
 * Request body: { emailId: string, senderEmail: string, emailContent: string }
 * Response: EmailInsight with full analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailIntelligenceEngine } from '@/intelligence/EmailIntelligenceEngine';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { emailId, senderEmail, emailContent } = body;

        // Validate required fields
        if (!emailId || !senderEmail || !emailContent) {
            return NextResponse.json(
                { error: 'Missing required fields: emailId, senderEmail, emailContent' },
                { status: 400 }
            );
        }

        // Analyze email
        const insight = await emailIntelligenceEngine.analyzeEmail(
            emailId,
            senderEmail,
            emailContent
        );

        return NextResponse.json({
            success: true,
            insight
        });
    } catch (error) {
        console.error('Error analyzing email:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to analyze email'
            },
            { status: 500 }
        );
    }
}
