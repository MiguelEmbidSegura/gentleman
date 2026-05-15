"use client";

import { Bot, Send, X } from "lucide-react";
import { FormEvent, useState } from "react";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

export function PublicChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hola. Puedo ayudarte a reservar, responder dudas simples y reenviarte el enlace seguro para modificar o anular tu cita."
    }
  ]);
  const [input, setInput] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value || loading) return;

    setMessages((current) => [...current, { role: "user", text: value }]);
    setInput("");
    setLoading(true);

    if (emailMode) {
      const response = await fetch("/api/chatbot/manage-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value })
      });
      const payload = await response.json().catch(() => ({}));
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.ok
            ? payload.message
            : payload.error ?? "No se pudo procesar el email."
        }
      ]);
      setEmailMode(false);
      setLoading(false);
      return;
    }

    const response = await fetch("/api/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: value })
    });
    const payload = await response.json().catch(() => ({}));
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        text: payload.answer ?? payload.error ?? "No he podido responder ahora mismo."
      }
    ]);
    setEmailMode(payload.action === "request_email");
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-ink px-4 font-black text-white shadow-soft"
      >
        <Bot size={20} />
        Ayuda
      </button>

      {open ? (
        <section className="fixed bottom-24 right-4 z-40 flex h-[420px] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[12px] border border-line bg-white shadow-soft">
          <header className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <div>
              <p className="text-sm font-black">Asistente Gentleman</p>
              <p className="text-xs text-white/70">Reservas y ayuda rápida</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat">
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-paper p-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={message.role === "assistant"
                  ? "max-w-[88%] rounded-[12px] bg-white p-3 text-sm font-semibold text-ink shadow-sm"
                  : "ml-auto max-w-[88%] rounded-[12px] bg-[#0057ff] p-3 text-sm font-semibold text-white"}
              >
                {message.text}
              </div>
            ))}
            {loading ? <p className="text-xs font-bold text-ink/50">Escribiendo...</p> : null}
          </div>

          <form onSubmit={submit} className="border-t border-line bg-white p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={emailMode ? "tu@email.com" : "Escribe tu pregunta"}
                className="h-11 min-w-0 flex-1 rounded-[8px] border border-line bg-paper px-3 text-sm font-semibold outline-none focus:border-[#0057ff]"
              />
              <button
                disabled={loading}
                className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#0057ff] text-white disabled:opacity-45"
                aria-label="Enviar"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
