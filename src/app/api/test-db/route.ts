import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        return NextResponse.json({
            status: 'success',
            tables: result.rows.map(r => r.table_name)
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message
        }, { status: 500 });
    }
}
