"use client";

export type HairLookId =
  | "clasico"
  | "fade"
  | "tupe"
  | "largo"
  | "rubio"
  | "azul"
  | "rosa"
  | "calvo"
  | "bigote";

export type HairLook = {
  id: HairLookId;
  label: string;
  emoji: string;
};

export const HAIR_LOOKS: HairLook[] = [
  { id: "clasico", label: "Clásico", emoji: "✂️" },
  { id: "fade", label: "Fade", emoji: "⚡" },
  { id: "tupe", label: "Tupé", emoji: "🎩" },
  { id: "largo", label: "Largo", emoji: "🪩" },
  { id: "rubio", label: "Rubio", emoji: "🌞" },
  { id: "azul", label: "Azul", emoji: "💙" },
  { id: "rosa", label: "Rosa", emoji: "💖" },
  { id: "calvo", label: "Calvo", emoji: "🥚" },
  { id: "bigote", label: "Bigote", emoji: "🥸" }
];

type HairOverlayProps = {
  lookId: HairLookId;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

function FullHair({ id, base, shine }: { id: string; base: string; shine: string }) {
  return (
    <svg viewBox="0 0 260 190" className="h-full w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)]" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-base`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={shine} />
          <stop offset="32%" stopColor={base} />
          <stop offset="100%" stopColor="#120d0a" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={`${id}-gloss`} cx="40%" cy="18%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M28 135C20 77 48 24 112 17c69-8 121 33 118 111-21-20-47-31-101-31-48 0-79 10-101 38Z"
        fill={`url(#${id}-base)`}
      />
      <path d="M39 122c16-29 54-48 109-48 27 0 52 5 73 15" stroke={shine} strokeOpacity="0.38" strokeWidth="10" strokeLinecap="round" />
      <path d="M28 135C20 77 48 24 112 17c69-8 121 33 118 111-21-20-47-31-101-31-48 0-79 10-101 38Z" fill={`url(#${id}-gloss)`} />
    </svg>
  );
}

function HairShape({ lookId }: { lookId: HairLookId }) {
  switch (lookId) {
    case "clasico":
      return <FullHair id="classic" base="#2b1a13" shine="#6b4632" />;
    case "rubio":
      return (
        <svg viewBox="0 0 260 190" className="h-full w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)]" aria-hidden="true">
          <defs>
            <linearGradient id="blonde-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff3a6" />
              <stop offset="42%" stopColor="#e2bd4c" />
              <stop offset="100%" stopColor="#8a6412" />
            </linearGradient>
          </defs>
          <path d="M27 138C22 75 53 24 118 18c67-6 114 34 113 111-22-18-46-26-101-26-48 0-80 10-103 35Z" fill="url(#blonde-main)" />
          <path d="M42 113c18-21 40-31 65-34M102 78c19 5 34 14 45 27M151 80c22 4 43 14 61 31" stroke="#fff6bf" strokeOpacity="0.62" strokeWidth="10" strokeLinecap="round" />
        </svg>
      );
    case "azul":
      return (
        <svg viewBox="0 0 260 205" className="h-full w-full drop-shadow-[0_12px_12px_rgba(0,0,0,0.28)]" aria-hidden="true">
          <defs>
            <linearGradient id="blue-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="45%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#172554" />
            </linearGradient>
          </defs>
          <path d="M34 151C28 92 58 46 104 37c14-24 37-37 63-34 31 4 55 27 65 67 9 37 7 60 1 81-20-18-46-29-102-29-45 0-77 10-97 29Z" fill="url(#blue-main)" />
          <path d="M95 53c18-17 52-24 82 7" stroke="#bfdbfe" strokeOpacity="0.58" strokeWidth="13" strokeLinecap="round" />
        </svg>
      );
    case "rosa":
      return (
        <svg viewBox="0 0 260 230" className="h-full w-full drop-shadow-[0_12px_12px_rgba(0,0,0,0.25)]" aria-hidden="true">
          <defs>
            <linearGradient id="pink-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbcfe8" />
              <stop offset="40%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#831843" />
            </linearGradient>
          </defs>
          <path d="M24 118C20 54 57 17 127 17c71 0 110 39 109 105-1 28-8 53-20 76l-29-13c10-22 15-43 15-62-16-19-39-29-75-29-34 0-58 10-74 29 1 22 6 43 16 63l-29 12c-10-23-16-49-16-80Z" fill="url(#pink-main)" />
          <path d="M46 111c21-24 47-36 81-36 35 0 62 12 85 37" stroke="#fdf2f8" strokeOpacity="0.46" strokeWidth="11" strokeLinecap="round" />
        </svg>
      );
    case "fade":
      return (
        <svg viewBox="0 0 260 190" className="h-full w-full drop-shadow-[0_10px_10px_rgba(0,0,0,0.25)]" aria-hidden="true">
          <defs>
            <linearGradient id="fade-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5b463b" />
              <stop offset="30%" stopColor="#181412" />
              <stop offset="100%" stopColor="#050505" />
            </linearGradient>
          </defs>
          <path d="M33 137C28 74 60 26 125 23c66-3 109 39 102 114-20-18-45-27-99-27-47 0-75 8-95 27Z" fill="url(#fade-main)" />
          <path d="M34 127c-4 10-6 19-7 31M226 127c4 10 6 19 7 31" stroke="#9ca3af" strokeOpacity="0.45" strokeWidth="17" strokeLinecap="round" />
          <path d="M51 92c24-21 116-23 155 2" stroke="#6b7280" strokeOpacity="0.2" strokeWidth="8" strokeLinecap="round" />
        </svg>
      );
    case "tupe":
      return (
        <svg viewBox="0 0 260 205" className="h-full w-full drop-shadow-[0_12px_12px_rgba(0,0,0,0.28)]" aria-hidden="true">
          <defs>
            <linearGradient id="quiff-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6e4b36" />
              <stop offset="42%" stopColor="#2a190f" />
              <stop offset="100%" stopColor="#120b08" />
            </linearGradient>
          </defs>
          <path d="M31 150C24 90 53 42 104 34c10-34 61-40 96-8 31 29 39 72 29 124-21-18-47-29-101-29-44 0-76 10-97 29Z" fill="url(#quiff-main)" />
          <path d="M87 57c19-23 69-31 99 10" stroke="#8a6348" strokeOpacity="0.46" strokeWidth="13" strokeLinecap="round" />
        </svg>
      );
    case "largo":
      return (
        <svg viewBox="0 0 260 260" className="h-full w-full drop-shadow-[0_12px_12px_rgba(0,0,0,0.25)]" aria-hidden="true">
          <defs>
            <linearGradient id="long-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#72503b" />
              <stop offset="35%" stopColor="#382114" />
              <stop offset="100%" stopColor="#140c08" />
            </linearGradient>
          </defs>
          <path d="M25 120C20 56 59 18 127 18c70 0 108 42 107 110-1 46-15 87-39 121l-34-23c25-34 35-67 34-103-17-19-38-28-68-28-29 0-51 9-68 28 0 38 10 71 34 103l-34 23c-22-35-34-80-34-129Z" fill="url(#long-main)" />
          <path d="M48 121c18-25 47-39 79-39 33 0 60 13 82 39" stroke="#8b6347" strokeOpacity="0.3" strokeWidth="10" strokeLinecap="round" />
        </svg>
      );
    case "calvo":
      return (
        <svg viewBox="0 0 260 190" className="h-full w-full drop-shadow-[0_8px_10px_rgba(0,0,0,0.18)]" aria-hidden="true">
          <defs>
            <radialGradient id="bald-main" cx="38%" cy="24%" r="78%">
              <stop offset="0%" stopColor="#ffe2c6" />
              <stop offset="72%" stopColor="#d8ad88" />
              <stop offset="100%" stopColor="#bd8d6e" />
            </radialGradient>
          </defs>
          <path d="M36 136C31 71 66 25 128 25c61 0 97 45 96 111-22-18-49-26-97-26-43 0-70 7-91 26Z" fill="url(#bald-main)" opacity="0.98" />
          <path d="M53 105c22-11 124-11 151 0" stroke="#a97655" strokeOpacity="0.28" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case "bigote":
      return (
        <svg viewBox="0 0 260 120" className="h-full w-full drop-shadow-[0_8px_8px_rgba(0,0,0,0.3)]" aria-hidden="true">
          <defs>
            <linearGradient id="moustache-main" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#694733" />
              <stop offset="40%" stopColor="#24140e" />
              <stop offset="100%" stopColor="#110907" />
            </linearGradient>
          </defs>
          <path d="M28 56c35-28 70-28 102 3 32-31 67-31 102-3-10 42-64 54-102 20-38 34-92 22-102-20Z" fill="url(#moustache-main)" />
        </svg>
      );
  }
}

export function HairOverlay({ lookId, scale, offsetX, offsetY, rotation }: HairOverlayProps) {
  const isBigote = lookId === "bigote";
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-10"
      style={{
        width: isBigote ? "44%" : "76%",
        height: isBigote ? "18%" : lookId === "largo" ? "72%" : "46%",
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale}) rotate(${rotation}deg)`
      }}
    >
      <HairShape lookId={lookId} />
    </div>
  );
}
