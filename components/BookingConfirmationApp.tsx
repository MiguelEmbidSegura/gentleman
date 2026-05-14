"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";

const PENDING_BOOKING_KEY = "gentleman_pending_booking";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
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

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8 text-center safe-bottom">
      <CheckCircle2 className="mx-auto text-lime-700" size={52} />
      <h1 className="mt-4 text-3xl font-black text-ink">Pago recibido</h1>
      <p className="mt-3 font-semibold text-ink/70">La cita ha sido confirmada.</p>
      {pending ? (
        <div className="mt-5 rounded-[8px] border border-line bg-white p-4 text-sm font-bold text-ink/70">
          {pending.date ? <p>{pending.date}</p> : null}
          {pending.start_time ? <p className="mt-1 text-xl font-black text-ink">{pending.start_time}</p> : null}
        </div>
      ) : null}
      {sessionId ? <p className="mt-3 break-all text-xs font-semibold text-ink/40">Stripe: {sessionId}</p> : null}
      <Link href="/reservar" className="mt-8 rounded-[8px] bg-[#0057ff] px-5 py-4 font-black text-white">
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
