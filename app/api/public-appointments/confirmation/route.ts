import { NextRequest, NextResponse } from "next/server";
import { createAppointmentAccessToken } from "@/lib/appointment-access";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "Falta session_id." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, date, start_time, duration_minutes, status, clients(name), services(name), hairdressers(name)")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });

  const token = createAppointmentAccessToken(data.id);
  return NextResponse.json({
    appointment: data,
    manage_url: `/reservar/gestionar/${encodeURIComponent(token)}`
  });
}
