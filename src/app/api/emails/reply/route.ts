import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/emails/reply - Prepare a reply to an email
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_id, reply_all = false } = await req.json();

    if (!message_id) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Fetch the original message
    const { data: original, error: messageError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('id', message_id)
      .single();

    if (messageError || !original) {
      return NextResponse.json({ error: 'Original message not found' }, { status: 404 });
    }

    // Prepare reply data
    const replyData = {
      to_addresses: [original.from_address],
      cc_addresses: reply_all ? (original.cc_addresses || []) : [],
      subject: original.subject?.startsWith('Re: ')
        ? original.subject
        : `Re: ${original.subject}`,
      in_reply_to: original.message_id,
      thread_id: original.thread_id,
      
      // Generate quoted reply text
      quoted_html: generateQuotedReply(original),
      quoted_text: generateQuotedReplyText(original),
      
      // Original message metadata
      original_message: {
        id: original.id,
        from: original.from_address,
        date: original.received_at || original.sent_at,
        subject: original.subject,
      },
    };

    return NextResponse.json(replyData);
  } catch (error: any) {
    console.error('Error preparing reply:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateQuotedReply(message: any): string {
  const date = new Date(message.received_at || message.sent_at).toLocaleString();
  const from = message.from_address;
  
  return `
    <br><br>
    <div style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 5px; color: #666;">
      <p><strong>On ${date}, ${from} wrote:</strong></p>
      ${message.body_html || message.body_text?.replace(/\n/g, '<br>') || ''}
    </div>
  `;
}

function generateQuotedReplyText(message: any): string {
  const date = new Date(message.received_at || message.sent_at).toLocaleString();
  const from = message.from_address;
  
  const lines = (message.body_text || '').split('\n');
  const quotedLines = lines.map(line => `> ${line}`).join('\n');
  
  return `\n\nOn ${date}, ${from} wrote:\n${quotedLines}`;
}
