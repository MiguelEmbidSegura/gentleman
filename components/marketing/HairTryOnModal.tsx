"use client";

import { Camera, CameraOff, RefreshCcw, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HAIR_LOOKS, HairLookId, HairOverlay } from "@/components/marketing/HairOverlay";
import { buildFaceGeometry, getAutoOverlayPlacement } from "@/lib/hair-fit";
import type { FaceGeometry } from "@/lib/hair-fit";

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

const LOOK_PRESETS: Record<HairLookId, Omit<typeof DEFAULT_OVERLAY, "lookId">> = {
  clasico: { scale: 1, offsetX: 0, offsetY: -88, rotation: 0 },
  fade: { scale: 0.98, offsetX: 0, offsetY: -90, rotation: 0 },
  tupe: { scale: 1.02, offsetX: 0, offsetY: -104, rotation: -2 },
  largo: { scale: 1.02, offsetX: 0, offsetY: -62, rotation: 0 },
  rubio: { scale: 1, offsetX: 0, offsetY: -88, rotation: 0 },
  azul: { scale: 1, offsetX: 0, offsetY: -88, rotation: 0 },
  rosa: { scale: 1, offsetX: 0, offsetY: -88, rotation: 0 },
  calvo: { scale: 1, offsetX: 0, offsetY: -86, rotation: 0 },
  bigote: { scale: 0.86, offsetX: 0, offsetY: 28, rotation: 0 }
};

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

export function HairTryOnModal({ open, onClose }: HairTryOnModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceGeometry, setFaceGeometry] = useState<FaceGeometry | null>(null);
  const [autoFitStatus, setAutoFitStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
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
      stopCamera();
      if (video) video.srcObject = null;
      setCameraReady(false);
      setCapturedPhoto(null);
      setFaceGeometry(null);
      setAutoFitStatus("idle");
    };
  }, [open]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function resetOverlay() {
    setLookId(DEFAULT_OVERLAY.lookId);
    applyPlacement(DEFAULT_OVERLAY.lookId);
  }

  function applyLook(nextLookId: HairLookId) {
    setLookId(nextLookId);
    applyPlacement(nextLookId);
  }

  function applyPlacement(nextLookId: HairLookId) {
    const frame = frameRef.current;
    const preset = frame && faceGeometry
      ? getAutoOverlayPlacement(nextLookId, faceGeometry, frame.clientWidth, frame.clientHeight)
      : LOOK_PRESETS[nextLookId];
    setScale(preset.scale);
    setOffsetX(preset.offsetX);
    setOffsetY(preset.offsetY);
    setRotation(preset.rotation);
  }

  function takePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    const targetRatio = 3 / 4;
    const sourceRatio = video.videoWidth / video.videoHeight;
    const cropWidth = sourceRatio > targetRatio ? video.videoHeight * targetRatio : video.videoWidth;
    const cropHeight = sourceRatio > targetRatio ? video.videoHeight : video.videoWidth / targetRatio;
    const cropX = (video.videoWidth - cropWidth) / 2;
    const cropY = (video.videoHeight - cropHeight) / 2;

    canvas.width = 720;
    canvas.height = 960;
    const context = canvas.getContext("2d");
    if (!context) return;

    // The live preview is mirrored like a selfie; mirror the captured frame too.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    context.setTransform(1, 0, 0, 1, 0, 0);

    const photo = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedPhoto(photo);
    void detectFace(photo);
    stopCamera();
  }

  async function retakePhoto() {
    setCapturedPhoto(null);
    setFaceGeometry(null);
    setAutoFitStatus("idle");
    setCameraError("");
    const video = videoRef.current;
    if (!video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 960 }
        },
        audio: false
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setCameraReady(true);
    } catch {
      setCameraError("No hemos podido volver a abrir la cámara.");
    }
  }

  async function detectFace(photo: string) {
    setAutoFitStatus("loading");

    try {
      const image = await loadImage(photo);
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        },
        runningMode: "IMAGE",
        numFaces: 1
      });
      const result = landmarker.detect(image);
      landmarker.close();
      const geometry = buildFaceGeometry(result.faceLandmarks[0] ?? []);

      if (!geometry) {
        setAutoFitStatus("failed");
        return;
      }

      setFaceGeometry(geometry);
      setAutoFitStatus("ready");
      requestAnimationFrame(() => {
        const frame = frameRef.current;
        if (!frame) return;
        const placement = getAutoOverlayPlacement(lookId, geometry, frame.clientWidth, frame.clientHeight);
        setScale(placement.scale);
        setOffsetX(placement.offsetX);
        setOffsetY(placement.offsetY);
        setRotation(placement.rotation);
      });
    } catch {
      setAutoFitStatus("failed");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section className="grid h-[min(96dvh,820px)] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-[20px] bg-white shadow-soft sm:rounded-[20px]">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0057ff]">Prueba tu look</p>
            <h2 className="mt-1 text-xl font-black text-ink sm:text-2xl">Pruébate un look antes de reservar</h2>
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

        <div className="flex min-h-0 flex-col items-center justify-center bg-paper px-4 py-3">
          <div ref={frameRef} className="relative aspect-[3/4] h-full min-h-[220px] max-h-[42dvh] w-auto max-w-full overflow-hidden rounded-[18px] bg-ink">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={capturedPhoto ? "hidden h-full w-full object-cover" : "h-full w-full object-cover"}
              style={{ transform: "scaleX(-1)" }}
            />
            {capturedPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capturedPhoto} alt="Foto capturada para probar looks" className="h-full w-full object-cover" />
            ) : null}
            {capturedPhoto ? (
              <HairOverlay
                lookId={lookId}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                rotation={rotation}
              />
            ) : null}
            {!cameraReady && !capturedPhoto ? (
              <div className="absolute inset-0 grid place-items-center p-5 text-center text-white">
                <div>
                  <Camera className="mx-auto mb-3" size={30} />
                  <p className="font-bold">{cameraError || "Preparando la cámara..."}</p>
                </div>
              </div>
            ) : null}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {!capturedPhoto ? (
              <button
                type="button"
                onClick={takePhoto}
                disabled={!cameraReady}
                className="flex h-10 items-center gap-2 rounded-full bg-[#0057ff] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-[#0057ff]/45"
              >
                <Camera size={16} />
                Hacer foto
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void retakePhoto()}
                className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-black text-ink"
              >
                <RefreshCcw size={16} />
                Repetir foto
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs font-bold text-ink/65">
            {capturedPhoto
              ? autoFitStatus === "loading"
                ? "Estoy detectando tu cara para colocar el look automáticamente..."
                : autoFitStatus === "ready"
                  ? "He colocado el look automáticamente. Puedes ajustarlo a mano si quieres."
                  : "Ahora puedes jugar con la foto. No se guarda ni se sube a ningún sitio."
              : "Hazte una foto para jugar con los looks. No se guarda ni se sube a ningún sitio."}
          </p>
        </div>

        <div className="max-h-[48dvh] overflow-y-auto border-t border-line bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-ink">Elige look</h3>
            <button
              type="button"
              onClick={resetOverlay}
              disabled={!capturedPhoto}
              className="flex h-9 items-center gap-1 rounded-full border border-line bg-paper px-3 text-xs font-black text-[#0057ff] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <RotateCcw size={14} />
              Reiniciar
            </button>
          </div>

          {!capturedPhoto ? (
            <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-line bg-paper px-3 py-2 text-xs font-bold text-ink/65">
              <CameraOff size={15} className="shrink-0" />
              Haz la foto primero; después podrás ajustar el look sobre la imagen.
            </div>
          ) : null}

          {capturedPhoto && autoFitStatus === "failed" ? (
            <div className="mt-3 rounded-[12px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              No he detectado bien la cara. Puedes seguir ajustando el look a mano.
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-3 gap-2">
            {HAIR_LOOKS.map((look) => (
              <button
                key={look.id}
                type="button"
                onClick={() => applyLook(look.id)}
                disabled={!capturedPhoto}
                className={lookId === look.id
                  ? "min-h-11 rounded-[12px] border border-[#0057ff] bg-[#0057ff] px-2 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                  : "min-h-11 rounded-[12px] border border-line bg-paper px-2 py-2 text-xs font-black text-ink disabled:cursor-not-allowed disabled:opacity-45"}
              >
                <span className="block text-base">{look.emoji}</span>
                {look.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
            <label className="text-sm font-black text-ink">
              Tamaño
              <input disabled={!capturedPhoto} className="mt-1 w-full accent-[#0057ff] disabled:opacity-45" type="range" min="0.6" max="1.5" step="0.05" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
            </label>
            <label className="text-sm font-black text-ink">
              Rotación
              <input disabled={!capturedPhoto} className="mt-1 w-full accent-[#0057ff] disabled:opacity-45" type="range" min="-45" max="45" step="1" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} />
            </label>
            <label className="text-sm font-black text-ink">
              Izquierda / derecha
              <input disabled={!capturedPhoto} className="mt-1 w-full accent-[#0057ff] disabled:opacity-45" type="range" min="-120" max="120" step="1" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} />
            </label>
            <label className="text-sm font-black text-ink">
              Arriba / abajo
              <input disabled={!capturedPhoto} className="mt-1 w-full accent-[#0057ff] disabled:opacity-45" type="range" min="-180" max="120" step="1" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
