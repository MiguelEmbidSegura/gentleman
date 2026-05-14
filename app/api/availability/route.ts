import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { HAIRDRESSERS } from "@/lib/schedule";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { HairdresserId, ServiceDuration } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const duration = Number(searchParams.get("duration") ?? 30) as ServiceDuration;
  const hairdresserId = searchParams.get("hairdresser_id") as HairdresserId | "any" | null;

  if (!date || !hairdresserId) {
    return NextResponse.json({ error: "Fecha y peluquero son obligatorios." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", date)
    .in("status", ["pending_payment", "confirmed"]);

  if (appointmentsError) return NextResponse.json({ error: appointmentsError.message }, { status: 500 });

  const { data: blocks, error: blocksError } = await supabase
    .from("schedule_blocks")
    .select("*")
    .lte("start_date", date)
    .gte("end_date", date);

  if (blocksError) return NextResponse.json({ error: blocksError.message }, { status: 500 });

  const hairdressers = hairdresserId === "any"
    ? HAIRDRESSERS
    : HAIRDRESSERS.filter((hairdresser) => hairdresser.id === hairdresserId);

  const slots = hairdressers.flatMap((hairdresser) =>
    getAvailableSlots(hairdresser.id, date, appointments ?? [], duration, blocks ?? [], { disallowPast: true })
      .map((time) => ({ time, hairdresser_id: hairdresser.id, hairdresser_name: hairdresser.name }))
  );

  return NextResponse.json({ slots });
}
