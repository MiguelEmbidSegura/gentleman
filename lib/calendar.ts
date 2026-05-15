import { parseLocalDate } from "@/lib/date";
import type { Appointment } from "@/lib/types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIcsUtcDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z"
  ].join("");
}

function toIcsLocalDateTime(date: Date): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join("");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildAppointmentCalendarFile(appointment: Appointment): string {
  const localDate = parseLocalDate(appointment.date);
  const [hours, minutes] = appointment.start_time.slice(0, 5).split(":").map(Number);
  const start = new Date(localDate);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + appointment.duration_minutes * 60 * 1000);
  const title = appointment.services?.name
    ? `Cita Gentleman - ${appointment.services.name}`
    : "Cita Gentleman";
  const description = [
    appointment.hairdressers?.name ? `Peluquero: ${appointment.hairdressers.name}` : "",
    "Gestiona tu cita desde el enlace privado recibido por email."
  ].filter(Boolean).join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gentleman//Agenda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@gentleman`,
    `DTSTAMP:${toIcsUtcDate(new Date())}`,
    `DTSTART;TZID=Europe/Madrid:${toIcsLocalDateTime(start)}`,
    `DTEND;TZID=Europe/Madrid:${toIcsLocalDateTime(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    ""
  ].join("\r\n");
}
