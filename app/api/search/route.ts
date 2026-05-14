import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ clients: [] });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*, appointments(*, clients(*), services(*), hairdressers(*))")
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}
