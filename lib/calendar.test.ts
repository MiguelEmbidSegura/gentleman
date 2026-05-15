import { describe, expect, it } from "vitest";
import { buildAppointmentCalendarFile } from "@/lib/calendar";
import type { Appointment } from "@/lib/types";

const appointment: Appointment = {
  id: "appointment-123",
  client_id: "client-123",
  hairdresser_id: "00000000-0000-0000-0000-000000000001",
  service_id: "service-123",
  date: "2026-05-20",
  start_time: "10:30:00",
  duration_minutes: 30,
  status: "confirmed",
  payment_status: "paid",
  stripe_checkout_session_id: null,
  stripe_payment_intent_id: null,
  amount_paid_cents: null,
  currency: "eur",
  paid_at: null,
  notes: null,
  delay_minutes: 0,
  source: "public",
  created_by: null,
  services: {
    id: "service-123",
    name: "Corte",
    duration_minutes: 30,
    price: null,
    description: null,
    active: true
  },
  hairdressers: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alberto",
    slug: "alberto",
    active: true
  }
};

describe("appointment calendar files", () => {
  it("builds a Madrid-time ICS event with the appointment details", () => {
    const file = buildAppointmentCalendarFile(appointment);

    expect(file).toContain("BEGIN:VCALENDAR");
    expect(file).toContain("UID:appointment-123@gentleman");
    expect(file).toContain("DTSTART;TZID=Europe/Madrid:20260520T103000");
    expect(file).toContain("DTEND;TZID=Europe/Madrid:20260520T110000");
    expect(file).toContain("SUMMARY:Cita Gentleman - Corte");
    expect(file).toContain("Peluquero: Alberto");
  });
});
