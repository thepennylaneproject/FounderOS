import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const res = await query('SELECT * FROM rules ORDER BY priority ASC');
        return NextResponse.json(res.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const res = await query(
            `INSERT INTO rules (enabled, priority, match, action, reason_template)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                body.enabled ?? true,
                body.priority ?? 100,
                body.match || {},
                body.action || {},
                body.reason_template || 'Routed because: rule match'
            ]
        );
        return NextResponse.json(res.rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        if (!body.id) {
            return NextResponse.json({ error: 'Missing rule id' }, { status: 400 });
        }
        const res = await query(
            `UPDATE rules
             SET enabled = $1, priority = $2, match = $3, action = $4, reason_template = $5
             WHERE id = $6
             RETURNING *`,
            [
                body.enabled ?? true,
                body.priority ?? 100,
                body.match || {},
                body.action || {},
                body.reason_template || 'Routed because: rule match',
                body.id
            ]
        );
        return NextResponse.json(res.rows[0]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
