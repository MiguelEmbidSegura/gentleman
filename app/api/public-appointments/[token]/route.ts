import { NextRequest, NextResponse } from "next/server";
import { readAppointmentAccessToken } from "@/lib/appointment-access";
import { canCreateAppointment } from "@/lib/availability";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Appointment, AppointmentInput } from "@/lib/types";

type Params = { params: { token: string } };

const mutableStatuses = new Set(["pending_payment", "confirmed"]);

async function getAppointment(token: string) {
  const appointmentId = readAppointmentAccessToken(token);
  if (!appointmentId) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, clients(*), services(*), hairdressers(*)")
    .eq("id", appointmentId)
    .eq("source", "public")
    .maybeSingle();

  if (error) throw error;
  return data as Appointment | null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const appointment = await getAppointment(params.token);
    if (!appointment) return NextResponse.json({ error: "Enlace no válido." }, { status: 404 });
    return NextResponse.json({ appointment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar la cita." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const body = await request.json().catch(() => null) as
    | { action?: "cancel" }
    | { action?: "reschedule"; date?: string; start_time?: string }
    | null;

  if (!body?.action) return NextResponse.json({ error: "Acción no válida." }, { status: 400 });

  try {
    const appointment = await getAppointment(params.token);
    if (!appointment) return NextResponse.json({ error: "Enlace no válido." }, { status: 404 });
    if (!mutableStatuses.has(appointment.status)) {
      return NextResponse.json({ error: "Esta cita ya no se puede modificar." }, { status: 409 });
    }

    const supabase = getSupabaseAdmin();

    if (body.action === "cancel") {
      const { data, error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointment.id)
        .select("*, clients(*), services(*), hairdressers(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ appointment: data });
    }

    if (body.action === "reschedule") {
      if (!body.date || !/^\d{2}:\d{2}$/.test(body.start_time ?? "")) {
        return NextResponse.json({ error: "Fecha u hora no válidas." }, { status: 400 });
      }

      const nextAppointment: AppointmentInput = {
        id: appointment.id,
        client_name: appointment.clients?.name ?? "",
        client_phone: appointment.clients?.phone ?? "",
        hairdresser_id: appointment.hairdresser_id,
        service_id: appointment.service_id,
        date: body.date,
        start_time: body.start_time!,
        duration_minutes: appointment.duration_minutes,
        status: appointment.status,
        payment_status: appointment.payment_status,
        notes: appointment.notes ?? undefined,
        delay_minutes: appointment.delay_minutes,
        source: appointment.source
      };

      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("date", body.date)
        .eq("hairdresser_id", appointment.hairdresser_id)
        .in("status", ["pending_payment", "confirmed"]);

      if (appointmentsError) throw appointmentsError;

      const { data: blocks, error: blocksError } = await supabase
        .from("schedule_blocks")
        .select("*")
        .lte("start_date", body.date)
        .gte("end_date", body.date);

      if (blocksError) throw blocksError;

      const availability = canCreateAppointment(nextAppointment, appointments ?? [], blocks ?? [], { disallowPast: true });
      if (!availability.ok) return NextResponse.json({ error: availability.reason }, { status: 400 });

      const { data, error } = await supabase
        .from("appointments")
        .update({
          date: body.date,
          start_time: body.start_time
        })
        .eq("id", appointment.id)
        .select("*, clients(*), services(*), hairdressers(*)")
        .single();

      if (error) throw error;
      return NextResponse.json({ appointment: data });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la cita." },
      { status: 500 }
    );
  }
}
