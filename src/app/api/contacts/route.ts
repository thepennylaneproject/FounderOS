import { NextResponse } from 'next/server';
import { modernCRM } from '@/crm/CustomerRelationshipEngine';

export async function GET() {
    try {
        const contacts = await modernCRM.getAllContacts();
        return NextResponse.json(contacts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const id = await modernCRM.createContact(body);
        const contact = await modernCRM.getContact(id);
        return NextResponse.json(contact);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
