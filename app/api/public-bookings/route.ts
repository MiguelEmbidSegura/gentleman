import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { addDays, getTodayKey } from "@/lib/date";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  if (!getCurrentUser()) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const hairdresserId = searchParams.get("hairdresser_id");
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const today = getTodayKey();
  const yesterday = addDays(today, -1);
  const supabase = getSupabaseAdmin();

  const applyFilters = <T extends {
    eq: (column: string, value: string) => T;
  }>(query: T) => {
    let next = query.eq("source", "public");
    if (hairdresserId && hairdresserId !== "all") next = next.eq("hairdresser_id", hairdresserId);
    if (status && status !== "all") next = next.eq("status", status);
    return next;
  };

  const appointmentIdsForSearch = q
    ? await supabase
      .from("clients")
      .select("id")
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    : null;

  if (appointmentIdsForSearch?.error) {
    return NextResponse.json({ error: appointmentIdsForSearch.error.message }, { status: 500 });
  }

  const matchingClientIds = appointmentIdsForSearch?.data?.map((client) => client.id) ?? [];

  const applyClientSearch = <T extends {
    in: (column: string, values: string[]) => T;
  }>(query: T) => q ? query.in("client_id", matchingClientIds) : query;

  const upcomingQuery = applyClientSearch(applyFilters(
    supabase
      .from("appointments")
      .select("*, clients(*), services(*), hairdressers(*)")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(100)
  ));

  const historyQuery = applyClientSearch(applyFilters(
    supabase
      .from("appointments")
      .select("*, clients(*), services(*), hairdressers(*)")
      .lt("date", today)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(100)
  ));

  let recentQuery = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("source", "public")
    .gte("created_at", `${yesterday}T00:00:00.000Z`);

  if (hairdresserId && hairdresserId !== "all") recentQuery = recentQuery.eq("hairdresser_id", hairdresserId);
  if (status && status !== "all") recentQuery = recentQuery.eq("status", status);
  if (q) recentQuery = recentQuery.in("client_id", matchingClientIds);

  const [
    { data: upcoming, error: upcomingError },
    { data: history, error: historyError },
    { count: newSinceYesterday, error: recentError }
  ] = await Promise.all([
    upcomingQuery,
    historyQuery,
    recentQuery
  ]);

  const error = upcomingError ?? historyError ?? recentError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    upcoming: upcoming ?? [],
    history: history ?? [],
    new_since_yesterday: newSinceYesterday ?? 0
  });
}
