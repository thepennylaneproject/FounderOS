import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/emails/accounts - List email accounts
export async function GET(req: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select(`
        *,
        email_domains (
          domain,
          is_verified,
          reputation_score
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Error fetching email accounts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/emails/accounts - Create email account
export async function POST(req: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      email_address,
      display_name,
      domain_id,
      signature,
    } = await req.json();

    if (!email_address || !domain_id) {
      return NextResponse.json({ 
        error: 'Email address and domain ID required' 
      }, { status: 400 });
    }

    const { data: account, error } = await supabase
      .from('email_accounts')
      .insert({
        email_address,
        display_name,
        domain_id,
        signature,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('Error creating email account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/emails/accounts - Update email account
export async function PATCH(req: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, display_name, signature, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ 
        error: 'Account ID required' 
      }, { status: 400 });
    }

    const updateData: any = {};
    if (display_name !== undefined) updateData.display_name = display_name;
    if (signature !== undefined) updateData.signature = signature;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: account, error } = await supabase
      .from('email_accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(account);
  } catch (error: any) {
    console.error('Error updating email account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/emails/accounts - Delete email account
export async function DELETE(req: NextRequest) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'Account ID required' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting email account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
