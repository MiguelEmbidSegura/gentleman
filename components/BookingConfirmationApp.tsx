"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const PENDING_BOOKING_KEY = "gentleman_pending_booking";
const LAST_MANAGE_URL_KEY = "gentleman_last_manage_url";
const LAST_BOOKING_SUMMARY_KEY = "gentleman_last_booking_summary";
const DEBUG_CLIENT_PHONE = "647623713";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const appointmentToken = params.get("appointment_token");
  const isDebugPayment = params.get("debug") === "1";
  const emailStatus = params.get("email_status");
  const emailTo = params.get("email_to");
  const [manageUrl, setManageUrl] = useState("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [appointment, setAppointment] = useState<{
    date?: string;
    start_time?: string;
    clients?: { phone?: string } | null;
    hairdressers?: { name?: string } | null;
    services?: { name?: string } | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const pending = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { date?: string; start_time?: string };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId && !appointmentToken) return;
    const currentSessionId = sessionId;
    const currentAppointmentToken = appointmentToken;

    async function loadConfirmation() {
      const response = currentSessionId
        ? await fetch(`/api/public-appointments/confirmation?session_id=${encodeURIComponent(currentSessionId)}`)
        : await fetch(`/api/public-appointments/${encodeURIComponent(currentAppointmentToken!)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      const nextManageUrl = payload.manage_url ?? (currentAppointmentToken ? `/reservar/gestionar/${encodeURIComponent(currentAppointmentToken)}` : "");
      const nextCalendarUrl = payload.calendar_url ?? (currentAppointmentToken ? `/api/public-appointments/${encodeURIComponent(currentAppointmentToken)}/calendar` : "");
      const nextAppointment = payload.appointment ?? null;
      setManageUrl(nextManageUrl);
      setCalendarUrl(nextCalendarUrl);
      setAppointment(nextAppointment);

      if (nextManageUrl) {
        window.localStorage.setItem(LAST_MANAGE_URL_KEY, nextManageUrl);
      }
      if (nextAppointment) {
        window.localStorage.setItem(LAST_BOOKING_SUMMARY_KEY, JSON.stringify({
          date: nextAppointment.date,
          start_time: nextAppointment.start_time,
          hairdresser_name: nextAppointment.hairdressers?.name,
          client_phone: nextAppointment.clients?.phone ?? `+34${DEBUG_CLIENT_PHONE}`
        }));
      }
    }

    loadConfirmation();
  }, [appointmentToken, sessionId]);

  async function copyManageLink() {
    if (!manageUrl) return;
    await navigator.clipboard.writeText(`${window.location.origin}${manageUrl}`);
    setCopied(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8 text-center safe-bottom">
      <CheckCircle2 className="mx-auto text-lime-700" size={52} />
      <h1 className="mt-4 text-3xl font-black text-ink">{isDebugPayment ? "Pago simulado" : "Pago recibido"}</h1>
      <p className="mt-3 font-semibold text-ink/70">
        {isDebugPayment ? "La cita se ha confirmado en modo depuración." : "La cita ha sido confirmada."}
      </p>
      {appointment || pending ? (
        <div className="mt-5 rounded-[8px] border border-line bg-white p-4 text-sm font-bold text-ink/70">
          {appointment?.date ?? pending?.date ? <p>{appointment?.date ?? pending?.date}</p> : null}
          {appointment?.start_time ?? pending?.start_time ? <p className="mt-1 text-xl font-black text-ink">{(appointment?.start_time ?? pending?.start_time)?.slice(0, 5)}</p> : null}
          {appointment?.hairdressers?.name ? <p className="mt-1">Con {appointment.hairdressers.name}</p> : null}
        </div>
      ) : null}
      {isDebugPayment && emailStatus === "not_configured" ? (
        <p className="mt-3 rounded-[8px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
          El email automático todavía no está activado en esta simulación.
        </p>
      ) : null}
      {isDebugPayment && emailStatus === "accepted" ? (
        <p className="mt-3 rounded-[8px] border border-lime-300 bg-lime-50 px-3 py-2 text-sm font-bold text-lime-900">
          Hemos solicitado el envío del correo a {emailTo ?? "tu email"} con la confirmación y los enlaces para modificar o anular la cita.
        </p>
      ) : null}
      {isDebugPayment && emailStatus === "provider_error" ? (
        <p className="mt-3 rounded-[8px] border border-clay/30 bg-clay/10 px-3 py-2 text-sm font-bold text-clay">
          No se pudo enviar el email de confirmación con el remitente de prueba actual.
        </p>
      ) : null}
      {sessionId ? <p className="mt-3 break-all text-xs font-semibold text-ink/40">Stripe: {sessionId}</p> : null}
      {manageUrl ? (
        <section className="mt-5 rounded-[8px] border border-[#0057ff]/20 bg-[#0057ff]/5 p-4 text-left">
          <h2 className="text-lg font-black text-ink">¿Necesitas cambiarla?</h2>
          <p className="mt-1 text-sm font-semibold text-ink/70">
            Guarda este enlace privado. Desde él podrás modificar o anular tu cita sin crear una cuenta.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href={manageUrl} className="rounded-[8px] bg-[#0057ff] px-4 py-3 text-center font-black text-white">
              Modificar cita
            </Link>
            <Link href={manageUrl} className="rounded-[8px] border border-clay/30 bg-clay/10 px-4 py-3 text-center font-black text-clay">
              Anular cita
            </Link>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={copyManageLink}
              className="rounded-[8px] border border-line bg-white px-4 py-3 font-black text-ink"
            >
              {copied ? "Enlace copiado" : "Copiar enlace"}
            </button>
            {calendarUrl ? (
              <a
                href={calendarUrl}
                className="rounded-[8px] border border-line bg-white px-4 py-3 text-center font-black text-ink"
              >
                Añadir al calendario
              </a>
            ) : null}
            <a
              href={`https://wa.me/34${DEBUG_CLIENT_PHONE}?text=${encodeURIComponent(
                `Confirmación de cita Gentleman: ${appointment?.date ?? pending?.date ?? ""} ${appointment?.start_time?.slice(0, 5) ?? pending?.start_time ?? ""}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-[8px] border border-lime-500 bg-lime-500 px-4 py-3 text-center font-black text-lime-950"
            >
              Enviar confirmación a mi WhatsApp
            </a>
          </div>
        </section>
      ) : null}
      <Link href="/reservar" className="mt-5 rounded-[8px] bg-[#0057ff] px-5 py-4 font-black text-white">
        Volver
      </Link>
    </main>
  );
}

export function BookingConfirmationApp() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center font-black text-ink">Cargando...</main>}>
      <SuccessContent />
    </Suspense>
  );
}
