import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

type Params = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: Params) {
  if (!getCurrentUser()) return unauthorizedResponse();
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.duration_minutes) {
    return NextResponse.json({ error: "Nombre y duración son obligatorios." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .update({
      name: String(body.name).trim(),
      duration_minutes: Number(body.duration_minutes),
      price: body.price === "" || body.price == null ? null : Number(body.price),
      description: body.description?.trim() || null,
      active: Boolean(body.active)
    })
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data });
}
