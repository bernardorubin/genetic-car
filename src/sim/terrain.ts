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
  // Two-layer terrain model — matches BoxCar2D's jagged feel.
  //
  //   Layer 1: low-frequency slope-walk         → sustained hills + valleys
  //   Layer 2: per-segment high-frequency Y noise → sharp angle changes at every vertex
  //
  // A pure slope-walk integrates into smooth curves no matter how loud the noise
  // (Brownian motion of an integral is smooth). The jitter layer is what gives us
  // the zigzag profile of the original game.
  const trendNoise = 0.15 + opts.roughness * 0.5;   // slope-walk delta (low freq)
  const slopeClamp = 0.4 + opts.maxSlope * 1.6;     // slope clamp
  const jitter = 0.1 + opts.roughness * 1.4;        // per-segment Y jitter (high freq, this is the jagged bit)
  const segments = opts.segments ?? SEGMENTS_DEFAULT;

  const points: TerrainPoint[] = [];
  let y = 0;
  let slope = 0;
  for (let i = 0; i <= segments; i++) {
    points.push({ x: i * SEG_WIDTH, y });
    if (i < FLAT_LEAD) continue;
    const x = i * SEG_WIDTH;
    const ramp = difficultyRamp(x);
    // Layer 1: smooth trend
    slope += (rng() - 0.5) * trendNoise * ramp;
    const cap = slopeClamp * ramp;
    if (slope > cap) slope = cap;
    if (slope < -cap) slope = -cap;
    // Layer 2: independent per-segment jitter — what makes adjacent segments
    // have different angles instead of integrating into a smooth curve.
    const jitterDy = (rng() - 0.5) * jitter * ramp;
    y += slope * 0.8 + jitterDy;
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
