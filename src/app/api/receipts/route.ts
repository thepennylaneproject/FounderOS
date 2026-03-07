import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');

        let query = supabase.from('receipts').select('*');

        if (category) {
            query = query.eq('category', category);
        }
        if (status) {
            query = query.eq('payment_status', status);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('Error fetching receipts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
