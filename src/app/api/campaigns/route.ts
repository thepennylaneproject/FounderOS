import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getAuthContext } from '@/lib/apiAuth';
import { createCampaignSchema } from '@/lib/validationSchemas';

export async function GET(request: NextRequest) {
    try {
        const auth = getAuthContext(request);

        const { data: campaigns, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('organization_id', auth.organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(campaigns || []);
    } catch (error: any) {
        console.error('Error fetching campaigns:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = getAuthContext(request);
        const body = await request.json();

        // Validate input with Zod schema
        const validated = createCampaignSchema.parse(body);

        const { data, error } = await supabase
            .from('campaigns')
            .insert({
                organization_id: auth.organizationId,
                created_by: auth.userId,
                name: validated.name,
                type: validated.type,
                status: validated.status,
                template_id: validated.template_id,
                subject: validated.subject,
                body: validated.body,
                target_segments: validated.target_segments,
                scheduled_at: validated.scheduled_at
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        // Check if it's a Zod validation error
        if (error.name === 'ZodError') {
            const formattedErrors = error.errors.map((err: any) => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            return NextResponse.json(
                { error: 'Validation failed', details: formattedErrors },
                { status: 400 }
            );
        }

        console.error('Error creating campaign:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
