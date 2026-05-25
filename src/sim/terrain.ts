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
  /** 0..1 — per-segment probability of injecting an obstacle feature (spike pit / ramp). */
  obstacleDensity?: number;
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
  //   Layer 3: occasional obstacle features (spike pits, ramps) sprinkled in
  //
  // A pure slope-walk integrates into smooth curves no matter how loud the noise
  // (Brownian motion of an integral is smooth). The jitter layer is what gives us
  // the zigzag profile of the original game.
  const trendNoise = 0.15 + opts.roughness * 0.5;
  const slopeClamp = 0.4 + opts.maxSlope * 1.6;
  const jitter = 0.1 + opts.roughness * 1.4;
  const segments = opts.segments ?? SEGMENTS_DEFAULT;
  const obstacleDensity = opts.obstacleDensity ?? 0;

  const points: TerrainPoint[] = [];
  let y = 0;
  let slope = 0;
  // Cooldown after an obstacle so we don't stack them shoulder-to-shoulder.
  let obstacleCooldown = 0;

  for (let i = 0; i <= segments; i++) {
    points.push({ x: i * SEG_WIDTH, y });
    if (i < FLAT_LEAD) continue;
    const x = i * SEG_WIDTH;
    const ramp = difficultyRamp(x);

    // Layer 1+2: smooth trend with per-segment jitter
    slope += (rng() - 0.5) * trendNoise * ramp;
    const cap = slopeClamp * ramp;
    if (slope > cap) slope = cap;
    if (slope < -cap) slope = -cap;
    const jitterDy = (rng() - 0.5) * jitter * ramp;
    y += slope * 0.8 + jitterDy;

    // Layer 3: obstacle features.
    // Obstacles take a small run of upcoming segments — we mutate `y` for those
    // segments as we walk forward, simulating the shape directly into the points.
    if (obstacleCooldown > 0) {
      obstacleCooldown--;
      continue;
    }
    // Cars are extra fragile near spawn — only sprinkle obstacles past 60m.
    if (x < 60) continue;
    if (rng() > obstacleDensity * ramp) continue;

    const type = rng();
    if (type < 0.5) {
      // Spike pit — a sharp V-notch down then back up. 3 segments.
      const depth = 1.2 + rng() * 1.6;
      points.push({ x: x + SEG_WIDTH * 0.5, y: y - depth });
      points.push({ x: x + SEG_WIDTH, y });
      i += 1; // skip ahead because we wrote the next segment
      obstacleCooldown = 5;
    } else {
      // Ramp/bump — a triangular spike up then back down. 2 segments.
      const height = 0.8 + rng() * 1.4;
      points.push({ x: x + SEG_WIDTH * 0.5, y: y + height });
      points.push({ x: x + SEG_WIDTH, y });
      i += 1;
      obstacleCooldown = 6;
    }
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
