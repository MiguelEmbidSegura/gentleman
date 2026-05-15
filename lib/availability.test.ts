import { describe, expect, it } from "vitest";
import {
  appointmentOverlaps,
  blockOverlapsSlot,
  canCreateAppointment,
  generateSlots,
  getAvailableSlots,
  getWorkingRanges,
  isWithinWorkingHours
} from "@/lib/availability";
import { buildWhatsAppUrl, normalizeSpanishPhone } from "@/lib/date";
import { HAIRDRESSER_IDS, SERVICE_IDS } from "@/lib/schedule";
import type { Appointment, AppointmentInput, ScheduleBlock } from "@/lib/types";

const monday = "2026-05-11";
const saturday = "2026-05-16";
const sunday = "2026-05-17";

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appointment-1",
    client_id: "client-1",
    hairdresser_id: HAIRDRESSER_IDS.alberto,
    service_id: SERVICE_IDS.corte,
    date: monday,
    start_time: "09:00",
    duration_minutes: 30,
    status: "confirmed",
    payment_status: "paid",
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    amount_paid_cents: 800,
    currency: "eur",
    paid_at: "2026-05-11T08:00:00.000Z",
    notes: null,
    delay_minutes: 0,
    source: "admin",
    created_by: null,
    ...overrides
  };
}

function input(overrides: Partial<AppointmentInput> = {}): AppointmentInput {
  return {
    client_name: "Cliente",
    hairdresser_id: HAIRDRESSER_IDS.alberto,
    service_id: SERVICE_IDS.corte,
    date: monday,
    start_time: "09:30",
    duration_minutes: 15,
    ...overrides
  };
}

function block(overrides: Partial<ScheduleBlock> = {}): ScheduleBlock {
  return {
    id: "block-1",
    title: "Vacaciones",
    block_type: "alberto_vacation",
    hairdresser_id: HAIRDRESSER_IDS.alberto,
    affects_all_hairdressers: false,
    start_date: monday,
    end_date: monday,
    start_time: null,
    end_time: null,
    all_day: true,
    internal_reason: null,
    visible_to_clients: false,
    created_by: null,
    ...overrides
  };
}

describe("availability", () => {
  it("genera bloques de 15 minutos y no permite empezar en la hora exacta de cierre", () => {
    const slots = generateSlots(HAIRDRESSER_IDS.alberto, monday);

    expect(slots.slice(0, 4)).toEqual(["08:45", "09:00", "09:15", "09:30"]);
    expect(slots).toContain("14:30");
    expect(slots).not.toContain("14:45");
  });

  it("filtra por duración completa del servicio", () => {
    const slots30 = generateSlots(HAIRDRESSER_IDS.alberto, monday, 30);

    expect(slots30).toContain("14:15");
    expect(slots30).not.toContain("14:30");
  });

  it("respeta el horario de sábado de Alberto", () => {
    expect(getWorkingRanges(HAIRDRESSER_IDS.alberto, saturday)).toEqual([{ start: "08:45", end: "11:30" }]);
    expect(generateSlots(HAIRDRESSER_IDS.alberto, saturday).at(-1)).toBe("11:15");
  });

  it("cierra los domingos para ambos peluqueros", () => {
    expect(generateSlots(HAIRDRESSER_IDS.alberto, sunday)).toEqual([]);
    expect(generateSlots(HAIRDRESSER_IDS.ruben, sunday)).toEqual([]);
    expect(canCreateAppointment(input({ date: sunday }), [])).toEqual({
      ok: false,
      reason: "Los domingos la peluquería está cerrada."
    });
  });

  it("detecta solapamientos entre citas", () => {
    expect(appointmentOverlaps(appointment(), input({ start_time: "09:15", duration_minutes: 30 }))).toBe(true);
    expect(appointmentOverlaps(appointment(), input({ start_time: "09:30", duration_minutes: 30 }))).toBe(false);
  });

  it("calcula ocupación para duraciones de 15, 30, 45, 60, 90 y 120 minutos", () => {
    const existing = [appointment({ start_time: "10:00", duration_minutes: 60 })];

    expect(canCreateAppointment(input({ start_time: "09:45", duration_minutes: 15 }), existing).ok).toBe(true);
    expect(canCreateAppointment(input({ start_time: "09:45", duration_minutes: 30 }), existing).ok).toBe(false);
    expect(canCreateAppointment(input({ start_time: "09:30", duration_minutes: 45 }), existing).ok).toBe(false);
    expect(canCreateAppointment(input({ start_time: "09:00", duration_minutes: 60 }), existing).ok).toBe(true);
    expect(canCreateAppointment(input({ start_time: "08:45", duration_minutes: 90 }), existing).ok).toBe(false);
    expect(canCreateAppointment(input({ start_time: "11:00", duration_minutes: 120 }), existing).ok).toBe(true);
  });

  it("permite cita que termina justo al cierre y rechaza si se pasa", () => {
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.alberto, monday, "14:15", 30)).toBe(true);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.alberto, monday, "14:30", 30)).toBe(false);
  });

  it("rechaza citas pasadas cuando la validacion lo exige", () => {
    const now = new Date("2026-05-11T10:00:00.000Z"); // 12:00 en Madrid

    expect(canCreateAppointment(input({ start_time: "11:45" }), [], [], { disallowPast: true, now })).toEqual({
      ok: false,
      reason: "No se puede reservar en el pasado."
    });
    expect(canCreateAppointment(input({ start_time: "12:00" }), [], [], { disallowPast: true, now })).toEqual({
      ok: false,
      reason: "No se puede reservar en el pasado."
    });
    expect(canCreateAppointment(input({ start_time: "12:15" }), [], [], { disallowPast: true, now }).ok).toBe(true);
  });

  it("valida los horarios de Alberto entre semana", () => {
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.alberto, monday, "08:45", 15)).toBe(true);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.alberto, monday, "14:30", 15)).toBe(true);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.alberto, monday, "14:45", 15)).toBe(false);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.alberto, monday, "15:45", 30)).toBe(false);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.alberto, monday, "16:00", 60)).toBe(true);
  });

  it("valida los horarios de Rubén entre semana y sábado", () => {
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.ruben, monday, "15:00", 15)).toBe(true);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.ruben, monday, "19:30", 15)).toBe(true);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.ruben, monday, "19:45", 15)).toBe(false);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.ruben, saturday, "09:30", 60)).toBe(true);
    expect(isWithinWorkingHours(HAIRDRESSER_IDS.ruben, saturday, "13:30", 30)).toBe(false);
  });

  it("devuelve horas disponibles excluyendo solapes y servicios de varios bloques", () => {
    const slots = getAvailableSlots(
      HAIRDRESSER_IDS.alberto,
      monday,
      [appointment({ start_time: "09:00", duration_minutes: 30 })],
      30
    );

    expect(slots).not.toContain("08:45");
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:15");
    expect(slots).toContain("09:30");
  });

  it("bloquea un día completo para Alberto", () => {
    expect(canCreateAppointment(input({ start_time: "10:00" }), [], [block()]).ok).toBe(false);
    expect(canCreateAppointment(input({ hairdresser_id: HAIRDRESSER_IDS.ruben, start_time: "15:00" }), [], [block()]).ok).toBe(true);
  });

  it("bloquea una franja parcial por horas", () => {
    const partial = block({ all_day: false, start_time: "10:00", end_time: "11:30" });

    expect(blockOverlapsSlot(partial, monday, HAIRDRESSER_IDS.alberto, "09:45", "10:00")).toBe(false);
    expect(blockOverlapsSlot(partial, monday, HAIRDRESSER_IDS.alberto, "10:00", "10:15")).toBe(true);
  });

  it("aplica vacaciones y festivos que afectan a ambos", () => {
    const albertoVacation = block({ block_type: "alberto_vacation", hairdresser_id: HAIRDRESSER_IDS.alberto });
    const rubenVacation = block({ block_type: "ruben_vacation", hairdresser_id: HAIRDRESSER_IDS.ruben });
    const holiday = block({ block_type: "madrid_local_holiday", hairdresser_id: null, affects_all_hairdressers: true });

    expect(canCreateAppointment(input(), [], [albertoVacation]).ok).toBe(false);
    expect(canCreateAppointment(input({ hairdresser_id: HAIRDRESSER_IDS.ruben, start_time: "15:00" }), [], [rubenVacation]).ok).toBe(false);
    expect(canCreateAppointment(input(), [], [holiday]).ok).toBe(false);
  });

  it("normaliza teléfono español y genera enlace de WhatsApp", () => {
    expect(normalizeSpanishPhone("612 34 56 78")).toBe("+34612345678");
    expect(normalizeSpanishPhone("(912) 345-678")).toBe("+34912345678");
    expect(buildWhatsAppUrl("612 34 56 78", "Hola")).toBe("https://wa.me/34612345678?text=Hola");
  });
});
