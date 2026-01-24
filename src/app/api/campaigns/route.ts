import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { getAuthContext } from '@/lib/apiAuth';

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

        const { data, error } = await supabase
            .from('campaigns')
            .insert({
                organization_id: auth.organizationId,
                created_by: auth.userId,
                name: body.name,
                type: body.type || 'marketing',
                status: body.status || 'draft',
                template_id: body.template_id,
                subject: body.subject,
                body: body.body,
                target_segments: body.target_segments,
                scheduled_at: body.scheduled_at
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating campaign:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
