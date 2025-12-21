import { NextResponse } from 'next/server';
import { calculateDeliverability } from '@/intelligence/DeliverabilityEngine';

export async function GET() {
    try {
        const deliverability = await calculateDeliverability();
        return NextResponse.json(deliverability);
    } catch (error) {
        console.error('Deliverability calculation error:', error);
        return NextResponse.json({ error: 'Failed to calculate deliverability' }, { status: 500 });
    }
}
