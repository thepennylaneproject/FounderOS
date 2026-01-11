import { NextResponse } from 'next/server';
import { modernCRM } from '@/crm/CustomerRelationshipEngine';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const score = await modernCRM.scoreLead(id);
        return NextResponse.json(score);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
