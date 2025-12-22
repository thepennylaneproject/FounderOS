/**
 * GET /api/contacts/triage
 * GET /api/contacts/triage?tier=hot_lead
 * POST /api/contacts/triage/run
 *
 * Endpoints for contact triage management
 *
 * GET: Retrieve triaged contacts with filtering
 * POST /run: Run full triage on all contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { contactTriageEngine } from '@/intelligence/ContactTriageEngine';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tier = searchParams.get('tier') as any;
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const { contacts, total } = await contactTriageEngine.getTriagedContacts(tier, limit, offset);

        return NextResponse.json({
            success: true,
            count: contacts.length,
            total,
            tier: tier || 'all',
            limit,
            offset,
            contacts
        });
    } catch (error) {
        console.error('Error fetching triaged contacts:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch triaged contacts'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        if (searchParams.get('action') === 'run') {
            // Run full triage
            const result = await contactTriageEngine.triageAllContacts();

            return NextResponse.json({
                success: true,
                message: 'Triage completed',
                results: {
                    processed: result.processed,
                    updated: result.updated,
                    errors: result.errors.length,
                    errorDetails: result.errors.slice(0, 10) // Return first 10 errors
                }
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Error running triage:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to run triage'
            },
            { status: 500 }
        );
    }
}
