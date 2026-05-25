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
  // Map normalized 0..1 dials into physical noise + slope clamps. Defaults
  // (roughness=0.45, maxSlope=0.5) reproduce the original tuning closely.
  const baseStepNoise = 0.2 + opts.roughness * 0.8; // 0.2..1.0
  const baseClamp = 0.4 + opts.maxSlope * 1.2;      // 0.4..1.6
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
 * Difficulty multiplier as a function of world x (meters).
 *   x <  50  → 0.25 (effectively flat — gen-0 cars can move at all)
 *   x ~ 200  → ~0.7
 *   x ~ 500  → 1.0  (full dial intensity)
 *   x > 800  → 1.25 (modestly harder than the dial suggests; "expert" zone)
 */
export function difficultyRamp(x: number): number {
  if (x < 50) return 0.25;
  if (x < 500) {
    const t = (x - 50) / 450; // 0..1
    return 0.25 + t * 0.75;   // 0.25..1.0
  }
  if (x < 800) {
    const t = (x - 500) / 300; // 0..1
    return 1.0 + t * 0.25;     // 1.0..1.25
  }
  return 1.25;
}
