"use client";

import Image from "next/image";
import { CalendarDays, Clock3, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { buildWhatsAppUrl, formatDateShort, getTodayKey } from "@/lib/date";
import { getDayTimelineSlots, isWithinWorkingHours } from "@/lib/availability";
import { HAIRDRESSER_IDS, HAIRDRESSERS, INITIAL_SERVICES } from "@/lib/schedule";
import type { HairdresserId, ServiceDuration } from "@/lib/types";

type HairdresserChoice = HairdresserId | "any";
type FakeSlotStatus = "free" | "occupied" | "away" | "closed";
type FakeSlot = {
  time: string;
  hairdresser_id: HairdresserId;
  hairdresser_name: string;
  status: FakeSlotStatus;
};
const PENDING_BOOKING_KEY = "gentleman_pending_booking";
const LAST_MANAGE_URL_KEY = "gentleman_last_manage_url";
const LAST_BOOKING_SUMMARY_KEY = "gentleman_last_booking_summary";
const SELECTED_SERVICE = INITIAL_SERVICES[0];
const DEFAULT_CONTACT_PHONE = "+34655874680";
const WHATSAPP_PHONE = DEFAULT_CONTACT_PHONE;
const DEBUG_CLIENT_PHONE = "647623713";
const hairdresserPhones: Record<HairdresserId, string> = {
  [HAIRDRESSER_IDS.alberto]: process.env.NEXT_PUBLIC_ALBERTO_PHONE ?? DEFAULT_CONTACT_PHONE,
  [HAIRDRESSER_IDS.ruben]: process.env.NEXT_PUBLIC_RUBEN_PHONE ?? DEFAULT_CONTACT_PHONE
};

function buildDisplaySlots(
  date: string,
  hairdresserId: HairdresserChoice,
  duration: ServiceDuration,
  availableSlots: Array<{ time: string; hairdresser_id: HairdresserId; hairdresser_name: string }>
): FakeSlot[] {
  const hairdressers = hairdresserId === "any"
    ? HAIRDRESSERS
    : HAIRDRESSERS.filter((hairdresser) => hairdresser.id === hairdresserId);
  const day = new Date(`${date}T00:00:00`).getDay();
  const timeline = getDayTimelineSlots(date);
  const availableKeys = new Set(availableSlots.map((slot) => `${slot.hairdresser_id}-${slot.time}`));

  return hairdressers.flatMap((hairdresser) =>
    timeline.map((time) => {
      const insideWorkingHours = day !== 0 && isWithinWorkingHours(hairdresser.id, date, time, duration);
      const status: FakeSlotStatus = !insideWorkingHours
        ? "closed"
        : availableKeys.has(`${hairdresser.id}-${time}`)
          ? "free"
          : "occupied";

      return {
        time,
        hairdresser_id: hairdresser.id,
        hairdresser_name: hairdresser.name,
        status
      };
    })
  );
}

export function PublicBookingApp() {
  const isDebugPaymentMode =
    process.env.NEXT_PUBLIC_DEBUG_BYPASS_STRIPE?.trim() === "true" ||
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const [hairdresserId, setHairdresserId] = useState<HairdresserChoice>("any");
  const [date, setDate] = useState(getTodayKey());
  const [selectedSlot, setSelectedSlot] = useState<FakeSlot | null>(null);
  const [clientName, setClientName] = useState("");
  const [countryCode, setCountryCode] = useState("+34");
  const [clientPhone, setClientPhone] = useState(isDebugPaymentMode ? DEBUG_CLIENT_PHONE : "");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; hairdresser_id: HairdresserId; hairdresser_name: string }>>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const slots = useMemo(
    () => buildDisplaySlots(date, hairdresserId, SELECTED_SERVICE.duration_minutes, availableSlots),
    [availableSlots, date, hairdresserId]
  );

  const visibleHairdressers = hairdresserId === "any"
    ? HAIRDRESSERS
    : HAIRDRESSERS.filter((hairdresser) => hairdresser.id === hairdresserId);

  useEffect(() => {
    async function loadAvailability() {
      setAvailabilityLoading(true);
      const params = new URLSearchParams({
        date,
        duration: String(SELECTED_SERVICE.duration_minutes),
        hairdresser_id: hairdresserId
      });
      const response = await fetch(`/api/availability?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));
      setAvailabilityLoading(false);
      if (!response.ok) {
        setError(payload.error ?? "No se pudieron cargar los huecos disponibles.");
        return;
      }
      setAvailableSlots(payload.slots ?? []);
    }

    void loadAvailability();
  }, [date, hairdresserId]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [date, hairdresserId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSlot) {
      setError("Elige una hora libre.");
      return;
    }

    setConfirmOpen(true);
  }

  async function confirmBooking() {
    if (!selectedSlot) return;
    setLoading(true);
    setError("");
    setConfirmOpen(false);

    const bookingPayload = {
      client_name: clientName,
      client_phone: `${countryCode}${clientPhone}`,
      client_email: clientEmail,
      notes,
      service_id: SELECTED_SERVICE.id,
      duration_minutes: SELECTED_SERVICE.duration_minutes as ServiceDuration,
      hairdresser_id: selectedSlot.hairdresser_id,
      date,
      start_time: selectedSlot.time
    };

    window.localStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(bookingPayload));

    const response = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: bookingPayload.client_name,
        client_phone: bookingPayload.client_phone,
        client_email: bookingPayload.client_email,
        notes: bookingPayload.notes,
        service_id: bookingPayload.service_id,
        duration_minutes: bookingPayload.duration_minutes,
        hairdresser_id: bookingPayload.hairdresser_id,
        date: bookingPayload.date,
        start_time: bookingPayload.start_time
      })
    }).catch(() => null);

    if (response && !response.ok) {
      const payload = await response.json().catch(() => ({}));
      setLoading(false);
      setError(payload.error ?? "No se pudo confirmar la reserva.");
      return;
    }

    const payload = await response?.json().catch(() => ({}));
    if (!payload?.url) {
      setLoading(false);
      setError("No se pudo continuar con la reserva.");
      return;
    }

    if (payload.simulated_payment && payload.manage_url) {
      const bookingSummary = {
        date,
        start_time: selectedSlot.time,
        hairdresser_name: selectedSlot.hairdresser_name,
        client_phone: `${countryCode}${clientPhone}`
      };

      window.localStorage.setItem(LAST_MANAGE_URL_KEY, payload.manage_url);
      window.localStorage.setItem(LAST_BOOKING_SUMMARY_KEY, JSON.stringify(bookingSummary));
      window.location.href = payload.url;
      return;
    }

    window.location.href = payload.url;
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-3 safe-bottom sm:px-4 md:px-6">
      <header className="overflow-hidden rounded-[8px] bg-black text-white shadow-soft">
        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/icono-servicios.jpg"
              alt=""
              width={42}
              height={72}
              className="h-16 w-10 rounded-[8px] object-cover"
              priority
            />
            <div className="min-w-0">
              <Image
                src="/brand/logo-web-_gentleman.png"
                alt="Gentleman Peluqueria de Caballeros"
                width={360}
                height={63}
                className="h-auto w-[min(260px,60vw)] object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-center text-2xl font-black leading-tight text-white sm:text-3xl">Reserva tu cita</h1>
          <div className="rounded-[8px] bg-white/10 px-3 py-2 text-center sm:text-right">
            <p className="text-[11px] font-bold uppercase text-white/60">Dia elegido</p>
            <p className="text-sm font-black">{formatDateShort(date)}</p>
          </div>
        </div>
      </header>

      {error ? (
        <div className="mt-4 rounded-[8px] border border-clay/30 bg-clay/10 p-3 text-sm font-semibold text-clay">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-3 grid gap-3 lg:grid-cols-[300px_1fr]">
        <section className="rounded-[8px] border border-line bg-white p-3 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-wide text-black">Elige tu Peluquero</label>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button type="button" onClick={() => setHairdresserId("any")} className={clsx("h-10 rounded-[8px] border text-xs font-black", hairdresserId === "any" ? "border-[#0057ff] bg-[#0057ff] text-white shadow-sm" : "border-line bg-paper")}>Cualquiera</button>
            {HAIRDRESSERS.map((hairdresser) => (
              <button key={hairdresser.id} type="button" onClick={() => setHairdresserId(hairdresser.id)} className={clsx("h-10 rounded-[8px] border text-xs font-black", hairdresserId === hairdresser.id ? "border-[#0057ff] bg-[#0057ff] text-white shadow-sm" : "border-line bg-paper")}>
                {hairdresser.name}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-[8px] border border-[#0057ff]/20 bg-[#0057ff]/5 p-3">
            <p className="text-xs font-bold leading-snug text-ink/70">
              Si lo prefieres, puedes llamar directamente.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {HAIRDRESSERS.map((hairdresser) => {
                const phone = hairdresserPhones[hairdresser.id];
                return (
                  <a
                    key={hairdresser.id}
                    href={phone ? `tel:${phone}` : undefined}
                    aria-disabled={!phone}
                    className={clsx(
                      "flex h-10 items-center justify-center rounded-[8px] border text-sm font-black",
                      phone ? "border-[#0057ff] bg-[#0057ff] text-white" : "pointer-events-none border-line bg-paper text-ink/35"
                    )}
                  >
                    Llamar a {hairdresser.name}
                  </a>
                );
              })}
            </div>
            <a
              href={buildWhatsAppUrl(WHATSAPP_PHONE, "Hola, quiero consultar una cita en Gentleman.")}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex h-10 items-center justify-center rounded-[8px] border border-lime-500 bg-lime-500 text-sm font-black text-lime-950"
            >
              Enviar WhatsApp
            </a>
            <p className="mt-3 text-xs font-semibold leading-snug text-ink/60">
              Tras confirmar la reserva, verás en esta misma web las opciones para modificarla o anularla.
            </p>
          </div>

          <label className="mt-3 block text-xs font-black uppercase tracking-wide text-black">Fecha</label>
          <div className="relative mt-1">
            <CalendarDays className="pointer-events-none absolute left-3 top-3 text-ink/45" size={18} />
          <input
            type="date"
            value={date}
            min={getTodayKey()}
            onChange={(event) => setDate(event.target.value)}
            className="h-11 w-full rounded-[8px] border border-line bg-paper pl-10 pr-3 text-center font-black outline-none focus:border-[#0057ff]"
          />
          </div>

          <div className="mt-3 grid gap-2">
            <label className="text-xs font-black uppercase tracking-wide text-black">Nombre
              <input value={clientName} onChange={(event) => setClientName(event.target.value)} className="mt-1 h-10 w-full rounded-[8px] border border-line bg-paper px-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-[#0057ff]" required />
            </label>
            <label className="text-xs font-black uppercase tracking-wide text-black">Telefono
              <div className="mt-1 grid grid-cols-[104px_minmax(0,1fr)] overflow-hidden rounded-[8px] border border-line bg-paper focus-within:border-[#0057ff]">
                <select
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className="h-11 w-full border-r border-line bg-white px-2 text-sm font-black normal-case tracking-normal outline-none"
                  aria-label="Codigo de pais"
                >
                  <option value="+34">ES +34</option>
                  <option value="+33">FR +33</option>
                  <option value="+351">PT +351</option>
                  <option value="+39">IT +39</option>
                  <option value="+44">UK +44</option>
                  <option value="+49">DE +49</option>
                </select>
                <input
                  value={clientPhone}
                  onChange={(event) => setClientPhone(event.target.value)}
                  inputMode="tel"
                  placeholder="655 874 680"
                  className="h-11 min-w-0 bg-paper px-3 text-base font-semibold normal-case tracking-normal outline-none"
                  required
                />
              </div>
            </label>
            <label className="text-xs font-black uppercase tracking-wide text-black">Email
              <input
                value={clientEmail}
                onChange={(event) => setClientEmail(event.target.value)}
                type="email"
                placeholder="tu@email.com"
                className="mt-1 h-10 w-full rounded-[8px] border border-line bg-paper px-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-[#0057ff]"
                required
              />
            </label>
          </div>

          <label className="mt-3 block text-xs font-black uppercase tracking-wide text-black">Notas
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-1 w-full rounded-[8px] border border-line bg-paper px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none focus:border-[#0057ff]" />
          </label>

        </section>

        <section className="rounded-[8px] border border-line bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-ink">Horarios</h2>
              <p className="text-sm font-semibold text-ink/55">Pulsa una hora verde.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-black text-ink/65 sm:flex">
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-lime-400" />Libre</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-slate-300" />Ocupado</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-slate-200" />No esta</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-slate-100 ring-1 ring-slate-200" />Cerrado</span>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {visibleHairdressers.map((hairdresser) => {
              const hairdresserSlots = slots.filter((slot) => slot.hairdresser_id === hairdresser.id);
              const freeCount = hairdresserSlots.filter((slot) => slot.status === "free").length;

              return (
                <div key={hairdresser.id} className="rounded-[8px] border border-line bg-paper/60 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-base font-black text-ink">{hairdresser.name}</h3>
                    <span className="rounded-[8px] bg-lime-200 px-2 py-1 text-xs font-black text-lime-950">
                      {availabilityLoading ? "..." : `${freeCount} libres`}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
                    {hairdresserSlots.map((slot) => {
                      const selected = selectedSlot?.time === slot.time && selectedSlot.hairdresser_id === slot.hairdresser_id;
                      return (
                        <button
                          key={`${slot.hairdresser_id}-${slot.time}`}
                          type="button"
                          disabled={slot.status !== "free"}
                          onClick={() => setSelectedSlot(slot)}
                          className={clsx(
                            "h-9 rounded-[8px] border text-center text-[11px] font-black leading-none transition",
                            selected && "scale-[1.03] border-[#0057ff] bg-[#0057ff] text-white shadow-sm",
                            !selected && slot.status === "free" && "border-lime-400 bg-lime-300 text-lime-950 shadow-sm hover:bg-lime-200",
                            !selected && slot.status === "occupied" && "border-slate-200 bg-slate-200/45 text-slate-500 opacity-55",
                            !selected && slot.status === "away" && "border-slate-200 bg-slate-200/30 text-slate-400 opacity-50",
                            !selected && slot.status === "closed" && "border-slate-100 bg-white/45 text-slate-300 opacity-45",
                            slot.status !== "free" && "cursor-not-allowed"
                          )}
                        >
                          <span className="block">{slot.time}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(142px,220px)] items-stretch gap-2">
            <div className="flex h-12 min-w-0 items-center gap-2 rounded-[8px] border border-line bg-paper px-3 text-sm font-semibold text-ink">
              <Clock3 className="shrink-0 text-[#0057ff]" size={18} />
              <p className="min-w-0 truncate">
                {selectedSlot
                  ? `Cita con ${selectedSlot.hairdresser_name} a las ${selectedSlot.time}`
                  : "Elige una hora verde."}
              </p>
            </div>

            <button disabled={!selectedSlot || loading} className="h-12 rounded-[8px] bg-[#0057ff] px-3 text-sm font-black text-white disabled:opacity-45 sm:text-base">
              {loading ? "Confirmando..." : "Confirmar reserva"}
            </button>
          </div>
        </section>
      </form>

      {confirmOpen && selectedSlot ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-[8px] bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0057ff]">Confirmar</p>
                <h2 className="mt-1 text-2xl font-black text-ink">
                  {isDebugPaymentMode ? "Confirmar reserva" : "Pagar reserva"}
                </h2>
              </div>
              <button type="button" onClick={() => setConfirmOpen(false)} className="grid h-9 w-9 place-items-center rounded-[8px] border border-line bg-paper" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 rounded-[8px] bg-paper p-3 text-sm font-bold text-ink/75">
              <p>{formatDateShort(date)}</p>
              <p className="mt-1 text-xl font-black text-ink">{selectedSlot.time}</p>
              <p className="mt-1">Con {selectedSlot.hairdresser_name}</p>
              <p className="mt-3 rounded-[8px] bg-white p-2 text-[#0057ff]">
                {isDebugPaymentMode
                  ? "Modo depuración: se simulará el pago de 8 €."
                  : "Pago previo obligatorio: 8 €"}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="h-11 rounded-[8px] border border-line bg-paper font-black text-ink">
                Cancelar
              </button>
              <button type="button" onClick={confirmBooking} className="h-11 rounded-[8px] bg-[#0057ff] font-black text-white">
                {isDebugPaymentMode ? "Confirmar" : "Ir a pagar"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
