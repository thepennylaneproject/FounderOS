import { NextResponse } from 'next/server';
import { calculateMomentum } from '@/intelligence/MomentumEngine';

export async function GET() {
    try {
        const momentum = await calculateMomentum();
        return NextResponse.json(momentum);
    } catch (error) {
        console.error('Momentum calculation error:', error);
        return NextResponse.json({ error: 'Failed to calculate momentum' }, { status: 500 });
    }
}
