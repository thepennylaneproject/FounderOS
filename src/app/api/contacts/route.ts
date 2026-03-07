import { NextRequest, NextResponse } from 'next/server';
import { modernCRM } from '@/crm/CustomerRelationshipEngine';
import { getAuthContext } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    try {
        const auth = getAuthContext(request);
        const contacts = await modernCRM.getAllContacts(auth.organizationId);
        return NextResponse.json(contacts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = getAuthContext(request);
        const body = await request.json();

        // Validate required fields
        if (!body.email) {
            return NextResponse.json(
                { error: 'Email is required to create a contact.' },
                { status: 400 }
            );
        }

        if (!body.first_name || !body.last_name) {
            return NextResponse.json(
                { error: 'First name and last name are required.' },
                { status: 400 }
            );
        }

        const id = await modernCRM.createContact(body, auth.organizationId, auth.userId);
        const contact = await modernCRM.getContact(id, auth.organizationId);
        return NextResponse.json(contact);
    } catch (error: any) {
        // Handle unique constraint violations (duplicate email)
        if (error.message?.includes('duplicate') || error.code === '23505') {
            return NextResponse.json(
                { error: 'This email address is already in your contacts.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to create contact. Please try again.' },
            { status: 500 }
        );
    }
}
