export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const BUSINESS_TIME_ZONE = "Europe/Madrid";

function getBusinessDateParts(date: Date): Record<string, string> {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date).reduce<Record<string, string>>((parts, part) => {
    if (part.type !== "literal") parts[part.type] = part.value;
    return parts;
  }, {});
}

export function parseLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey: string, days: number): string {
  const date = parseLocalDate(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function getTodayKey(date = new Date()): string {
  const parts = getBusinessDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getBusinessMinutes(date = new Date()): number {
  const parts = getBusinessDateParts(date);
  return Number(parts.hour) * 60 + Number(parts.minute);
}

export function getWeekStart(dateKey: string): string {
  const date = parseLocalDate(dateKey);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return toDateKey(date);
}

export function formatDateShort(dateKey: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(parseLocalDate(dateKey));
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function normalizeSpanishPhone(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, "").replace(/[^\d+]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (normalized.startsWith("+34")) return normalized;
  if (normalized.startsWith("34") && normalized.length === 11) return `+${normalized}`;
  if (/^[6789]\d{8}$/.test(normalized)) return `+34${normalized}`;
  return normalized.startsWith("+") ? normalized : `+${normalized}`;
}

export function isReasonableSpanishPhone(phone: string): boolean {
  return /^\+34[6789]\d{8}$/.test(normalizeSpanishPhone(phone));
}

export function buildWhatsAppUrl(phone: string, message = ""): string {
  const normalized = normalizeSpanishPhone(phone).replace(/^\+/, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${text}`;
}
