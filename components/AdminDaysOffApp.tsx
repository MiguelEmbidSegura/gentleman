"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, LogOut, Trash2 } from "lucide-react";
import { getTodayKey } from "@/lib/date";
import { getWorkingRanges, minutesToTime, timeToMinutes } from "@/lib/availability";
import { HAIRDRESSER_IDS, HAIRDRESSERS, SLOT_MINUTES } from "@/lib/schedule";
import type { HairdresserId } from "@/lib/types";

type DayOffTarget = HairdresserId | "both";
type LocalDayOff = {
  id: string;
  date: string;
  target: DayOffTarget;
  title: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

const STORAGE_KEY = "gentleman_days_off";

function targetLabel(target: DayOffTarget) {
  if (target === "both") return "Alberto y Ruben";
  return HAIRDRESSERS.find((hairdresser) => hairdresser.id === target)?.name ?? "Peluquero";
}

function normalizeSavedDayOff(item: Partial<LocalDayOff> & { id: string; date: string; target: DayOffTarget; title: string }): LocalDayOff {
  return {
    id: item.id,
    date: item.date,
    target: item.target,
    title: item.title,
    allDay: item.allDay ?? true,
    startTime: item.startTime ?? null,
    endTime: item.endTime ?? null
  };
}

function formatRange(item: LocalDayOff) {
  return item.allDay ? "Todo el dia" : `${item.startTime} - ${item.endTime}`;
}

function getAffectedHairdressers(target: DayOffTarget): HairdresserId[] {
  return target === "both" ? HAIRDRESSERS.map((hairdresser) => hairdresser.id) : [target];
}

function getTimeOptions(date: string, target: DayOffTarget) {
  const options = new Set<string>();

  getAffectedHairdressers(target).forEach((hairdresserId) => {
    getWorkingRanges(hairdresserId, date).forEach((range) => {
      const start = timeToMinutes(range.start);
      const end = timeToMinutes(range.end);
      for (let minute = start; minute <= end; minute += SLOT_MINUTES) {
        options.add(minutesToTime(minute));
      }
    });
  });

  return Array.from(options).sort();
}

function getSlotOptions(date: string, target: DayOffTarget) {
  return getTimeOptions(date, target).slice(0, -1);
}

export function AdminDaysOffApp() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [username, setUsername] = useState("alberto");
  const [password, setPassword] = useState("");
  const [date, setDate] = useState(getTodayKey());
  const [target, setTarget] = useState<DayOffTarget>("both");
  const [title, setTitle] = useState("No trabaja");
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [daysOff, setDaysOff] = useState<LocalDayOff[]>([]);
  const [message, setMessage] = useState("");

  const timeOptions = useMemo(() => getTimeOptions(date, target), [date, target]);
  const slotOptions = useMemo(() => getSlotOptions(date, target), [date, target]);
  const groupedDaysOff = useMemo(() => {
    return daysOff.reduce<Record<string, LocalDayOff[]>>((groups, item) => {
      groups[item.date] = groups[item.date] ? [...groups[item.date], item] : [item];
      return groups;
    }, {});
  }, [daysOff]);

  const selectedSlotRange = useMemo(() => {
    if (allDay || !startTime || !endTime) return new Set<string>();
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (end <= start) return new Set<string>();
    return new Set(slotOptions.filter((time) => {
      const minute = timeToMinutes(time);
      return minute >= start && minute < end;
    }));
  }, [allDay, endTime, slotOptions, startTime]);

  useEffect(() => {
    fetch("/api/session")
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        setUser(response.ok ? payload.user : null);
      })
      .catch(() => setUser(null));

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Array<Partial<LocalDayOff> & { id: string; date: string; target: DayOffTarget; title: string }>;
      setDaysOff(parsed.map(normalizeSavedDayOff));
    }
  }, []);

  useEffect(() => {
    if (timeOptions.length >= 2) {
      if (!timeOptions.includes(startTime)) setStartTime(timeOptions[0]);
      if (!timeOptions.includes(endTime)) {
        setEndTime(timeOptions[1] ?? timeOptions[0]);
      }
    }
  }, [endTime, startTime, timeOptions]);

  function persist(items: LocalDayOff[]) {
    const sorted = [...items].sort((a, b) => `${a.date}-${a.startTime ?? "00:00"}`.localeCompare(`${b.date}-${b.startTime ?? "00:00"}`));
    setDaysOff(sorted);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error ?? "No se pudo iniciar sesion.");
      return;
    }
    setUser(payload.user);
  }

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    setUser(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!allDay && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setMessage("La hora fin debe ser posterior a la hora inicio.");
      return;
    }

    const item: LocalDayOff = {
      id: crypto.randomUUID(),
      date,
      target,
      title: title.trim() || "No trabaja",
      allDay,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime
    };
    persist([item, ...daysOff]);
    setMessage("Bloqueo guardado.");

    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        block_type: target === HAIRDRESSER_IDS.alberto ? "alberto_manual" : target === HAIRDRESSER_IDS.ruben ? "ruben_manual" : "full_closure",
        hairdresser_id: target === "both" ? null : target,
        affects_all_hairdressers: target === "both",
        start_date: date,
        end_date: date,
        all_day: item.allDay,
        start_time: item.startTime,
        end_time: item.endTime,
        internal_reason: item.title,
        visible_to_clients: false
      })
    }).catch(() => null);
  }

  function remove(id: string) {
    persist(daysOff.filter((item) => item.id !== id));
  }

  function handleSlotClick(time: string) {
    if (allDay) return;

    if (selectedSlotRange.has(time)) {
      const clicked = timeToMinutes(time);
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);

      if (selectedSlotRange.size === 1) {
        setStartTime(time);
        setEndTime(time);
        return;
      }

      if (clicked === start) {
        setStartTime(minutesToTime(start + SLOT_MINUTES));
        return;
      }

      if (clicked === end - SLOT_MINUTES) {
        setEndTime(time);
        return;
      }

      setStartTime(time);
      setEndTime(minutesToTime(clicked + SLOT_MINUTES));
      return;
    }

    if (!startTime || !endTime || selectedSlotRange.size === 0) {
      setStartTime(time);
      setEndTime(minutesToTime(timeToMinutes(time) + SLOT_MINUTES));
      return;
    }

    const clicked = timeToMinutes(time);
    const start = timeToMinutes(startTime);

    if (clicked < start) {
      setEndTime(minutesToTime(start + SLOT_MINUTES));
      setStartTime(time);
    } else {
      setEndTime(minutesToTime(clicked + SLOT_MINUTES));
    }
  }

  if (user === undefined) {
    return <main className="grid min-h-screen place-items-center px-5 text-lg font-black text-moss">Gentleman</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8 safe-bottom">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Gentleman</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Administradores</h1>
        <p className="mt-2 text-sm font-semibold text-ink/60">Gestion de dias y horas no trabajadas.</p>

        <form onSubmit={login} className="mt-6 rounded-[8px] border border-line bg-white p-4 shadow-soft">
          <label className="block text-sm font-bold text-ink">Usuario</label>
          <select value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 h-12 w-full rounded-[8px] border border-line bg-paper px-3">
            <option value="alberto">Alberto</option>
            <option value="ruben">Ruben</option>
          </select>
          <label className="mt-4 block text-sm font-bold text-ink">Contrasena</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 h-12 w-full rounded-[8px] border border-line bg-paper px-3" />
          {message ? <p className="mt-3 text-sm font-bold text-clay">{message}</p> : null}
          <button className="mt-5 h-12 w-full rounded-[8px] bg-moss font-black text-white">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-5 safe-bottom">
      <header className="flex items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Gentleman</p>
          <h1 className="mt-1 text-3xl font-black text-ink">Dias y horas no trabajadas</h1>
          <p className="mt-1 text-sm font-semibold text-ink/60">Bloquea un dia entero o solo una franja dentro del horario real.</p>
        </div>
        <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-[8px] border border-line bg-white" aria-label="Salir">
          <LogOut size={18} />
        </button>
      </header>

      {message ? <div className="mt-4 rounded-[8px] border border-moss/20 bg-moss/10 p-3 text-sm font-bold text-moss">{message}</div> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
        <form onSubmit={save} className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-moss text-white">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="font-black text-ink">Nuevo bloqueo</h2>
              <p className="text-xs font-bold text-ink/55">Dia completo o franja horaria</p>
            </div>
          </div>

          <label className="mt-4 block text-sm font-bold text-ink">Fecha
            <input type="date" value={date} min={getTodayKey()} onChange={(event) => setDate(event.target.value)} className="mt-1 h-12 w-full rounded-[8px] border border-line bg-paper px-3" />
          </label>

          <label className="mt-3 block text-sm font-bold text-ink">Peluquero afectado
            <select value={target} onChange={(event) => setTarget(event.target.value as DayOffTarget)} className="mt-1 h-12 w-full rounded-[8px] border border-line bg-paper px-3">
              <option value="both">Alberto y Ruben</option>
              {HAIRDRESSERS.map((hairdresser) => <option key={hairdresser.id} value={hairdresser.id}>{hairdresser.name}</option>)}
            </select>
          </label>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAllDay(true)} className={`h-11 rounded-[8px] border font-black ${allDay ? "border-moss bg-moss text-white" : "border-line bg-paper text-ink"}`}>
              Todo el dia
            </button>
            <button type="button" onClick={() => setAllDay(false)} className={`h-11 rounded-[8px] border font-black ${!allDay ? "border-moss bg-moss text-white" : "border-line bg-paper text-ink"}`}>
              Por horas
            </button>
          </div>

          <label className="mt-3 block text-sm font-bold text-ink">Motivo interno
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-12 w-full rounded-[8px] border border-line bg-paper px-3" />
          </label>

          <button disabled={!allDay && (timeOptions.length < 2 || selectedSlotRange.size === 0)} className="mt-4 h-12 w-full rounded-[8px] bg-moss font-black text-white disabled:opacity-45">
            Guardar bloqueo
          </button>
        </form>

        <section className="rounded-[8px] border border-line bg-white p-4 shadow-sm">
          {!allDay ? (
            <div className="mb-4 rounded-[8px] border border-moss/20 bg-moss/5 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-ink">
                    <Clock3 size={19} />
                    Elige la franja horaria
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink/55">
                    Pulsa una hora para empezar y otra para cerrar el rango.
                  </p>
                </div>
                <div className="rounded-[8px] bg-white px-3 py-2 text-sm font-black text-moss">
                  {selectedSlotRange.size > 0 ? `${startTime} - ${endTime}` : "Sin franja"}
                </div>
              </div>

              {slotOptions.length === 0 ? (
                <p className="mt-3 rounded-[8px] bg-white p-3 text-sm font-semibold text-clay">Ese dia no tiene horario disponible.</p>
              ) : (
                <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8">
                  {slotOptions.map((time) => {
                    const selected = selectedSlotRange.has(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleSlotClick(time)}
                        className={`h-10 rounded-[8px] border text-xs font-black transition ${
                          selected
                            ? "border-moss bg-moss text-white shadow-sm"
                            : "border-line bg-white text-ink hover:border-moss/50"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <h2 className="text-lg font-black text-ink">Bloqueos guardados</h2>
          <p className="mt-1 text-sm font-semibold text-ink/55">Se aplican a la web publica de este navegador.</p>

          <div className="mt-4 grid gap-3">
            {daysOff.length === 0 ? (
              <div className="rounded-[8px] border border-line bg-paper p-4 text-sm font-semibold text-ink/60">Aun no hay dias ni horas marcadas.</div>
            ) : null}

            {Object.entries(groupedDaysOff).map(([groupDate, items]) => (
              <div key={groupDate} className="rounded-[8px] border border-line bg-paper p-3">
                <h3 className="font-black text-ink">{groupDate}</h3>
                <div className="mt-2 grid gap-2">
                  {items.map((item) => (
                    <article key={item.id} className="flex items-center justify-between gap-3 rounded-[8px] bg-white p-3">
                      <div>
                        <p className="font-black text-ink">{targetLabel(item.target)}</p>
                        <p className="text-sm font-semibold text-ink/60">{formatRange(item)} · {item.title}</p>
                      </div>
                      <button onClick={() => remove(item.id)} className="grid h-10 w-10 place-items-center rounded-[8px] border border-clay/30 text-clay" aria-label="Borrar">
                        <Trash2 size={18} />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
