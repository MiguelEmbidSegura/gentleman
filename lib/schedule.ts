import type { Hairdresser, HairdresserId, Service, ServiceDuration, WorkingRange } from "@/lib/types";

export const SLOT_MINUTES = 15;

export const HAIRDRESSER_IDS = {
  alberto: "00000000-0000-0000-0000-000000000001",
  ruben: "00000000-0000-0000-0000-000000000002"
} as const;

export const SERVICE_IDS = {
  corte: "10000000-0000-0000-0000-000000000001",
  barba: "10000000-0000-0000-0000-000000000002",
  corteBarba: "10000000-0000-0000-0000-000000000003",
  tinte: "10000000-0000-0000-0000-000000000004",
  peinado: "10000000-0000-0000-0000-000000000005",
  otro: "10000000-0000-0000-0000-000000000006"
} as const;

export const HAIRDRESSERS: Hairdresser[] = [
  { id: HAIRDRESSER_IDS.alberto, name: "Alberto", slug: "alberto", active: true },
  { id: HAIRDRESSER_IDS.ruben, name: "Rubén", slug: "ruben", active: true }
];

export const INITIAL_SERVICES: Service[] = [
  { id: SERVICE_IDS.corte, name: "Corte", duration_minutes: 15, price: null, description: null, active: true },
  { id: SERVICE_IDS.barba, name: "Barba", duration_minutes: 15, price: null, description: null, active: true },
  { id: SERVICE_IDS.corteBarba, name: "Corte + barba", duration_minutes: 15, price: null, description: null, active: true },
  { id: SERVICE_IDS.tinte, name: "Tinte", duration_minutes: 15, price: null, description: null, active: true },
  { id: SERVICE_IDS.peinado, name: "Peinado", duration_minutes: 15, price: null, description: null, active: true },
  { id: SERVICE_IDS.otro, name: "Otro", duration_minutes: 15, price: null, description: null, active: true }
];

export const DURATIONS: ServiceDuration[] = [15, 30, 45, 60, 90, 120];

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const workingSchedule: Record<HairdresserId, Record<number, WorkingRange[]>> = {
  [HAIRDRESSER_IDS.alberto]: {
    0: [],
    1: [
      { start: "08:45", end: "14:45" },
      { start: "16:00", end: "17:45" }
    ],
    2: [
      { start: "08:45", end: "14:45" },
      { start: "16:00", end: "17:45" }
    ],
    3: [
      { start: "08:45", end: "14:45" },
      { start: "16:00", end: "17:45" }
    ],
    4: [
      { start: "08:45", end: "14:45" },
      { start: "16:00", end: "17:45" }
    ],
    5: [
      { start: "08:45", end: "14:45" },
      { start: "16:00", end: "17:45" }
    ],
    6: [{ start: "08:45", end: "11:30" }]
  },
  [HAIRDRESSER_IDS.ruben]: {
    0: [],
    1: [{ start: "15:00", end: "19:45" }],
    2: [{ start: "15:00", end: "19:45" }],
    3: [{ start: "15:00", end: "19:45" }],
    4: [{ start: "15:00", end: "19:45" }],
    5: [{ start: "15:00", end: "19:45" }],
    6: [{ start: "09:30", end: "13:45" }]
  }
};

export function getHairdresserBySlug(slug: string): Hairdresser | undefined {
  return HAIRDRESSERS.find((hairdresser) => hairdresser.slug === slug);
}

export function getHairdresserName(id: HairdresserId): string {
  return HAIRDRESSERS.find((hairdresser) => hairdresser.id === id)?.name ?? "Peluquero";
}

export function getInitialService(id: string): Service | undefined {
  return INITIAL_SERVICES.find((service) => service.id === id);
}
