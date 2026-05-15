import { describe, expect, it } from "vitest";
import { buildFaceGeometry, getAutoOverlayPlacement } from "@/lib/hair-fit";

function facePoints() {
  const points = Array.from({ length: 468 }, () => ({ x: 0, y: 0 }));
  points[10] = { x: 0.5, y: 0.22 };
  points[234] = { x: 0.28, y: 0.5 };
  points[454] = { x: 0.72, y: 0.5 };
  points[33] = { x: 0.38, y: 0.42 };
  points[263] = { x: 0.62, y: 0.42 };
  points[13] = { x: 0.5, y: 0.66 };
  points[14] = { x: 0.5, y: 0.68 };
  return points;
}

describe("hair fit", () => {
  it("deriva geometría facial a partir de landmarks", () => {
    const geometry = buildFaceGeometry(facePoints());
    expect(geometry).not.toBeNull();
    expect(geometry?.centerX).toBeCloseTo(0.5);
    expect(geometry?.foreheadY).toBeCloseTo(0.22);
    expect(geometry?.mouthY).toBeCloseTo(0.67);
    expect(geometry?.faceWidth).toBeCloseTo(0.44);
    expect(geometry?.rotation).toBeCloseTo(0);
  });

  it("coloca pelo y bigote en zonas distintas de la cara", () => {
    const geometry = buildFaceGeometry(facePoints());
    expect(geometry).not.toBeNull();
    if (!geometry) return;

    const hair = getAutoOverlayPlacement("clasico", geometry, 300, 400);
    const moustache = getAutoOverlayPlacement("bigote", geometry, 300, 400);

    expect(hair.offsetY).toBeLessThan(0);
    expect(moustache.offsetY).toBeGreaterThan(0);
    expect(hair.scale).toBeGreaterThan(moustache.scale);
  });
});
