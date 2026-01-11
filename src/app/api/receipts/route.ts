import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');

        const filters: string[] = [];
        const params: any[] = [];

        if (category) {
            params.push(category);
            filters.push(`category = $${params.length}`);
        }
        if (status) {
            params.push(status);
            filters.push(`payment_status = $${params.length}`);
        }

        const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const res = await query(
            `SELECT * FROM receipts ${where} ORDER BY date DESC`,
            params
        );

        return NextResponse.json(res.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
