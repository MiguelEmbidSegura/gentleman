"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const PENDING_BOOKING_KEY = "gentleman_pending_booking";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [manageUrl, setManageUrl] = useState("");
  const [appointment, setAppointment] = useState<{
    date?: string;
    start_time?: string;
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
    if (!sessionId) return;
    const currentSessionId = sessionId;

    async function loadConfirmation() {
      const response = await fetch(`/api/public-appointments/confirmation?session_id=${encodeURIComponent(currentSessionId)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return;
      setManageUrl(payload.manage_url ?? "");
      setAppointment(payload.appointment ?? null);
    }

    loadConfirmation();
  }, [sessionId]);

  async function copyManageLink() {
    if (!manageUrl) return;
    await navigator.clipboard.writeText(`${window.location.origin}${manageUrl}`);
    setCopied(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8 text-center safe-bottom">
      <CheckCircle2 className="mx-auto text-lime-700" size={52} />
      <h1 className="mt-4 text-3xl font-black text-ink">Pago recibido</h1>
      <p className="mt-3 font-semibold text-ink/70">La cita ha sido confirmada.</p>
      {appointment || pending ? (
        <div className="mt-5 rounded-[8px] border border-line bg-white p-4 text-sm font-bold text-ink/70">
          {appointment?.date ?? pending?.date ? <p>{appointment?.date ?? pending?.date}</p> : null}
          {appointment?.start_time ?? pending?.start_time ? <p className="mt-1 text-xl font-black text-ink">{(appointment?.start_time ?? pending?.start_time)?.slice(0, 5)}</p> : null}
          {appointment?.hairdressers?.name ? <p className="mt-1">Con {appointment.hairdressers.name}</p> : null}
        </div>
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
              Modificar o anular
            </Link>
            <button
              type="button"
              onClick={copyManageLink}
              className="rounded-[8px] border border-line bg-white px-4 py-3 font-black text-ink"
            >
              {copied ? "Enlace copiado" : "Copiar enlace"}
            </button>
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
