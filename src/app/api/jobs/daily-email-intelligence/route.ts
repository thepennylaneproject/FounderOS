/**
 * POST /api/jobs/daily-email-intelligence
 *
 * Manual trigger for daily email intelligence analysis job
 * Processes all unanalyzed emails from the last 24 hours
 */

import { NextRequest, NextResponse } from 'next/server';
import { emailIntelligenceEngine } from '@/intelligence/EmailIntelligenceEngine';

export async function POST(request: NextRequest) {
    try {
        // Run the daily email analysis job
        const result = await emailIntelligenceEngine.analyzeNewEmails();

        return NextResponse.json({
            success: true,
            result
        });
    } catch (error) {
        console.error('Error running email intelligence job:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to run email intelligence job'
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({
            success: true,
            message: 'Daily email intelligence job',
            schedule: 'Runs at 05:00 UTC daily',
            manual_trigger: 'POST /api/jobs/daily-email-intelligence'
        });
    } catch (error) {
        console.error('Error checking job status:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to check job status'
            },
            { status: 500 }
        );
    }
}
