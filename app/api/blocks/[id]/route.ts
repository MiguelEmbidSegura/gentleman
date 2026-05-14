import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  if (!getCurrentUser()) return unauthorizedResponse();
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.block_type || !body?.start_date || !body?.end_date) {
    return NextResponse.json({ error: "Título, tipo y fechas son obligatorios." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .update({
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
      visible_to_clients: Boolean(body.visible_to_clients)
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ block: data });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!getCurrentUser()) return unauthorizedResponse();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
