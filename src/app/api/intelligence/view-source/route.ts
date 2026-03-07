import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateViewSourceReport } from '@/intelligence/ViewSourceEngine';

/**
 * GET /api/intelligence/view-source
 *
 * Generates a structured, investor-grade intelligence profile of FounderOS
 * by querying live operational data and synthesising it into a 10-section
 * View Source report.
 *
 * Response: ViewSourceReport (see ViewSourceEngine.ts for type definition)
 */
export async function GET() {
    try {
        const report = await generateViewSourceReport();
        return NextResponse.json(report);
    } catch (error) {
        console.error('View Source report generation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate View Source report',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
