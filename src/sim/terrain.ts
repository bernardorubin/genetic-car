import type { Rng } from './genome';

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface Terrain {
  points: TerrainPoint[];
  segmentWidth: number;
}

export interface TerrainOptions {
  /** 0..1 — how aggressively the slope drifts step-to-step. Higher = more chaotic. */
  roughness: number;
  /** 0..1 — clamp on the per-step slope. Higher = steeper cliffs allowed. */
  maxSlope: number;
  segments?: number;
}

const SEGMENTS_DEFAULT = 1500;
const SEG_WIDTH = 1.4;
const FLAT_LEAD = 6;

export function generateTerrain(rng: Rng, opts: TerrainOptions): Terrain {
  // Map normalized 0..1 dials into physical noise + slope clamps.
  // Wider span than v1 — 100% should produce visibly dramatic terrain, not just "moderate hills".
  const baseStepNoise = 0.25 + opts.roughness * 1.15; // 0.25..1.40
  const baseClamp = 0.5 + opts.maxSlope * 1.8;        // 0.50..2.30
  const segments = opts.segments ?? SEGMENTS_DEFAULT;

  const points: TerrainPoint[] = [];
  let y = 0;
  let slope = 0;
  for (let i = 0; i <= segments; i++) {
    points.push({ x: i * SEG_WIDTH, y });
    if (i < FLAT_LEAD) continue;
    // Progressive difficulty: gentle near spawn, full intensity by ~500m.
    // Gives early populations a fair chance and rewards survivors with real challenge.
    const x = i * SEG_WIDTH;
    const ramp = difficultyRamp(x);
    const stepNoise = baseStepNoise * ramp;
    const clamp = baseClamp * ramp;
    slope += (rng() - 0.5) * stepNoise;
    if (slope > clamp) slope = clamp;
    if (slope < -clamp) slope = -clamp;
    y += slope * 0.8;
  }
  return { points, segmentWidth: SEG_WIDTH };
}

/**
 * Difficulty multiplier as a function of world x (meters). Tightened from v1
 * so the user's dials are actually visible at typical leader distances (50–200m).
 *   x <  20  → 0.4   (only the tiny spawn area is eased — keeps gen-0 cars from instantly flipping)
 *   x ~ 100  → 1.0   (full dial intensity reached fast)
 *   x ~ 400  → 1.15
 *   x > 800  → 1.4   (expert zone)
 */
export function difficultyRamp(x: number): number {
  if (x < 20) return 0.4;
  if (x < 100) {
    const t = (x - 20) / 80;  // 0..1
    return 0.4 + t * 0.6;     // 0.4..1.0
  }
  if (x < 400) {
    const t = (x - 100) / 300;
    return 1.0 + t * 0.15;    // 1.0..1.15
  }
  if (x < 800) {
    const t = (x - 400) / 400;
    return 1.15 + t * 0.25;   // 1.15..1.4
  }
  return 1.4;
}
