export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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

export function getTodayKey(): string {
  return toDateKey(new Date());
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
