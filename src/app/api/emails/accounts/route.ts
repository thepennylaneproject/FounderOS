import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/emails/accounts - List email accounts
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
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
    const supabase = await createClient();
    
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
