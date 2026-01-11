import { NextResponse } from 'next/server';
import { modernCRM } from '@/crm/CustomerRelationshipEngine';

export async function POST() {
    try {
        const contacts = await modernCRM.getAllContacts();
        const results = [];

        for (const contact of contacts) {
            const score = await modernCRM.scoreLead(contact.id);
            results.push({ id: contact.id, email: contact.email, score });
        }

        return NextResponse.json({ status: 'completed', results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
