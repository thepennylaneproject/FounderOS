import { NextResponse } from "next/server";
import supabase from "@/lib/supabase";

export async function GET() {
  try {
    const { data: domains, error } = await supabase
      .from("email_domains")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(domains || []);
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
      .eq("domain", domain);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting domain:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
