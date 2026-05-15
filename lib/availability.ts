import { getBusinessMinutes, getTodayKey } from "@/lib/date";
import { SLOT_MINUTES, workingSchedule } from "@/lib/schedule";
import { appointmentBlocksAvailability } from "@/lib/payments";
import type {
  Appointment,
  AppointmentInput,
  HairdresserId,
  ScheduleBlock,
  ServiceDuration,
  Slot,
  WorkingRange
} from "@/lib/types";

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function getWorkingRanges(hairdresserId: HairdresserId, date: string | Date): WorkingRange[] {
  const day = typeof date === "string" ? new Date(`${date}T00:00:00`).getDay() : date.getDay();
  return workingSchedule[hairdresserId][day] ?? [];
}

export function getBaseSchedule(hairdresserId: HairdresserId, date: string | Date): WorkingRange[] {
  return getWorkingRanges(hairdresserId, date);
}

export function getScheduleBlocks(
  hairdresserId: HairdresserId,
  date: string,
  blocks: ScheduleBlock[]
): ScheduleBlock[] {
  return blocks.filter((block) => {
    const affectsHairdresser = block.affects_all_hairdressers || block.hairdresser_id === hairdresserId;
    return affectsHairdresser && block.start_date <= date && block.end_date >= date;
  });
}

export function generateSlots(
  hairdresserId: HairdresserId,
  date: string | Date,
  serviceDuration?: ServiceDuration
): string[] {
  return getWorkingRanges(hairdresserId, date).flatMap((range) => {
    const slots: string[] = [];
    const start = timeToMinutes(range.start);
    const end = timeToMinutes(range.end);
    const latestStart = serviceDuration ? end - serviceDuration : end - SLOT_MINUTES;

    for (let minute = start; minute <= latestStart; minute += SLOT_MINUTES) {
      slots.push(minutesToTime(minute));
    }

    return slots;
  });
}

export function getDayTimelineSlots(date: string): string[] {
  const day = new Date(`${date}T00:00:00`).getDay();
  const isSaturday = day === 6;
  const isSunday = day === 0;
  const start = isSunday ? 8 * 60 + 45 : 8 * 60 + 45;
  const end = isSaturday ? 14 * 60 : 20 * 60;
  const slots: string[] = [];

  for (let minute = start; minute < end; minute += SLOT_MINUTES) {
    slots.push(minutesToTime(minute));
  }

  return slots;
}

export function appointmentOverlaps(
  existingAppointment: Pick<Appointment, "date" | "hairdresser_id" | "start_time" | "duration_minutes" | "id"> & Partial<Pick<Appointment, "status" | "created_at">>,
  newAppointment: Pick<AppointmentInput, "date" | "hairdresser_id" | "start_time" | "duration_minutes" | "id">,
  now = new Date()
): boolean {
  if (existingAppointment.status && !appointmentBlocksAvailability(existingAppointment as Pick<Appointment, "status" | "created_at">, now)) {
    return false;
  }

  if (existingAppointment.id && newAppointment.id && existingAppointment.id === newAppointment.id) {
    return false;
  }

  if (existingAppointment.date !== newAppointment.date) return false;
  if (existingAppointment.hairdresser_id !== newAppointment.hairdresser_id) return false;

  const existingStart = timeToMinutes(existingAppointment.start_time);
  const existingEnd = existingStart + existingAppointment.duration_minutes;
  const newStart = timeToMinutes(newAppointment.start_time);
  const newEnd = newStart + newAppointment.duration_minutes;

  return existingStart < newEnd && newStart < existingEnd;
}

export function blockOverlapsSlot(
  block: ScheduleBlock,
  date: string,
  hairdresserId: HairdresserId,
  slotStart: string,
  slotEnd: string
): boolean {
  if (!(block.affects_all_hairdressers || block.hairdresser_id === hairdresserId)) return false;
  if (block.start_date > date || block.end_date < date) return false;
  if (block.all_day || !block.start_time || !block.end_time) return true;

  const blockStart = timeToMinutes(block.start_time.slice(0, 5));
  const blockEnd = timeToMinutes(block.end_time.slice(0, 5));
  const start = timeToMinutes(slotStart);
  const end = timeToMinutes(slotEnd);
  return blockStart < end && start < blockEnd;
}

export function isWithinWorkingHours(
  hairdresserId: HairdresserId,
  date: string,
  startTime: string,
  durationMinutes: number
): boolean {
  const start = timeToMinutes(startTime);
  const end = start + durationMinutes;

  return getWorkingRanges(hairdresserId, date).some((range) => {
    const rangeStart = timeToMinutes(range.start);
    const rangeEnd = timeToMinutes(range.end);
    return start >= rangeStart && end <= rangeEnd;
  });
}

export function canCreateAppointment(
  newAppointment: AppointmentInput,
  existingAppointments: Array<Pick<Appointment, "date" | "hairdresser_id" | "start_time" | "duration_minutes" | "id"> & Partial<Pick<Appointment, "status" | "created_at">>>,
  blocks: ScheduleBlock[] = [],
  options: { disallowPast?: boolean; now?: Date } = {}
): { ok: true } | { ok: false; reason: string } {
  const day = new Date(`${newAppointment.date}T00:00:00`).getDay();

  if (day === 0) {
    return { ok: false, reason: "Los domingos la peluquería está cerrada." };
  }

  if (!isWithinWorkingHours(
    newAppointment.hairdresser_id,
    newAppointment.date,
    newAppointment.start_time,
    newAppointment.duration_minutes
  )) {
    return { ok: false, reason: "La cita está fuera del horario del peluquero." };
  }

  if (options.disallowPast) {
    const now = options.now ?? new Date();
    const todayKey = getTodayKey(now);
    const appointmentStart = timeToMinutes(newAppointment.start_time);
    const isPastDay = newAppointment.date < todayKey;
    const isPastOrCurrentSlot = newAppointment.date === todayKey && appointmentStart <= getBusinessMinutes(now);
    if (isPastDay || isPastOrCurrentSlot) {
      return { ok: false, reason: "No se puede reservar en el pasado." };
    }
  }

  const start = newAppointment.start_time;
  const end = minutesToTime(timeToMinutes(start) + newAppointment.duration_minutes);
  const blockingBlock = blocks.find((block) => blockOverlapsSlot(
    block,
    newAppointment.date,
    newAppointment.hairdresser_id,
    start,
    end
  ));
  if (blockingBlock) {
    return { ok: false, reason: "La cita coincide con un bloqueo o festivo." };
  }

  const hasOverlap = existingAppointments.some((appointment) => appointmentOverlaps(appointment, newAppointment, options.now));
  if (hasOverlap) {
    return { ok: false, reason: "La cita se solapa con otra cita existente." };
  }

  return { ok: true };
}

export function getAvailableSlots(
  hairdresserId: HairdresserId,
  date: string,
  appointments: Appointment[],
  durationMinutes: ServiceDuration = 15,
  blocks: ScheduleBlock[] = [],
  options: { disallowPast?: boolean; now?: Date } = {}
): string[] {
  return generateSlots(hairdresserId, date, durationMinutes).filter((slot) => {
    const candidate: AppointmentInput = {
      client_name: "",
      hairdresser_id: hairdresserId,
      service_id: "",
      date,
      start_time: slot,
      duration_minutes: durationMinutes,
    };
    return canCreateAppointment(candidate, appointments, blocks, options).ok;
  });
}

export function buildSlotsForHairdresser(
  hairdresserId: HairdresserId,
  date: string,
  appointments: Appointment[],
  blocks: ScheduleBlock[] = []
): Slot[] {
  const workingSlots = new Set(generateSlots(hairdresserId, date));
  return getDayTimelineSlots(date).map((time) => {
    const appointment = appointments.find((item) => {
      if (!appointmentBlocksAvailability(item)) return false;
      if (item.hairdresser_id !== hairdresserId || item.date !== date) return false;
      const slotMinute = timeToMinutes(time);
      const appointmentStart = timeToMinutes(item.start_time);
      const appointmentEnd = appointmentStart + item.duration_minutes;
      return slotMinute >= appointmentStart && slotMinute < appointmentEnd;
    });

    if (appointment) return { time, status: "busy", appointment };
    const block = blocks.find((item) => blockOverlapsSlot(
      item,
      date,
      hairdresserId,
      time,
      minutesToTime(timeToMinutes(time) + SLOT_MINUTES)
    ));
    if (block) return { time, status: "blocked", block };
    if (workingSlots.has(time)) return { time, status: "free" };
    return { time, status: "closed" };
  });
}
