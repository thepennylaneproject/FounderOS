import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { generateStrategicBrief } from '@/intelligence/StrategicBrief';

export async function GET() {
    try {
        const brief = await generateStrategicBrief();
        return NextResponse.json(brief);
    } catch (error) {
        console.error('Strategic brief generation error:', error);
        return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 });
    }
}
