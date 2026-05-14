import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { INITIAL_SERVICES } from "@/lib/schedule";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const publicOnly = new URL(request.url).searchParams.get("public") === "1";
  const supabase = getSupabaseAdmin();
  let query = supabase.from("services").select("*").order("name", { ascending: true });
  if (publicOnly) query = query.eq("active", true);
  if (!publicOnly && !getCurrentUser()) return unauthorizedResponse();

  const { data, error } = await query;
  if (error) {
    if (publicOnly) return NextResponse.json({ services: INITIAL_SERVICES.filter((service) => service.active) });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ services: data?.length ? data : INITIAL_SERVICES });
}

export async function POST(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.duration_minutes) {
    return NextResponse.json({ error: "Nombre y duración son obligatorios." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("services")
    .insert({
      name: String(body.name).trim(),
      duration_minutes: Number(body.duration_minutes),
      price: body.price === "" || body.price == null ? null : Number(body.price),
      description: body.description?.trim() || null,
      active: body.active ?? true
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ service: data }, { status: 201 });
}
