"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, Scissors, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { formatDateShort, getTodayKey } from "@/lib/date";
import type { Appointment, HairdresserId, ServiceDuration } from "@/lib/types";

type AvailableSlot = {
  time: string;
  hairdresser_id: HairdresserId;
  hairdresser_name: string;
};

export function ManageAppointmentApp() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [date, setDate] = useState(getTodayKey());
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canEdit = appointment?.status === "confirmed" || appointment?.status === "pending_payment";
  const serviceName = appointment?.services?.name ?? "Servicio";
  const hairdresserName = appointment?.hairdressers?.name ?? "Peluquero";

  useEffect(() => {
    async function loadAppointment() {
      setLoading(true);
      const response = await fetch(`/api/public-appointments/${encodeURIComponent(token)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "No se pudo cargar la cita.");
        setLoading(false);
        return;
      }

      setAppointment(payload.appointment);
      setDate(payload.appointment.date);
      setLoading(false);
    }

    loadAppointment();
  }, [token]);

  useEffect(() => {
    if (!appointment || !canEdit) return;
    const currentAppointment = appointment;

    async function loadSlots() {
      setError("");
      const params = new URLSearchParams({
        date,
        duration: String(currentAppointment.duration_minutes as ServiceDuration),
        hairdresser_id: currentAppointment.hairdresser_id
      });
      const response = await fetch(`/api/availability?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "No se pudieron cargar los huecos.");
        return;
      }

      setSlots(payload.slots ?? []);
      setSelectedTime("");
    }

    loadSlots();
  }, [appointment, canEdit, date]);

  const visibleSlots = useMemo(
    () => slots.filter((slot) => slot.hairdresser_id === appointment?.hairdresser_id),
    [appointment?.hairdresser_id, slots]
  );

  async function reschedule() {
    if (!selectedTime) return;
    setUpdating(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/public-appointments/${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", date, start_time: selectedTime })
    });
    const payload = await response.json().catch(() => ({}));
    setUpdating(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo modificar la cita.");
      return;
    }

    setAppointment(payload.appointment);
    setMessage("Cita modificada correctamente.");
  }

  async function cancelAppointment() {
    if (!window.confirm("¿Seguro que quieres anular la cita?")) return;
    setUpdating(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/public-appointments/${encodeURIComponent(token)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" })
    });
    const payload = await response.json().catch(() => ({}));
    setUpdating(false);

    if (!response.ok) {
      setError(payload.error ?? "No se pudo anular la cita.");
      return;
    }

    setAppointment(payload.appointment);
    setMessage("Cita anulada correctamente.");
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center font-black text-ink">Cargando cita...</main>;
  }

  if (!appointment) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8 text-center">
        <h1 className="text-3xl font-black text-ink">No encontramos la cita</h1>
        <p className="mt-3 font-semibold text-ink/70">{error || "El enlace no es válido o ha caducado."}</p>
        <Link href="/reservar" className="mt-8 rounded-[8px] bg-[#0057ff] px-5 py-4 font-black text-white">
          Volver a reservar
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 safe-bottom">
      <section className="rounded-[8px] border border-line bg-white p-4 shadow-soft">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0057ff]">Gestionar cita</p>
        <h1 className="mt-1 text-3xl font-black text-ink">{serviceName}</h1>

        <div className="mt-4 grid gap-3 rounded-[8px] bg-paper p-4 text-sm font-bold text-ink/75 sm:grid-cols-3">
          <p className="flex items-center gap-2"><CalendarDays size={18} />{formatDateShort(appointment.date)}</p>
          <p className="flex items-center gap-2"><Clock3 size={18} />{appointment.start_time.slice(0, 5)}</p>
          <p className="flex items-center gap-2"><Scissors size={18} />{hairdresserName}</p>
        </div>

        {message ? (
          <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-lime-300 bg-lime-100 p-3 text-sm font-bold text-lime-900">
            <CheckCircle2 size={18} />
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-[8px] border border-clay/30 bg-clay/10 p-3 text-sm font-semibold text-clay">
            {error}
          </div>
        ) : null}

        {canEdit ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-[220px_1fr]">
              <label className="text-xs font-black uppercase tracking-wide text-black">
                Nueva fecha
                <input
                  type="date"
                  value={date}
                  min={getTodayKey()}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1 h-11 w-full rounded-[8px] border border-line bg-paper px-3 font-black outline-none focus:border-[#0057ff]"
                />
              </label>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-black">Nueva hora</p>
                <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {visibleSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={clsx(
                        "h-11 rounded-[8px] border text-sm font-black",
                        selectedTime === slot.time
                          ? "border-[#0057ff] bg-[#0057ff] text-white"
                          : "border-lime-400 bg-lime-300 text-lime-950"
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                {!visibleSlots.length ? (
                  <p className="mt-2 text-sm font-semibold text-ink/55">No hay huecos libres ese día.</p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!selectedTime || updating}
                onClick={reschedule}
                className="h-12 rounded-[8px] bg-[#0057ff] px-4 font-black text-white disabled:opacity-45"
              >
                {updating ? "Guardando..." : "Modificar cita"}
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={cancelAppointment}
                className="flex h-12 items-center justify-center gap-2 rounded-[8px] border border-clay/30 bg-clay/10 px-4 font-black text-clay disabled:opacity-45"
              >
                <Trash2 size={18} />
                Anular cita
              </button>
              <a
                href={`/api/public-appointments/${encodeURIComponent(token)}/calendar`}
                className="flex h-12 items-center justify-center gap-2 rounded-[8px] border border-line bg-white px-4 font-black text-ink"
              >
                <CalendarDays size={18} />
                Añadir al calendario
              </a>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-[8px] border border-line bg-paper p-4 font-semibold text-ink/70">
            Esta cita ya no admite cambios desde la web.
          </div>
        )}
      </section>
    </main>
  );
}
