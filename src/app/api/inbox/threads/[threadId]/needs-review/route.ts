import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(
    request: Request,
    { params }: { params: { threadId: string } }
) {
    try {
        const { needs_review } = await request.json();
        
        const { error } = await supabase
            .from('thread_states')
            .update({
                needs_review: !!needs_review,
                user_overridden: true,
                updated_at: new Date().toISOString()
            })
            .eq('thread_id', params.threadId);

        if (error) throw error;
        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        console.error('Error updating needs_review:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
