import Link from "next/link";
import { XCircle } from "lucide-react";

export default function CancelPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8 text-center safe-bottom">
      <XCircle className="mx-auto text-clay" size={52} />
      <h1 className="mt-4 text-3xl font-black text-ink">El pago no se ha completado</h1>
      <p className="mt-3 font-semibold text-ink/70">No se ha confirmado ninguna cita. Puedes volver a reservar cuando quieras.</p>
      <Link href="/reservar" className="mt-8 rounded-[8px] bg-[#0057ff] px-5 py-4 font-black text-white">
        Volver a reservar
      </Link>
    </main>
  );
}
