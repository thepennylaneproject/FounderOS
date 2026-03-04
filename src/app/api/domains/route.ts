import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET() {
  try {
    const { data: domains, error } = await supabase
      .from("email_domains")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Map the email_domains schema to the format expected by the frontend
    const formattedDomains = (domains || []).map(d => ({
      id: d.id,
      name: d.domain, // Map 'domain' column to 'name' field
      dkim_key: d.dkim_private_key, // Fixed: use dkim_private_key (where DomainManager saves DKIM)
      spf_record: d.spf_record,
      dmarc_policy: d.dmarc_policy,
      daily_limit: d.daily_limit,
      status: d.is_verified ? 'validated' : 'pending_dns',
      created_at: d.created_at,
      updated_at: d.updated_at,
      last_alert_at: null,
      bounce_rate: 0,
      inbox_placement_pct: 100,
      risk_level: 'low'
    }));
    
    return NextResponse.json(formattedDomains);
  } catch (error: any) {
    console.error("Error fetching domains:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const domain = body.domain || body.domain_name;

    if (!domain) {
      return NextResponse.json(
        { error: "Domain name is required" },
        { status: 400 }
      );
    }

    // TODO: Get organization_id from authenticated session
    // For now, we'll allow null organization_id for testing
    const { data, error} = await supabase
      .from("email_domains")
      .insert({
        organization_id: body.organization_id || null,
        domain: domain,
        dkim_private_key: body.dkimKey,
        spf_record: body.spfRecord,
        dmarc_policy: body.dmarcPolicy,
        daily_limit: body.dailyLimit || 50,
        is_verified: false,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error adding domain:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json(
        { error: "Domain name is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("email_domains")
      .delete()
      .eq("domain", domain); // Query by 'domain' column, not 'name'


    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting domain:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
