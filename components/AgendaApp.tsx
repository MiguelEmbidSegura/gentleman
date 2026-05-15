"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Globe,
  History,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { buildSlotsForHairdresser, generateSlots, getAvailableSlots } from "@/lib/availability";
import { addDays, buildWhatsAppUrl, formatDateShort, getTodayKey, getWeekStart, normalizeSpanishPhone } from "@/lib/date";
import { DURATIONS, HAIRDRESSER_IDS, HAIRDRESSERS, INITIAL_SERVICES, getHairdresserName } from "@/lib/schedule";
import type {
  Appointment,
  AppointmentInput,
  AppointmentStatus,
  BlockType,
  Client,
  HairdresserId,
  PaymentStatus,
  ScheduleBlock,
  Service,
  ServiceDuration,
  Slot
} from "@/lib/types";

type ViewMode = "hoy" | "agenda" | "semana" | "citas" | "clientes" | "web" | "bloqueos" | "servicios" | "ajustes";
type PaymentFilter = "all" | "paid" | "pending_payment" | "cancelled" | "expired";

type ClientSearchResult = Client & {
  appointments?: Appointment[];
};

type FormState = {
  id?: string;
  client_id?: string;
  client_name: string;
  client_phone: string;
  hairdresser_id: HairdresserId;
  service_id: string;
  date: string;
  start_time: string;
  duration_minutes: ServiceDuration;
  status: AppointmentStatus;
  notes: string;
  delay_minutes: number;
};

const statusLabels: Record<AppointmentStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  expired: "Expirada",
  completed: "Completada",
  no_show: "No presentada"
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "Sin pagar",
  pending: "Pago pendiente",
  paid: "Pagada",
  failed: "Fallido",
  refunded: "Devuelto"
};

const paymentFilters: Array<{ id: PaymentFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "paid", label: "Pagadas" },
  { id: "pending_payment", label: "Pendientes" },
  { id: "cancelled", label: "Canceladas" },
  { id: "expired", label: "Expiradas" }
];

function matchesPaymentFilter(appointment: Appointment, filter: PaymentFilter) {
  if (filter === "all") return true;
  if (filter === "paid") return appointment.payment_status === "paid";
  return appointment.status === filter;
}

const blockTypeLabels: Record<BlockType, string> = {
  national_holiday: "Festivo nacional",
  madrid_region_holiday: "Festivo Comunidad de Madrid",
  madrid_local_holiday: "Festivo local Madrid",
  alcobendas_local_holiday: "Festivo local Alcobendas",
  alberto_vacation: "Vacaciones Alberto",
  ruben_vacation: "Vacaciones Rubén",
  full_closure: "Cierre completo",
  partial_closure: "Cierre parcial",
  alberto_manual: "Bloqueo Alberto",
  ruben_manual: "Bloqueo Rubén",
  other: "Otro"
};

function initialForm(date: string, serviceId = INITIAL_SERVICES[0].id): FormState {
  const service = INITIAL_SERVICES.find((item) => item.id === serviceId) ?? INITIAL_SERVICES[0];
  return {
    client_name: "",
    client_phone: "",
    hairdresser_id: HAIRDRESSER_IDS.alberto,
    service_id: service.id,
    date,
    start_time: "08:45",
    duration_minutes: service.duration_minutes,
    status: "confirmed",
    notes: "",
    delay_minutes: 0
  };
}

function appointmentToForm(appointment: Appointment): FormState {
  return {
    id: appointment.id,
    client_id: appointment.client_id,
    client_name: appointment.clients?.name ?? "",
    client_phone: appointment.clients?.phone ?? "",
    hairdresser_id: appointment.hairdresser_id,
    service_id: appointment.service_id,
    date: appointment.date,
    start_time: appointment.start_time.slice(0, 5),
    duration_minutes: appointment.duration_minutes,
    status: appointment.status,
    notes: appointment.notes ?? "",
    delay_minutes: appointment.delay_minutes ?? 0
  };
}

function appointmentEnd(appointment: Appointment) {
  const [hours, minutes] = appointment.start_time.slice(0, 5).split(":").map(Number);
  const total = hours * 60 + minutes + appointment.duration_minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function getServiceName(appointment: Appointment) {
  return appointment.services?.name ?? INITIAL_SERVICES.find((service) => service.id === appointment.service_id)?.name ?? "Servicio";
}

function LoginScreen({ onLogin }: { onLogin: (user: string) => void }) {
  const [username, setUsername] = useState("alberto");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo iniciar sesión.");
      return;
    }

    onLogin(payload.user);
  }

  return (
    <main className="min-h-screen px-5 py-8 safe-bottom">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Gentleman</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-ink">Panel privado</h1>
        <p className="mt-3 text-base text-ink/70">Acceso de administración para Alberto y Rubén.</p>

        <form onSubmit={submit} className="mt-8 rounded-[8px] border border-line bg-white p-4 shadow-soft">
          <label className="block text-sm font-semibold text-ink" htmlFor="username">Usuario</label>
          <select
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 h-12 w-full rounded-[8px] border border-line bg-paper px-3 outline-none focus:border-moss"
          >
            <option value="alberto">Alberto</option>
            <option value="ruben">Rubén</option>
          </select>

          <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-[8px] border border-line bg-paper px-3 outline-none focus:border-moss"
            autoComplete="current-password"
          />

          {error ? <p className="mt-3 text-sm font-semibold text-clay">{error}</p> : null}

          <button disabled={loading} className="mt-5 h-12 w-full rounded-[8px] bg-moss px-4 font-bold text-white disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function DayPicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button aria-label="Día anterior" onClick={() => onChange(addDays(date, -1))} className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-line bg-white">
        <ChevronLeft size={20} />
      </button>
      <input type="date" value={date} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-0 flex-1 rounded-[8px] border border-line bg-white px-3 text-center font-semibold outline-none focus:border-moss" />
      <button aria-label="Día siguiente" onClick={() => onChange(addDays(date, 1))} className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-line bg-white">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={clsx(
      "rounded-[8px] px-2 py-1 text-xs font-black",
      status === "confirmed" && "bg-moss/15 text-moss",
      status === "pending_payment" && "bg-honey/20 text-ink",
      status === "cancelled" && "bg-clay/10 text-clay",
      status === "expired" && "bg-ink/10 text-ink/60",
      status === "completed" && "bg-ink/10 text-ink",
      status === "no_show" && "bg-clay/20 text-clay"
    )}>
      {statusLabels[status]}
    </span>
  );
}

function SlotRow({ slot, onEdit, onCreate }: { slot: Slot; onEdit: (appointment: Appointment) => void; onCreate: (time: string) => void }) {
  const appointment = slot.appointment;
  const isContinuation = Boolean(appointment && appointment.start_time.slice(0, 5) !== slot.time);

  if (slot.status === "closed") {
    return (
      <div className="grid grid-cols-[54px_1fr] gap-2 py-1 text-sm">
        <span className="pt-2 font-semibold text-ink/45">{slot.time}</span>
        <div className="min-h-9 rounded-[8px] border border-dashed border-line bg-white/45 px-3 py-2 text-ink/45">Fuera de horario</div>
      </div>
    );
  }

  if (slot.status === "blocked") {
    return (
      <div className="grid grid-cols-[54px_1fr] gap-2 py-1 text-sm">
        <span className="pt-2 font-semibold text-clay">{slot.time}</span>
        <div className="min-h-9 rounded-[8px] border border-clay/20 bg-clay/10 px-3 py-2 font-semibold text-clay">
          Bloqueado{slot.block?.visible_to_clients ? "" : " · interno"}
        </div>
      </div>
    );
  }

  if (slot.status === "free") {
    return (
      <div className="grid grid-cols-[54px_1fr] gap-2 py-1 text-sm">
        <span className="pt-2 font-semibold text-moss">{slot.time}</span>
        <button onClick={() => onCreate(slot.time)} className="min-h-9 rounded-[8px] border border-line bg-white px-3 py-2 text-left text-ink/60">Libre</button>
      </div>
    );
  }

  if (!appointment || isContinuation) {
    return (
      <div className="grid grid-cols-[54px_1fr] gap-2 py-1 text-sm">
        <span className="pt-2 font-semibold text-ink/45">{slot.time}</span>
        <div className="min-h-9 rounded-[8px] bg-moss/10" />
      </div>
    );
  }

  const phone = appointment.clients?.phone ?? "";
  const whatsapp = phone ? buildWhatsAppUrl(phone, "Hola, te contactamos desde la peluquería sobre tu cita.") : undefined;

  return (
    <div className="grid grid-cols-[54px_1fr] gap-2 py-1 text-sm">
      <span className="pt-2 font-semibold text-ink">{slot.time}</span>
      <article className="rounded-[8px] border border-moss/20 bg-white p-3 shadow-sm">
        <button onClick={() => onEdit(appointment)} className="w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-black text-ink">{appointment.clients?.name ?? "Cliente"}</p>
              <p className="mt-1 text-xs font-semibold uppercase text-moss">
                {getServiceName(appointment)} · {appointment.start_time.slice(0, 5)}-{appointmentEnd(appointment)} · {appointment.duration_minutes} min
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={appointment.status} />
              {appointment.delay_minutes > 0 ? <span className="rounded-[8px] bg-honey/20 px-2 py-1 text-xs font-black text-ink">+{appointment.delay_minutes}</span> : null}
            </div>
          </div>
          {appointment.notes ? <p className="mt-2 line-clamp-2 text-sm text-ink/70">{appointment.notes}</p> : null}
          <div className="mt-2 rounded-[8px] bg-paper px-2 py-1 text-xs font-bold text-ink/65">
            Pago: {paymentStatusLabels[appointment.payment_status] ?? appointment.payment_status}
            {appointment.amount_paid_cents ? ` · ${(appointment.amount_paid_cents / 100).toFixed(2)} ${appointment.currency.toUpperCase()}` : ""}
            {appointment.paid_at ? ` · ${new Date(appointment.paid_at).toLocaleString("es-ES")}` : ""}
          </div>
          {appointment.stripe_checkout_session_id ? (
            <p className="mt-1 truncate text-[11px] font-semibold text-ink/45">
              Stripe: {appointment.stripe_checkout_session_id}
            </p>
          ) : null}
        </button>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <a href={phone ? `tel:${phone}` : undefined} aria-disabled={!phone} className={clsx("grid h-10 place-items-center rounded-[8px] border border-line", phone ? "bg-paper" : "pointer-events-none opacity-40")} aria-label="Llamar">
            <Phone size={18} />
          </a>
          <a href={whatsapp} target="_blank" rel="noreferrer" aria-disabled={!whatsapp} className={clsx("grid h-10 place-items-center rounded-[8px] border border-line", whatsapp ? "bg-paper" : "pointer-events-none opacity-40")} aria-label="WhatsApp">
            <MessageCircle size={18} />
          </a>
          <button onClick={() => phone && navigator.clipboard?.writeText(phone)} className="grid h-10 place-items-center rounded-[8px] border border-line bg-paper" aria-label="Copiar teléfono">
            <Copy size={18} />
          </button>
          <button onClick={() => onEdit(appointment)} className="h-10 rounded-[8px] bg-ink px-3 font-bold text-white">Ver</button>
        </div>
      </article>
    </div>
  );
}

function HairdresserAgenda({
  hairdresserId,
  date,
  appointments,
  blocks,
  onEdit,
  onCreate
}: {
  hairdresserId: HairdresserId;
  date: string;
  appointments: Appointment[];
  blocks: ScheduleBlock[];
  onEdit: (appointment: Appointment) => void;
  onCreate: (hairdresserId: HairdresserId, time: string) => void;
}) {
  const slots = useMemo(() => buildSlotsForHairdresser(hairdresserId, date, appointments, blocks), [appointments, blocks, date, hairdresserId]);
  const busyCount = appointments.filter((appointment) => appointment.hairdresser_id === hairdresserId && appointment.status !== "cancelled").length;

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-black text-ink">{getHairdresserName(hairdresserId)}</h2>
        <span className="rounded-[8px] bg-moss/10 px-3 py-1 text-sm font-bold text-moss">{busyCount} citas</span>
      </div>
      <div className="space-y-1">
        {slots.map((slot) => (
          <SlotRow key={`${hairdresserId}-${slot.time}`} slot={slot} onEdit={onEdit} onCreate={(time) => onCreate(hairdresserId, time)} />
        ))}
      </div>
    </section>
  );
}

function WeekView({ date, appointments, blocks, onSelectDate }: { date: string; appointments: Appointment[]; blocks: ScheduleBlock[]; onSelectDate: (date: string) => void }) {
  const weekStart = getWeekStart(date);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <section className="mt-5 grid gap-2">
      {days.map((day) => {
        const dayAppointments = appointments.filter((appointment) => appointment.date === day);
        const dayBlocks = blocks.filter((block) => block.start_date <= day && block.end_date >= day);
        const dayNumber = new Date(`${day}T00:00:00`).getDay();
        return (
          <button key={day} onClick={() => onSelectDate(day)} className={clsx("rounded-[8px] border p-3 text-left", day === date ? "border-moss bg-moss text-white" : "border-line bg-white")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase opacity-75">{dayNumber === 0 ? "Domingo cerrado" : formatDateShort(day)}</p>
                <p className="mt-1 text-lg font-black">{dayAppointments.length} citas</p>
              </div>
              <CalendarDays size={22} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {HAIRDRESSERS.map((hairdresser) => (
                <span key={hairdresser.id} className={clsx("rounded-[8px] px-2 py-1 font-semibold", day === date ? "bg-white/15" : "bg-paper")}>
                  {hairdresser.name}: {getAvailableSlots(hairdresser.id, day, dayAppointments, 15, dayBlocks).length}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </section>
  );
}

function AppointmentModal({
  open,
  form,
  services,
  appointments,
  blocks,
  onClose,
  onChange,
  onSave,
  onDelete
}: {
  open: boolean;
  form: FormState;
  services: Service[];
  appointments: Appointment[];
  blocks: ScheduleBlock[];
  onClose: () => void;
  onChange: (form: FormState) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const availableStarts = useMemo(() => {
    const occupied = appointments.filter((appointment) => appointment.id !== form.id);
    const generated = generateSlots(form.hairdresser_id, form.date, form.duration_minutes);
    const available = getAvailableSlots(form.hairdresser_id, form.date, occupied, form.duration_minutes, blocks);
    return Array.from(new Set([form.start_time, ...available, ...generated])).sort();
  }, [appointments, blocks, form.date, form.duration_minutes, form.hairdresser_id, form.id, form.start_time]);
  const currentAppointment = appointments.find((appointment) => appointment.id === form.id);

  if (!open) return null;

  async function save() {
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/45 px-3 py-4 backdrop-blur-sm">
      <div className="mx-auto flex max-h-[calc(100vh-2rem)] max-w-md flex-col rounded-[8px] bg-paper shadow-soft">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-lg font-black text-ink">{form.id ? "Editar cita" : "Nueva cita"}</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-[8px] border border-line bg-white" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          <div className="grid gap-3">
            <label className="text-sm font-bold text-ink">Cliente
              <input value={form.client_name} onChange={(event) => onChange({ ...form, client_name: event.target.value })} className="mt-1 h-11 w-full rounded-[8px] border border-line bg-white px-3 outline-none focus:border-moss" />
            </label>
            <label className="text-sm font-bold text-ink">Teléfono
              <input value={form.client_phone} onChange={(event) => onChange({ ...form, client_phone: event.target.value })} inputMode="tel" className="mt-1 h-11 w-full rounded-[8px] border border-line bg-white px-3 outline-none focus:border-moss" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-ink">Peluquero
                <select value={form.hairdresser_id} onChange={(event) => onChange({ ...form, hairdresser_id: event.target.value as HairdresserId })} className="mt-1 h-11 w-full rounded-[8px] border border-line bg-white px-3 outline-none focus:border-moss">
                  {HAIRDRESSERS.map((hairdresser) => <option key={hairdresser.id} value={hairdresser.id}>{hairdresser.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-ink">Servicio
                <select
                  value={form.service_id}
                  onChange={(event) => {
                    const service = services.find((item) => item.id === event.target.value);
                    onChange({ ...form, service_id: event.target.value, duration_minutes: service?.duration_minutes ?? form.duration_minutes });
                  }}
                  className="mt-1 h-11 w-full rounded-[8px] border border-line bg-white px-3 outline-none focus:border-moss"
                >
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-ink">Fecha
                <input type="date" value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} className="mt-1 h-11 w-full rounded-[8px] border border-line bg-white px-3 outline-none focus:border-moss" />
              </label>
              <label className="text-sm font-bold text-ink">Hora
                <select value={form.start_time} onChange={(event) => onChange({ ...form, start_time: event.target.value })} className="mt-1 h-11 w-full rounded-[8px] border border-line bg-white px-3 outline-none focus:border-moss">
                  {availableStarts.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </label>
            </div>
            <label className="text-sm font-bold text-ink">Estado
              <select value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as AppointmentStatus })} className="mt-1 h-11 w-full rounded-[8px] border border-line bg-white px-3 outline-none focus:border-moss">
                {Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-ink">Duración
              <div className="mt-1 grid grid-cols-3 gap-2">
                {DURATIONS.map((duration) => (
                  <button key={duration} type="button" onClick={() => onChange({ ...form, duration_minutes: duration })} className={clsx("h-10 rounded-[8px] border font-black", form.duration_minutes === duration ? "border-moss bg-moss text-white" : "border-line bg-white")}>
                    {duration}
                  </button>
                ))}
              </div>
            </label>
            {form.id ? (
              <label className="text-sm font-bold text-ink">Llega tarde
                <div className="mt-1 grid grid-cols-5 gap-2">
                  {[0, 5, 10, 15, 20].map((delay) => (
                    <button key={delay} type="button" onClick={() => onChange({ ...form, delay_minutes: delay })} className={clsx("h-10 rounded-[8px] border font-black", form.delay_minutes === delay ? "border-honey bg-honey text-ink" : "border-line bg-white")}>
                      {delay === 0 ? "0" : `+${delay}`}
                    </button>
                  ))}
                </div>
              </label>
            ) : null}
            {currentAppointment ? (
              <div className="rounded-[8px] border border-line bg-white p-3 text-sm text-ink/70">
                <p className="font-black text-ink">Pago</p>
                <p className="mt-1">Estado: {paymentStatusLabels[currentAppointment.payment_status] ?? currentAppointment.payment_status}</p>
                <p>Importe: {currentAppointment.amount_paid_cents ? `${(currentAppointment.amount_paid_cents / 100).toFixed(2)} ${currentAppointment.currency.toUpperCase()}` : "Pendiente"}</p>
                <p>Fecha pago: {currentAppointment.paid_at ? new Date(currentAppointment.paid_at).toLocaleString("es-ES") : "Sin pago"}</p>
                {currentAppointment.stripe_checkout_session_id ? <p className="truncate">Stripe: {currentAppointment.stripe_checkout_session_id}</p> : null}
              </div>
            ) : null}
            <label className="text-sm font-bold text-ink">Notas
              <textarea value={form.notes} onChange={(event) => onChange({ ...form, notes: event.target.value })} rows={3} className="mt-1 w-full rounded-[8px] border border-line bg-white px-3 py-2 outline-none focus:border-moss" />
            </label>
          </div>
        </div>
        <div className="safe-bottom border-t border-line p-4">
          <div className="flex gap-2">
            {form.id ? <button onClick={onDelete} className="grid h-12 w-12 place-items-center rounded-[8px] border border-clay/30 bg-white text-clay" aria-label="Borrar"><Trash2 size={20} /></button> : null}
            <button disabled={saving} onClick={save} className="h-12 flex-1 rounded-[8px] bg-moss px-4 font-black text-white disabled:opacity-60">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchView({ paymentFilter, onEdit }: { paymentFilter: PaymentFilter; onEdit: (appointment: Appointment) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const payload = await response.json().catch(() => ({ clients: [] }));
      setResults(payload.clients ?? []);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <section className="mt-5">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-ink/45" size={20} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre o teléfono" className="h-12 w-full rounded-[8px] border border-line bg-white pl-10 pr-3 outline-none focus:border-moss" />
      </div>
      <div className="mt-3 space-y-3">
        {results.map((client) => (
          <article key={client.id} className="rounded-[8px] border border-line bg-white p-3">
            <p className="text-lg font-black text-ink">{client.name}</p>
            <p className="mt-1 text-sm font-semibold text-moss">{client.phone}</p>
            <div className="mt-3 space-y-2">
              {(client.appointments ?? []).filter((appointment) => matchesPaymentFilter(appointment, paymentFilter)).map((appointment) => (
                <button key={appointment.id} onClick={() => onEdit({ ...appointment, clients: client })} className="w-full rounded-[8px] bg-paper px-3 py-2 text-left text-sm">
                  <span className="font-black">{appointment.date}</span> · {appointment.start_time.slice(0, 5)} · {appointment.services?.name ?? "Servicio"}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PublicBookingsView({ onEdit }: { onEdit: (appointment: Appointment) => void }) {
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [hairdresserId, setHairdresserId] = useState<HairdresserId | "all">("all");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBookings() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        hairdresser_id: hairdresserId,
        status
      });
      const response = await fetch(`/api/public-bookings?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));
      setLoading(false);

      if (!response.ok) {
        setError(payload.error ?? "No se pudieron cargar las reservas web.");
        return;
      }

      setUpcoming(payload.upcoming ?? []);
      setHistory(payload.history ?? []);
    }

    void loadBookings();
  }, [hairdresserId, status]);

  function BookingCard({ appointment }: { appointment: Appointment }) {
    return (
      <button
        type="button"
        onClick={() => onEdit(appointment)}
        className="w-full rounded-[8px] border border-line bg-white p-3 text-left shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-black text-ink">{appointment.clients?.name ?? "Cliente"}</p>
            <p className="mt-1 text-sm font-semibold text-moss">{appointment.clients?.phone ?? "Sin teléfono"}</p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
        <div className="mt-3 grid gap-1 text-sm font-semibold text-ink/70">
          <p>{formatDateShort(appointment.date)} · {appointment.start_time.slice(0, 5)}</p>
          <p>{appointment.services?.name ?? "Servicio"} · {appointment.hairdressers?.name ?? "Peluquero"}</p>
        </div>
      </button>
    );
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-[8px] border border-line bg-white p-3">
        <p className="font-black text-ink">Reservas hechas por la web</p>
        <p className="mt-1 text-sm font-semibold text-ink/60">
          Consulta las próximas citas públicas y el histórico reciente.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={hairdresserId}
            onChange={(event) => setHairdresserId(event.target.value as HairdresserId | "all")}
            className="h-11 rounded-[8px] border border-line bg-paper px-3 text-sm font-black"
          >
            <option value="all">Todos</option>
            {HAIRDRESSERS.map((hairdresser) => (
              <option key={hairdresser.id} value={hairdresser.id}>{hairdresser.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AppointmentStatus | "all")}
            className="h-11 rounded-[8px] border border-line bg-paper px-3 text-sm font-black"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-[8px] border border-clay/30 bg-clay/10 p-3 text-sm font-semibold text-clay">
          {error}
        </div>
      ) : null}

      <div className="rounded-[8px] border border-line bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-moss" />
            <h2 className="font-black text-ink">Próximas reservas web</h2>
          </div>
          <span className="rounded-[8px] bg-moss/10 px-2 py-1 text-xs font-black text-moss">{upcoming.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {loading ? <p className="text-sm font-semibold text-ink/55">Cargando...</p> : null}
          {!loading && !upcoming.length ? <p className="text-sm font-semibold text-ink/55">No hay reservas web futuras.</p> : null}
          {upcoming.map((appointment) => <BookingCard key={appointment.id} appointment={appointment} />)}
        </div>
      </div>

      <div className="rounded-[8px] border border-line bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-ink/60" />
            <h2 className="font-black text-ink">Histórico web reciente</h2>
          </div>
          <span className="rounded-[8px] bg-paper px-2 py-1 text-xs font-black text-ink/60">{history.length}</span>
        </div>
        <div className="mt-3 space-y-2">
          {loading ? <p className="text-sm font-semibold text-ink/55">Cargando...</p> : null}
          {!loading && !history.length ? <p className="text-sm font-semibold text-ink/55">Todavía no hay histórico web.</p> : null}
          {history.map((appointment) => <BookingCard key={appointment.id} appointment={appointment} />)}
        </div>
      </div>
    </section>
  );
}

function ServicesView({ services, onReload }: { services: Service[]; onReload: () => Promise<void> }) {
  const [draft, setDraft] = useState({ name: "", duration_minutes: 15, price: "", description: "" });

  async function createService(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, active: true })
    });
    setDraft({ name: "", duration_minutes: 15, price: "", description: "" });
    await onReload();
  }

  async function toggle(service: Service) {
    await fetch(`/api/services/${service.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...service, active: !service.active })
    });
    await onReload();
  }

  return (
    <section className="mt-5 space-y-3">
      <form onSubmit={createService} className="rounded-[8px] border border-line bg-white p-3">
        <p className="font-black text-ink">Nuevo servicio</p>
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Nombre" className="mt-3 h-11 w-full rounded-[8px] border border-line bg-paper px-3 outline-none focus:border-moss" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={draft.duration_minutes} onChange={(event) => setDraft({ ...draft, duration_minutes: Number(event.target.value) })} className="h-11 rounded-[8px] border border-line bg-paper px-3">
            {DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} min</option>)}
          </select>
          <input value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="Precio" inputMode="decimal" className="h-11 rounded-[8px] border border-line bg-paper px-3" />
        </div>
        <button className="mt-3 h-11 w-full rounded-[8px] bg-moss font-black text-white">Crear servicio</button>
      </form>
      {services.map((service) => (
        <article key={service.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-white p-3">
          <div>
            <p className="font-black text-ink">{service.name}</p>
            <p className="text-sm font-semibold text-ink/60">{service.duration_minutes} min{service.price ? ` · ${service.price} €` : ""}</p>
          </div>
          <button onClick={() => toggle(service)} className={clsx("h-10 rounded-[8px] px-3 font-black", service.active ? "bg-moss text-white" : "bg-paper text-ink")}>
            {service.active ? "Activo" : "Pausado"}
          </button>
        </article>
      ))}
    </section>
  );
}

function BlocksView({ blocks, onReload }: { blocks: ScheduleBlock[]; onReload: () => Promise<void> }) {
  const [draft, setDraft] = useState({
    title: "",
    block_type: "other" as BlockType,
    hairdresser_id: HAIRDRESSER_IDS.alberto as HairdresserId,
    affects_all_hairdressers: true,
    start_date: getTodayKey(),
    end_date: getTodayKey(),
    all_day: true,
    start_time: "09:00",
    end_time: "10:00",
    internal_reason: "",
    visible_to_clients: false
  });

  async function createBlock(event: FormEvent) {
    event.preventDefault();
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    setDraft({ ...draft, title: "", internal_reason: "" });
    await onReload();
  }

  async function remove(id: string) {
    if (!window.confirm("¿Borrar este bloqueo?")) return;
    await fetch(`/api/blocks/${id}`, { method: "DELETE" });
    await onReload();
  }

  return (
    <section className="mt-5 space-y-3">
      <form onSubmit={createBlock} className="rounded-[8px] border border-line bg-white p-3">
        <p className="font-black text-ink">Nuevo bloqueo</p>
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Título" className="mt-3 h-11 w-full rounded-[8px] border border-line bg-paper px-3" />
        <select value={draft.block_type} onChange={(event) => setDraft({ ...draft, block_type: event.target.value as BlockType })} className="mt-2 h-11 w-full rounded-[8px] border border-line bg-paper px-3">
          {Object.entries(blockTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input type="date" value={draft.start_date} onChange={(event) => setDraft({ ...draft, start_date: event.target.value })} className="h-11 rounded-[8px] border border-line bg-paper px-3" />
          <input type="date" value={draft.end_date} onChange={(event) => setDraft({ ...draft, end_date: event.target.value })} className="h-11 rounded-[8px] border border-line bg-paper px-3" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" checked={draft.affects_all_hairdressers} onChange={(event) => setDraft({ ...draft, affects_all_hairdressers: event.target.checked })} />
          Afecta a ambos
        </label>
        {!draft.affects_all_hairdressers ? (
          <select value={draft.hairdresser_id} onChange={(event) => setDraft({ ...draft, hairdresser_id: event.target.value as HairdresserId })} className="mt-2 h-11 w-full rounded-[8px] border border-line bg-paper px-3">
            {HAIRDRESSERS.map((hairdresser) => <option key={hairdresser.id} value={hairdresser.id}>{hairdresser.name}</option>)}
          </select>
        ) : null}
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" checked={draft.all_day} onChange={(event) => setDraft({ ...draft, all_day: event.target.checked })} />
          Todo el día
        </label>
        {!draft.all_day ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input type="time" value={draft.start_time} onChange={(event) => setDraft({ ...draft, start_time: event.target.value })} className="h-11 rounded-[8px] border border-line bg-paper px-3" />
            <input type="time" value={draft.end_time} onChange={(event) => setDraft({ ...draft, end_time: event.target.value })} className="h-11 rounded-[8px] border border-line bg-paper px-3" />
          </div>
        ) : null}
        <textarea value={draft.internal_reason} onChange={(event) => setDraft({ ...draft, internal_reason: event.target.value })} placeholder="Motivo interno" rows={2} className="mt-2 w-full rounded-[8px] border border-line bg-paper px-3 py-2" />
        <button className="mt-3 h-11 w-full rounded-[8px] bg-moss font-black text-white">Crear bloqueo</button>
      </form>
      {blocks.map((block) => (
        <article key={block.id} className="rounded-[8px] border border-line bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-ink">{block.title}</p>
              <p className="text-sm font-semibold text-ink/60">{blockTypeLabels[block.block_type]} · {block.start_date} a {block.end_date}</p>
            </div>
            <button onClick={() => remove(block.id)} className="grid h-10 w-10 place-items-center rounded-[8px] border border-clay/30 text-clay"><Trash2 size={18} /></button>
          </div>
        </article>
      ))}
    </section>
  );
}

export function AgendaApp() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [date, setDate] = useState(getTodayKey());
  const [view, setView] = useState<ViewMode>("hoy");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [form, setForm] = useState<FormState>(initialForm(getTodayKey()));
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  const loadServices = useCallback(async () => {
    const response = await fetch("/api/services");
    const payload = await response.json().catch(() => ({ services: INITIAL_SERVICES }));
    setServices(payload.services?.length ? payload.services : INITIAL_SERVICES);
  }, []);

  const loadData = useCallback(async (targetDate = date) => {
    const from = getWeekStart(targetDate);
    const to = addDays(from, 6);
    const [appointmentsResponse, blocksResponse] = await Promise.all([
      fetch(`/api/appointments?from=${from}&to=${to}`),
      fetch(`/api/blocks?from=${from}&to=${to}`)
    ]);
    if (appointmentsResponse.status === 401) {
      setUser(null);
      return;
    }
    const appointmentsPayload = await appointmentsResponse.json().catch(() => ({ appointments: [] }));
    const blocksPayload = await blocksResponse.json().catch(() => ({ blocks: [] }));
    setAppointments(appointmentsPayload.appointments ?? []);
    setBlocks(blocksPayload.blocks ?? []);
  }, [date]);

  useEffect(() => {
    fetch("/api/session")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        setUser(response.ok ? payload.user : null);
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user) {
      void loadServices();
      void loadData(date);
    }
  }, [date, loadData, loadServices, user]);

  function newAppointment(hairdresserId = HAIRDRESSER_IDS.alberto as HairdresserId, time?: string) {
    const service = services[0] ?? INITIAL_SERVICES[0];
    const starts = generateSlots(hairdresserId, date, service.duration_minutes);
    setForm({ ...initialForm(date, service.id), hairdresser_id: hairdresserId, start_time: time ?? starts[0] ?? "08:45" });
    setModalOpen(true);
  }

  function editAppointment(appointment: Appointment) {
    setForm(appointmentToForm(appointment));
    setModalOpen(true);
  }

  async function saveAppointment() {
    setError("");
    const payload: AppointmentInput = { ...form, source: "admin" };
    const response = await fetch(form.id ? `/api/appointments/${form.id}` : "/api/appointments", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "No se pudo guardar la cita.");
      return;
    }

    setModalOpen(false);
    await loadData(form.date);
  }

  async function deleteAppointment() {
    if (!form.id) return;
    if (!window.confirm("¿Borrar esta cita?")) return;
    const response = await fetch(`/api/appointments/${form.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error ?? "No se pudo borrar la cita.");
      return;
    }
    setModalOpen(false);
    await loadData(date);
  }

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    setUser(null);
  }

  if (user === undefined) {
    return <main className="grid min-h-screen place-items-center px-5 text-lg font-black text-moss">Gentleman</main>;
  }

  if (!user) return <LoginScreen onLogin={setUser} />;

  const filteredAppointments = appointments.filter((appointment) => matchesPaymentFilter(appointment, paymentFilter));
  const dayAppointments = filteredAppointments.filter((appointment) => appointment.date === date);
  const dayBlocks = blocks.filter((block) => block.start_date <= date && block.end_date >= date);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-4 safe-bottom">
      <header className="sticky top-0 z-20 -mx-4 border-b border-line/70 bg-paper/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Gentleman</p>
            <h1 className="text-2xl font-black text-ink">Agenda Peluquería</h1>
          </div>
          <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-[8px] border border-line bg-white" aria-label="Salir">
            <LogOut size={18} />
          </button>
        </div>
        <nav className="mt-4 grid grid-cols-4 gap-2">
          {[
            ["hoy", "Hoy", CalendarDays],
            ["semana", "Semana", Clock3],
            ["web", "Web", Globe],
            ["ajustes", "Más", Settings]
          ].map(([id, label, Icon]) => (
            <button key={id as string} onClick={() => setView(id as ViewMode)} className={clsx("flex h-11 items-center justify-center gap-1 rounded-[8px] border text-xs font-black", view === id ? "border-moss bg-moss text-white" : "border-line bg-white text-ink")}>
              <Icon size={16} />
              {label as string}
            </button>
          ))}
        </nav>
      </header>

      <div className="mt-4">
        <DayPicker date={date} onChange={setDate} />
      </div>
      {view !== "web" && view !== "ajustes" && view !== "bloqueos" && view !== "servicios" ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {paymentFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setPaymentFilter(filter.id)}
              className={clsx(
                "h-9 shrink-0 rounded-[8px] border px-3 text-xs font-black",
                paymentFilter === filter.id ? "border-moss bg-moss text-white" : "border-line bg-white text-ink"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <div className="mt-3 rounded-[8px] border border-clay/30 bg-clay/10 p-3 text-sm font-semibold text-clay">{error}</div> : null}

      {view === "hoy" || view === "agenda" ? (
        <>
          <HairdresserAgenda hairdresserId={HAIRDRESSER_IDS.alberto} date={date} appointments={dayAppointments} blocks={dayBlocks} onEdit={editAppointment} onCreate={newAppointment} />
          <HairdresserAgenda hairdresserId={HAIRDRESSER_IDS.ruben} date={date} appointments={dayAppointments} blocks={dayBlocks} onEdit={editAppointment} onCreate={newAppointment} />
        </>
      ) : null}

      {view === "semana" ? <WeekView date={date} appointments={filteredAppointments} blocks={blocks} onSelectDate={(nextDate) => { setDate(nextDate); setView("hoy"); }} /> : null}
      {view === "web" ? <PublicBookingsView onEdit={editAppointment} /> : null}
      {view === "clientes" || view === "citas" ? <SearchView paymentFilter={paymentFilter} onEdit={editAppointment} /> : null}
      {view === "bloqueos" ? <BlocksView blocks={blocks} onReload={() => loadData(date)} /> : null}
      {view === "servicios" ? <ServicesView services={services} onReload={loadServices} /> : null}
      {view === "ajustes" ? (
        <section className="mt-5 grid gap-3">
          <button onClick={() => setView("bloqueos")} className="flex h-14 items-center gap-3 rounded-[8px] border border-line bg-white px-4 text-left font-black text-ink"><Shield size={20} /> Bloqueos, festivos y vacaciones</button>
          <button onClick={() => setView("clientes")} className="flex h-14 items-center gap-3 rounded-[8px] border border-line bg-white px-4 text-left font-black text-ink"><Search size={20} /> Clientes e historial por persona</button>
          <button onClick={() => setView("servicios")} className="flex h-14 items-center gap-3 rounded-[8px] border border-line bg-white px-4 text-left font-black text-ink"><Settings size={20} /> Servicios</button>
          <div className="rounded-[8px] border border-line bg-white p-4 text-sm text-ink/70">
            <p className="font-black text-ink">Ajustes iniciales</p>
            <p className="mt-2">Reservas públicas confirmadas automáticamente, antelación mínima recomendada de 2 horas y máximo de 60 días hacia adelante.</p>
          </div>
        </section>
      ) : null}

      <button onClick={() => newAppointment()} className="fixed bottom-5 left-1/2 z-30 flex h-14 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-center gap-2 rounded-[8px] bg-ink px-5 text-base font-black text-white shadow-soft">
        <Plus size={22} />
        Nueva cita
      </button>

      <AppointmentModal
        open={modalOpen}
        form={form}
        services={services}
        appointments={dayAppointments}
        blocks={dayBlocks}
        onClose={() => setModalOpen(false)}
        onChange={(nextForm) => {
          setError("");
          setForm(nextForm);
        }}
        onSave={saveAppointment}
        onDelete={deleteAppointment}
      />
    </main>
  );
}
