import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import supabase from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        const headers = [
            'vendor_name',
            'amount',
            'currency',
            'date',
            'category',
            'payment_status',
            'transaction_reference',
            'thread_id'
        ];

        const rows = (data || []).map((r: any) => [
            r.vendor_name,
            r.amount,
            r.currency,
            r.date,
            r.category,
            r.payment_status,
            r.transaction_reference || '',
            r.thread_id
        ]);

        const csv = [headers.join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="founderos-receipts.csv"'
            }
        });
    } catch (error: any) {
        console.error('Error exporting receipts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function csvEscape(value: any) {
    const str = `${value}`;
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
