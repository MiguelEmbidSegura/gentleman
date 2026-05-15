import { addDays, getBusinessMinutes, getTodayKey, parseLocalDate } from "@/lib/date";
import { HAIRDRESSERS, SLOT_MINUTES, workingSchedule } from "@/lib/schedule";

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getLatestBookableStart(dateKey: string): number | null {
  const weekday = parseLocalDate(dateKey).getDay();
  const finalStarts = HAIRDRESSERS.flatMap((hairdresser) =>
    workingSchedule[hairdresser.id][weekday].map((range) => timeToMinutes(range.end) - SLOT_MINUTES)
  );

  return finalStarts.length > 0 ? Math.max(...finalStarts) : null;
}

// Starts the public booking flow on the first day where at least one 15-minute slot
// could still exist. This avoids showing "today" once the business day is over.
export function getInitialPublicBookingDate(now = new Date()): string {
  const todayKey = getTodayKey(now);
  let candidate = todayKey;
  const currentMinutes = getBusinessMinutes(now);

  for (let attempts = 0; attempts < 14; attempts += 1) {
    const latestBookableStart = getLatestBookableStart(candidate);
    const isToday = candidate === todayKey;

    if (latestBookableStart !== null && (!isToday || currentMinutes < latestBookableStart)) {
      return candidate;
    }

    candidate = addDays(candidate, 1);
  }

  return candidate;
}
