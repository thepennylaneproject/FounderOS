import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(
    request: Request,
    { params }: { params: { threadId: string } }
) {
    try {
        const { lane } = await request.json();
        if (!lane) {
            return NextResponse.json({ error: 'Missing lane' }, { status: 400 });
        }

        const { error } = await supabase
            .from('thread_states')
            .update({
                lane,
                user_overridden: true,
                reason: 'User override',
                updated_at: new Date().toISOString()
            })
            .eq('thread_id', params.threadId);

        if (error) throw error;
        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        console.error('Error updating lane:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
