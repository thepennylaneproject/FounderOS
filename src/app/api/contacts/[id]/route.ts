import { NextResponse } from 'next/server';
import { modernCRM } from '@/crm/CustomerRelationshipEngine';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const contact = await modernCRM.getContact(params.id);
        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }
        return NextResponse.json(contact);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const contact = await modernCRM.updateContact(params.id, body);
        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }
        return NextResponse.json(contact);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await modernCRM.deleteContact(params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
