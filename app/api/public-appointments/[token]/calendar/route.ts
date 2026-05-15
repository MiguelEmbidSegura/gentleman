import { NextResponse } from "next/server";
import { readAppointmentAccessToken } from "@/lib/appointment-access";
import { buildAppointmentCalendarFile } from "@/lib/calendar";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Appointment } from "@/lib/types";

type Params = { params: { token: string } };

export async function GET(_request: Request, { params }: Params) {
  const appointmentId = readAppointmentAccessToken(params.token);
  if (!appointmentId) return NextResponse.json({ error: "Enlace no válido." }, { status: 404 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .select("*, clients(*), services(*), hairdressers(*)")
    .eq("id", appointmentId)
    .eq("source", "public")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });

  const appointment = data as Appointment;
  const file = buildAppointmentCalendarFile(appointment);

  return new NextResponse(file, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cita-gentleman-${appointment.date}.ics"`
    }
  });
}
