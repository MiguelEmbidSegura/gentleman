import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { getTodayKey } from "@/lib/date";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const hairdresserId = searchParams.get("hairdresser_id");
  const status = searchParams.get("status");
  const today = getTodayKey();
  const supabase = getSupabaseAdmin();

  const applyFilters = <T extends {
    eq: (column: string, value: string) => T;
  }>(query: T) => {
    let next = query.eq("source", "public");
    if (hairdresserId && hairdresserId !== "all") next = next.eq("hairdresser_id", hairdresserId);
    if (status && status !== "all") next = next.eq("status", status);
    return next;
  };

  const upcomingQuery = applyFilters(
    supabase
      .from("appointments")
      .select("*, clients(*), services(*), hairdressers(*)")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(100)
  );

  const historyQuery = applyFilters(
    supabase
      .from("appointments")
      .select("*, clients(*), services(*), hairdressers(*)")
      .lt("date", today)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(100)
  );

  const [{ data: upcoming, error: upcomingError }, { data: history, error: historyError }] = await Promise.all([
    upcomingQuery,
    historyQuery
  ]);

  const error = upcomingError ?? historyError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    upcoming: upcoming ?? [],
    history: history ?? []
  });
}
