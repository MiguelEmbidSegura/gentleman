import { NextRequest, NextResponse } from "next/server";
import { canCreateAppointment } from "@/lib/availability";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { normalizeSpanishPhone } from "@/lib/date";
import { HAIRDRESSERS } from "@/lib/schedule";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { AppointmentInput, AppointmentStatus } from "@/lib/types";

const validDurations = new Set([15, 30, 45, 60, 90, 120]);
const validStatuses = new Set<AppointmentStatus>(["pending_payment", "confirmed", "cancelled", "expired", "completed", "no_show"]);

async function findOrCreateClient(input: AppointmentInput) {
  const supabase = getSupabaseAdmin();
  const phone = input.client_phone ? normalizeSpanishPhone(input.client_phone) : "";
  const name = input.client_name.trim();

  if (phone) {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    if (data) {
      const { data: updated, error } = await supabase
        .from("clients")
        .update({ name, phone })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return updated;
    }
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ name, phone, notes: null })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

function validateInput(input: AppointmentInput): string | null {
  if (!input.client_name?.trim()) return "El cliente es obligatorio.";
  if (!HAIRDRESSERS.some((hairdresser) => hairdresser.id === input.hairdresser_id)) return "Peluquero no válido.";
  if (!input.service_id) return "El servicio es obligatorio.";
  if (!input.date) return "La fecha es obligatoria.";
  if (!/^\d{2}:\d{2}$/.test(input.start_time)) return "La hora no es válida.";
  if (!validDurations.has(input.duration_minutes)) return "La duración no es válida.";
  if (input.status && !validStatuses.has(input.status)) return "El estado no es válido.";
  return null;
}

export async function GET(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("appointments")
    .select("*, clients(*), services(*), hairdressers(*)")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (date) query = query.eq("date", date);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();

  const input = await request.json().catch(() => null) as AppointmentInput | null;
  if (!input) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const inputError = validateInput(input);
  if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });

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

  const availability = canCreateAppointment(input, existingAppointments ?? [], blocks ?? []);
  if (!availability.ok) return NextResponse.json({ error: availability.reason }, { status: 400 });

  try {
    const client = await findOrCreateClient(input);
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        client_id: client.id,
        hairdresser_id: input.hairdresser_id,
        service_id: input.service_id,
        date: input.date,
        start_time: input.start_time,
        duration_minutes: input.duration_minutes,
        status: input.status ?? "confirmed",
        payment_status: input.payment_status ?? "unpaid",
        notes: input.notes?.trim() || null,
        delay_minutes: input.delay_minutes ?? 0,
        source: input.source ?? "admin",
        created_by: null,
        currency: "eur"
      })
      .select("*, clients(*), services(*), hairdressers(*)")
      .single();

    if (error) throw error;
    return NextResponse.json({ appointment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al crear la cita." }, { status: 500 });
  }
}
