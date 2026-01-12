import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET() {
    try {
        const { data: domains, error } = await supabase
            .from('domains')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(domains || []);
    } catch (error: any) {
        console.error('Error fetching domains:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const domain = body.domain || body.domain_name;
        
        if (!domain) {
            return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('domains')
            .upsert({
                name: domain,
                dkim_key: body.dkimKey,
                spf_record: body.spfRecord,
                dmarc_policy: body.dmarcPolicy,
                daily_limit: body.dailyLimit || 50,
                status: 'active',
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'name' 
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error adding domain:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
