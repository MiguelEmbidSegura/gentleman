export type HairdresserId =
  | "00000000-0000-0000-0000-000000000001"
  | "00000000-0000-0000-0000-000000000002";

export type HairdresserSlug = "alberto" | "ruben";

export type AppointmentStatus = "pending_payment" | "confirmed" | "cancelled" | "expired" | "completed" | "no_show";

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export type BookingSource = "public" | "admin";

export type BlockType =
  | "national_holiday"
  | "madrid_region_holiday"
  | "madrid_local_holiday"
  | "alcobendas_local_holiday"
  | "alberto_vacation"
  | "ruben_vacation"
  | "full_closure"
  | "partial_closure"
  | "alberto_manual"
  | "ruben_manual"
  | "other";

export type ServiceDuration = 15 | 30 | 45 | 60 | 90 | 120;

export type Hairdresser = {
  id: HairdresserId;
  name: string;
  slug: HairdresserSlug;
  active: boolean;
};

export type WorkingRange = {
  start: string;
  end: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Service = {
  id: string;
  name: string;
  duration_minutes: ServiceDuration;
  price: number | null;
  description: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Appointment = {
  id: string;
  client_id: string;
  hairdresser_id: HairdresserId;
  service_id: string;
  date: string;
  start_time: string;
  duration_minutes: ServiceDuration;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid_cents: number | null;
  currency: string;
  paid_at: string | null;
  notes: string | null;
  delay_minutes: number;
  source: BookingSource;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
  clients?: Client | null;
  services?: Service | null;
  hairdressers?: Hairdresser | null;
};

export type AppointmentInput = {
  id?: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  hairdresser_id: HairdresserId;
  service_id: string;
  date: string;
  start_time: string;
  duration_minutes: ServiceDuration;
  status?: AppointmentStatus;
  payment_status?: PaymentStatus;
  notes?: string;
  delay_minutes?: number;
  source?: BookingSource;
};

export type ScheduleBlock = {
  id: string;
  title: string;
  block_type: BlockType;
  hairdresser_id: HairdresserId | null;
  affects_all_hairdressers: boolean;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  internal_reason: string | null;
  visible_to_clients: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Setting = {
  id: string;
  key: string;
  value: unknown;
  created_at?: string;
  updated_at?: string;
};

export type SlotStatus = "free" | "busy" | "blocked" | "closed";

export type Slot = {
  time: string;
  status: SlotStatus;
  appointment?: Appointment;
  block?: ScheduleBlock;
};
