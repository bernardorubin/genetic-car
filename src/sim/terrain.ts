import type { Rng } from './genome';

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface Terrain {
  points: TerrainPoint[];
  segmentWidth: number;
}

const SEGMENTS_DEFAULT = 1500; // ~2 km of track
const SEG_WIDTH = 1.4;
const FLAT_LEAD = 6;

export function generateTerrain(rng: Rng, segments = SEGMENTS_DEFAULT): Terrain {
  const points: TerrainPoint[] = [];
  let y = 0;
  let slope = 0;
  for (let i = 0; i <= segments; i++) {
    points.push({ x: i * SEG_WIDTH, y });
    if (i < FLAT_LEAD) continue;
    // Random-walk slope with clamping — keeps terrain traversable.
    slope += (rng() - 0.5) * 0.55;
    if (slope > 1.0) slope = 1.0;
    if (slope < -1.0) slope = -1.0;
    y += slope * 0.8;
  }
  return { points, segmentWidth: SEG_WIDTH };
}
