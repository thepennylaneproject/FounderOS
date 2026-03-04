import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/emails/drafts - List all drafts
export async function GET(req: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: drafts, error } = await supabase
      .from('email_messages')
      .select('*')
      .eq('folder', 'drafts')
      .eq('status', 'draft')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(drafts);
  } catch (error: any) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/emails/drafts - Create or update draft
export async function POST(req: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      id, 
      account_id, 
      from_address, 
      to_addresses, 
      cc_addresses, 
      bcc_addresses, 
      subject, 
      body_html, 
      body_text,
      in_reply_to,
      attachments 
    } = body;

    let draft;
    if (id) {
      // Update existing draft
      const { data, error } = await supabase
        .from('email_messages')
        .update({
          from_address,
          to_addresses,
          cc_addresses,
          bcc_addresses,
          subject,
          body_html,
          body_text,
          attachments,
          in_reply_to,
        })
        .eq('id', id)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;
      draft = data;
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('email_messages')
        .insert({
          account_id,
          from_address,
          to_addresses,
          cc_addresses,
          bcc_addresses,
          subject,
          body_html,
          body_text,
          attachments,
          in_reply_to,
          status: 'draft',
          folder: 'drafts',
          is_starred: false,
          is_read: true,
        })
        .select()
        .single();

      if (error) throw error;
      draft = data;
    }

    return NextResponse.json(draft);
  } catch (error: any) {
    console.error('Error saving draft:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/emails/drafts/:id
export async function DELETE(req: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Draft ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('email_messages')
      .delete()
      .eq('id', id)
      .eq('status', 'draft');

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
