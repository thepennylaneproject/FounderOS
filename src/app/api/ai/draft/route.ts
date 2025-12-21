import { NextResponse } from 'next/server';
import { assistant } from '@/revenue/ai/FounderAssistant';

export async function POST(request: Request) {
    try {
        const { contactId, intent } = await request.json();

        if (!contactId || !intent) {
            return NextResponse.json({ error: 'Missing contactId or intent' }, { status: 400 });
        }

        const draft = await assistant.generateEmailDraft(contactId, intent);
        return NextResponse.json(draft);
    } catch (error: any) {
        console.error('AI Draft Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
