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
  { id: "largo", label: "Pelo largo", emoji: "🪩" },
  { id: "rubio", label: "Rubio", emoji: "🌞" },
  { id: "azul", label: "Azul", emoji: "💙" },
  { id: "rosa", label: "Rosa", emoji: "💖" },
  { id: "calvo", label: "Modo calvo", emoji: "🥚" },
  { id: "bigote", label: "Bigote", emoji: "🥸" }
];

type HairOverlayProps = {
  lookId: HairLookId;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

function HairShape({ lookId }: { lookId: HairLookId }) {
  switch (lookId) {
    case "clasico":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <path d="M36 116C32 63 65 24 121 24c58 0 91 39 84 94-18-14-39-23-84-23-43 0-67 8-85 21Z" fill="#2d1b13" />
          <path d="M55 78c24-28 98-39 137 0" stroke="#4b2c20" strokeWidth="14" strokeLinecap="round" />
        </svg>
      );
    case "fade":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <path d="M42 122C38 65 68 28 121 28c55 0 86 35 78 94-12-12-33-20-78-20-44 0-67 8-79 20Z" fill="#171717" />
          <path d="M53 106c-7 8-10 17-11 25M188 106c7 8 10 17 11 25" stroke="#737373" strokeWidth="12" strokeLinecap="round" />
        </svg>
      );
    case "tupe":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <path d="M43 122C38 70 63 37 111 30c12-30 51-27 69 3 18 31 25 54 17 89-18-15-39-22-77-22-36 0-59 7-77 22Z" fill="#24150f" />
          <path d="M86 48c17-17 47-24 72 3" stroke="#4a2919" strokeWidth="18" strokeLinecap="round" />
        </svg>
      );
    case "largo":
      return (
        <svg viewBox="0 0 240 220" className="h-full w-full" aria-hidden="true">
          <path d="M35 116C33 56 69 22 120 22c53 0 87 35 86 95-1 32-10 66-24 91l-28-21c16-21 22-42 23-66-14-13-31-20-57-20-28 0-46 7-59 21 0 26 7 46 24 65l-29 21c-14-25-21-59-21-92Z" fill="#412415" />
        </svg>
      );
    case "rubio":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <path d="M36 116C32 63 65 24 121 24c58 0 91 39 84 94-18-14-39-23-84-23-43 0-67 8-85 21Z" fill="#e9c45a" />
          <path d="M55 78c24-28 98-39 137 0" stroke="#f7df85" strokeWidth="14" strokeLinecap="round" />
        </svg>
      );
    case "azul":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <path d="M36 116C32 63 65 24 121 24c58 0 91 39 84 94-18-14-39-23-84-23-43 0-67 8-85 21Z" fill="#1d4ed8" />
          <path d="M55 78c24-28 98-39 137 0" stroke="#60a5fa" strokeWidth="14" strokeLinecap="round" />
        </svg>
      );
    case "rosa":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <path d="M36 116C32 63 65 24 121 24c58 0 91 39 84 94-18-14-39-23-84-23-43 0-67 8-85 21Z" fill="#ec4899" />
          <path d="M55 78c24-28 98-39 137 0" stroke="#f9a8d4" strokeWidth="14" strokeLinecap="round" />
        </svg>
      );
    case "calvo":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <ellipse cx="120" cy="89" rx="77" ry="63" fill="#efc39f" opacity="0.96" />
          <path d="M59 98c20-14 102-20 122 0" stroke="#d8a77f" strokeWidth="7" strokeLinecap="round" opacity="0.55" />
        </svg>
      );
    case "bigote":
      return (
        <svg viewBox="0 0 240 180" className="h-full w-full" aria-hidden="true">
          <path d="M49 92c24-16 49-15 71 3 22-18 47-19 71-3-8 26-39 37-71 16-32 21-63 10-71-16Z" fill="#22140f" />
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
        width: isBigote ? "45%" : "68%",
        height: isBigote ? "24%" : lookId === "largo" ? "66%" : "48%",
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale}) rotate(${rotation}deg)`
      }}
    >
      <HairShape lookId={lookId} />
    </div>
  );
}
