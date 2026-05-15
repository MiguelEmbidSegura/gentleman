import type { HairLookId } from "@/components/marketing/HairOverlay";

export type NormalizedFacePoint = {
  x: number;
  y: number;
};

export type FaceGeometry = {
  centerX: number;
  foreheadY: number;
  mouthY: number;
  faceWidth: number;
  rotation: number;
};

export type OverlayPlacement = {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
};

const LOOK_WIDTH_FACTOR: Record<HairLookId, number> = {
  clasico: 1.36,
  fade: 1.34,
  tupe: 1.42,
  largo: 1.46,
  rubio: 1.36,
  azul: 1.42,
  rosa: 1.46,
  calvo: 1.34,
  bigote: 0.62
};

const LOOK_VERTICAL_FACTOR: Record<HairLookId, number> = {
  clasico: 0.08,
  fade: 0.08,
  tupe: -0.02,
  largo: 0.32,
  rubio: 0.08,
  azul: -0.02,
  rosa: 0.2,
  calvo: 0.08,
  bigote: 0
};

const LOOK_BASE_WIDTH_RATIO: Record<HairLookId, number> = {
  clasico: 0.76,
  fade: 0.76,
  tupe: 0.76,
  largo: 0.76,
  rubio: 0.76,
  azul: 0.76,
  rosa: 0.76,
  calvo: 0.76,
  bigote: 0.44
};

function pointDistance(a: NormalizedFacePoint, b: NormalizedFacePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildFaceGeometry(points: NormalizedFacePoint[]): FaceGeometry | null {
  const forehead = points[10];
  const leftFace = points[234];
  const rightFace = points[454];
  const leftEye = points[33];
  const rightEye = points[263];
  const upperLip = points[13];
  const lowerLip = points[14];

  if (!forehead || !leftFace || !rightFace || !leftEye || !rightEye || !upperLip || !lowerLip) {
    return null;
  }

  const faceWidth = pointDistance(leftFace, rightFace);
  if (!Number.isFinite(faceWidth) || faceWidth <= 0) return null;

  return {
    centerX: (leftFace.x + rightFace.x) / 2,
    foreheadY: forehead.y,
    mouthY: (upperLip.y + lowerLip.y) / 2,
    faceWidth,
    rotation: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI)
  };
}

export function getAutoOverlayPlacement(
  lookId: HairLookId,
  geometry: FaceGeometry,
  frameWidth: number,
  frameHeight: number
): OverlayPlacement {
  const faceWidthPx = geometry.faceWidth * frameWidth;
  const desiredWidth = faceWidthPx * LOOK_WIDTH_FACTOR[lookId];
  const scale = desiredWidth / (frameWidth * LOOK_BASE_WIDTH_RATIO[lookId]);
  const targetX = geometry.centerX * frameWidth;
  const targetY = lookId === "bigote"
    ? geometry.mouthY * frameHeight
    : geometry.foreheadY * frameHeight + faceWidthPx * LOOK_VERTICAL_FACTOR[lookId];

  return {
    scale: Number(scale.toFixed(3)),
    offsetX: Math.round(targetX - frameWidth / 2),
    offsetY: Math.round(targetY - frameHeight / 2),
    rotation: Number(geometry.rotation.toFixed(1))
  };
}
