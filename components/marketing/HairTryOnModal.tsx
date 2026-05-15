"use client";

import { Camera, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HAIR_LOOKS, HairLookId, HairOverlay } from "@/components/marketing/HairOverlay";

type HairTryOnModalProps = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_OVERLAY = {
  lookId: "clasico" as HairLookId,
  scale: 1,
  offsetX: 0,
  offsetY: -88,
  rotation: 0
};

export function HairTryOnModal({ open, onClose }: HairTryOnModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [lookId, setLookId] = useState<HairLookId>(DEFAULT_OVERLAY.lookId);
  const [scale, setScale] = useState(DEFAULT_OVERLAY.scale);
  const [offsetX, setOffsetX] = useState(DEFAULT_OVERLAY.offsetX);
  const [offsetY, setOffsetY] = useState(DEFAULT_OVERLAY.offsetY);
  const [rotation, setRotation] = useState(DEFAULT_OVERLAY.rotation);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const video = videoRef.current;

    async function startCamera() {
      setCameraError("");
      setCameraReady(false);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraError("Tu navegador no permite abrir la cámara desde aquí.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 960 }
          },
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setCameraReady(true);
        }
      } catch {
        setCameraError("No hemos podido abrir la cámara. Revisa los permisos y vuelve a intentarlo.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
      setCameraReady(false);
    };
  }, [open]);

  function resetOverlay() {
    setLookId(DEFAULT_OVERLAY.lookId);
    setScale(DEFAULT_OVERLAY.scale);
    setOffsetX(DEFAULT_OVERLAY.offsetX);
    setOffsetY(DEFAULT_OVERLAY.offsetY);
    setRotation(DEFAULT_OVERLAY.rotation);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section className="flex h-[min(92vh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-white shadow-soft sm:rounded-[20px]">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0057ff]">Prueba tu look</p>
            <h2 className="mt-1 text-2xl font-black text-ink">Pruébate un look antes de reservar</h2>
            <p className="mt-1 text-sm font-semibold text-ink/60">Solo por diversión 😄</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line bg-paper"
            aria-label="Cerrar prueba de look"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[18px] bg-ink">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {cameraReady ? (
              <HairOverlay
                lookId={lookId}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                rotation={rotation}
              />
            ) : null}
            {!cameraReady ? (
              <div className="absolute inset-0 grid place-items-center p-5 text-center text-white">
                <div>
                  <Camera className="mx-auto mb-3" size={30} />
                  <p className="font-bold">{cameraError || "Preparando la cámara..."}</p>
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-3 rounded-[12px] bg-paper p-3 text-center text-xs font-bold text-ink/65">
            La cámara no se guarda ni se sube a ningún sitio. Todo ocurre localmente en tu navegador.
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-ink">Elige look</h3>
              <button type="button" onClick={resetOverlay} className="flex items-center gap-1 text-sm font-black text-[#0057ff]">
                <RotateCcw size={15} />
                Reiniciar
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {HAIR_LOOKS.map((look) => (
                <button
                  key={look.id}
                  type="button"
                  onClick={() => setLookId(look.id)}
                  className={lookId === look.id
                    ? "h-12 rounded-[12px] border border-[#0057ff] bg-[#0057ff] px-3 text-sm font-black text-white"
                    : "h-12 rounded-[12px] border border-line bg-paper px-3 text-sm font-black text-ink"}
                >
                  {look.emoji} {look.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="text-sm font-black text-ink">
              Tamaño
              <input className="mt-1 w-full accent-[#0057ff]" type="range" min="0.6" max="1.5" step="0.05" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            </label>
            <label className="text-sm font-black text-ink">
              Posición horizontal
              <input className="mt-1 w-full accent-[#0057ff]" type="range" min="-120" max="120" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
            </label>
            <label className="text-sm font-black text-ink">
              Posición vertical
              <input className="mt-1 w-full accent-[#0057ff]" type="range" min="-180" max="120" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} />
            </label>
            <label className="text-sm font-black text-ink">
              Rotación
              <input className="mt-1 w-full accent-[#0057ff]" type="range" min="-45" max="45" step="1" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
