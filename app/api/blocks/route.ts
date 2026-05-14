import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const supabase = getSupabaseAdmin();

  let query = supabase.from("schedule_blocks").select("*").order("start_date", { ascending: true });
  if (from) query = query.gte("end_date", from);
  if (to) query = query.lte("start_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blocks: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.block_type || !body?.start_date || !body?.end_date) {
    return NextResponse.json({ error: "Título, tipo y fechas son obligatorios." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .insert({
      title: body.title.trim(),
      block_type: body.block_type,
      hairdresser_id: body.affects_all_hairdressers ? null : body.hairdresser_id,
      affects_all_hairdressers: Boolean(body.affects_all_hairdressers),
      start_date: body.start_date,
      end_date: body.end_date,
      start_time: body.all_day ? null : body.start_time,
      end_time: body.all_day ? null : body.end_time,
      all_day: Boolean(body.all_day),
      internal_reason: body.internal_reason?.trim() || null,
      visible_to_clients: Boolean(body.visible_to_clients),
      created_by: null
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ block: data }, { status: 201 });
}
