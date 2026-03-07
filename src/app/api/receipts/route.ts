import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');

        const params: any[] = [];
        const conditions: string[] = [];

        if (category) {
            params.push(category);
            conditions.push(`category = $${params.length}`);
        }
        if (status) {
            params.push(status);
            conditions.push(`payment_status = $${params.length}`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await query(
            `SELECT * FROM receipts ${where} ORDER BY date DESC`,
            params
        );

        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('Error fetching receipts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
