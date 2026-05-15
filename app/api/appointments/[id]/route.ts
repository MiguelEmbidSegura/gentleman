import { NextRequest, NextResponse } from "next/server";
import { canCreateAppointment } from "@/lib/availability";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { normalizeSpanishPhone } from "@/lib/date";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AppointmentInput } from "@/lib/types";

type Params = { params: { id: string } };

async function upsertClient(input: AppointmentInput) {
  const supabase = getSupabaseAdmin();
  if (input.client_id) {
    const { data, error } = await supabase
      .from("clients")
      .update({
        name: input.client_name.trim(),
        phone: input.client_phone ? normalizeSpanishPhone(input.client_phone) : "",
        email: input.client_email?.trim() || null
      })
      .eq("id", input.client_id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.client_name.trim(),
      phone: input.client_phone ? normalizeSpanishPhone(input.client_phone) : "",
      email: input.client_email?.trim() || null,
      notes: null
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!getCurrentUser()) return unauthorizedResponse();

  const input = await request.json().catch(() => null) as AppointmentInput | null;
  if (!input) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existingAppointments, error: listError } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", input.date)
    .eq("hairdresser_id", input.hairdresser_id);

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  const { data: blocks, error: blocksError } = await supabase
    .from("schedule_blocks")
    .select("*")
    .lte("start_date", input.date)
    .gte("end_date", input.date);

  if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 });

  const availability = canCreateAppointment({ ...input, id: params.id }, existingAppointments ?? [], blocks ?? [], { disallowPast: true });
  if (!availability.ok) return NextResponse.json({ error: availability.reason }, { status: 400 });

  try {
    const client = await upsertClient(input);
    const { data, error } = await supabase
      .from("appointments")
      .update({
        client_id: client.id,
        hairdresser_id: input.hairdresser_id,
        service_id: input.service_id,
        date: input.date,
        start_time: input.start_time,
        duration_minutes: input.duration_minutes,
        status: input.status ?? "confirmed",
        notes: input.notes?.trim() || null,
        delay_minutes: input.delay_minutes ?? 0,
        source: input.source ?? "admin",
        created_by: null
      })
      .eq("id", params.id)
      .select("*, clients(*), services(*), hairdressers(*)")
      .single();

    if (error) throw error;
    return NextResponse.json({ appointment: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al guardar la cita." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  if (!getCurrentUser()) return unauthorizedResponse();

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("appointments").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
