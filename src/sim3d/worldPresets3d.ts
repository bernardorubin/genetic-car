// 3D world presets — bundle a gravity + terrain shape + channel width so the player can
// pick a "world type" instead of dialing each knob. Mirrors the 2D sim/tracks.ts. Custom
// is just the "you tweaked it" indicator. Pure data; no React/physics import.

import type { GravityKey } from '../state3d/types3d';

export type WorldId = 'flatlands' | 'rolling' | 'hills' | 'mountains' | 'custom';

export interface WorldPreset3D {
  id: WorldId;
  label: string;
  blurb: string;
  gravity: GravityKey;
  roughness: number;
  maxSlope: number;
  /** full lateral channel width in meters */
  trackWidth: number;
  accent: 'cyan' | 'lime' | 'amber' | 'rose';
}

export const WORLD_PRESETS_3D: Record<WorldId, WorldPreset3D> = {
  flatlands: {
    id: 'flatlands',
    label: 'Flatlands',
    blurb: 'near-flat, wide lane. shakedown runs.',
    gravity: 'earth',
    roughness: 0.1,
    maxSlope: 0.2,
    trackWidth: 18,
    accent: 'cyan',
  },
  rolling: {
    id: 'rolling',
    label: 'Rolling',
    blurb: 'gentle rolling hills. the baseline.',
    gravity: 'earth',
    roughness: 0.4,
    maxSlope: 0.45,
    trackWidth: 14,
    accent: 'lime',
  },
  hills: {
    id: 'hills',
    label: 'Hills',
    blurb: 'bumpy ground, tighter lane. climbers favored.',
    gravity: 'earth',
    roughness: 0.7,
    maxSlope: 0.65,
    trackWidth: 12,
    accent: 'amber',
  },
  mountains: {
    id: 'mountains',
    label: 'Mountains',
    blurb: 'steep late climbs, high berms. brutal.',
    gravity: 'earth',
    roughness: 0.9,
    maxSlope: 0.95,
    trackWidth: 10,
    accent: 'rose',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    blurb: 'roll your own with the dials below.',
    gravity: 'earth',
    roughness: 0.4,
    maxSlope: 0.45,
    trackWidth: 14,
    accent: 'cyan',
  },
};

export const WORLD_ORDER_3D: WorldId[] = ['flatlands', 'rolling', 'hills', 'mountains', 'custom'];

/** Which preset (if any) a settings tuple matches — used to highlight the active one. */
export function matchWorld3d(
  gravity: GravityKey,
  roughness: number,
  maxSlope: number,
  trackWidth: number,
): WorldId {
  for (const id of WORLD_ORDER_3D) {
    if (id === 'custom') continue;
    const p = WORLD_PRESETS_3D[id];
    if (
      p.gravity === gravity &&
      Math.abs(p.roughness - roughness) < 0.01 &&
      Math.abs(p.maxSlope - maxSlope) < 0.01 &&
      Math.abs(p.trackWidth - trackWidth) < 0.5
    ) {
      return id;
    }
  }
  return 'custom';
}
