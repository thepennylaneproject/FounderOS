import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const res = await query('SELECT * FROM receipts ORDER BY date DESC');
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

        const rows = res.rows.map((r: any) => [
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
