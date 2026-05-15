import { NextRequest, NextResponse } from "next/server";
import { createAppointmentAccessToken } from "@/lib/appointment-access";
import { sendManagementLinkEmail } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Appointment } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Introduce un email válido." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id")
    .eq("email", email);

  if (clientsError) {
    const missingEmailColumn = clientsError.message.includes("clients.email does not exist");
    return NextResponse.json(
      {
        error: missingEmailColumn
          ? "La gestión por email todavía no está activada. Inténtalo de nuevo más adelante."
          : "No se pudo buscar la cita ahora mismo."
      },
      { status: 500 }
    );
  }

  const clientIds = clients?.map((client) => client.id) ?? [];
  let data: Appointment | null = null;

  if (clientIds.length) {
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("*, clients(*), services(*), hairdressers(*)")
      .eq("source", "public")
      .in("status", ["pending_payment", "confirmed"])
      .in("client_id", clientIds)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: "No se pudo buscar la cita ahora mismo." }, { status: 500 });
    data = appointment as Appointment | null;
  }

  if (data) {
    const appointment = data;
    const token = createAppointmentAccessToken(appointment.id);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin") || new URL(request.url).origin;
    await sendManagementLinkEmail({
      to: email,
      appointment,
      manageUrl: `/reservar/gestionar/${encodeURIComponent(token)}`,
      calendarUrl: `/api/public-appointments/${encodeURIComponent(token)}/calendar`,
      siteUrl
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Si existe una cita activa asociada a ese email, recibirás un enlace seguro para gestionarla."
  });
}
