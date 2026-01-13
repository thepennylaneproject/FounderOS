import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('rules')
            .select('*')
            .order('priority', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('Error fetching rules:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        const { data, error } = await supabase
            .from('rules')
            .insert({
                enabled: body.enabled ?? true,
                priority: body.priority ?? 100,
                match: body.match || {},
                action: body.action || {},
                reason_template: body.reason_template || 'Routed because: rule match'
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating rule:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        if (!body.id) {
            return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('rules')
            .update({
                enabled: body.enabled ?? true,
                priority: body.priority ?? 100,
                match: body.match || {},
                action: body.action || {},
                reason_template: body.reason_template || 'Routed because: rule match'
            })
            .eq('id', body.id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error updating rule:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
