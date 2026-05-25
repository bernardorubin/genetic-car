// Predefined track presets — each bundle a gravity + terrain shape + obstacle
// density combo so the player can pick a "world type" instead of dialing every
// knob individually. Custom mode lets them keep tweaking by hand.

import type { GravityKey } from '../state/types';

export type TrackId = 'earth' | 'lunar' | 'mars' | 'mountain' | 'crater' | 'custom';

export interface TrackPreset {
  id: TrackId;
  label: string;
  blurb: string;
  gravity: GravityKey;
  roughness: number;
  maxSlope: number;
  /** 0..1 — relative frequency of obstacle features per segment */
  obstacleDensity: number;
  /** Render accent color for the terrain tier gradient base. */
  accent: 'cyan' | 'lime' | 'amber' | 'rose' | 'fuchsia' | 'violet';
}

export const TRACK_PRESETS: Record<TrackId, TrackPreset> = {
  earth: {
    id: 'earth',
    label: 'Earth',
    blurb: 'rolling hills, default-ish gravity. the baseline.',
    gravity: 'earth',
    roughness: 0.45,
    maxSlope: 0.5,
    obstacleDensity: 0.06,
    accent: 'cyan',
  },
  lunar: {
    id: 'lunar',
    label: 'Lunar Plains',
    blurb: 'low gravity, gentle craters. floaty cars travel far.',
    gravity: 'moon',
    roughness: 0.3,
    maxSlope: 0.35,
    obstacleDensity: 0.12,
    accent: 'cyan',
  },
  mars: {
    id: 'mars',
    label: 'Mars Dunes',
    blurb: 'medium gravity, rough red terrain with frequent ramps.',
    gravity: 'mars',
    roughness: 0.65,
    maxSlope: 0.55,
    obstacleDensity: 0.1,
    accent: 'amber',
  },
  mountain: {
    id: 'mountain',
    label: 'Mount Olympus',
    blurb: 'earth gravity, cliff-grade slopes. only the climbers survive.',
    gravity: 'earth',
    roughness: 0.85,
    maxSlope: 0.9,
    obstacleDensity: 0.04,
    accent: 'rose',
  },
  crater: {
    id: 'crater',
    label: 'Crater Field',
    blurb: 'jupiter gravity, spike pits and ramps everywhere. brutal.',
    gravity: 'jupiter',
    roughness: 0.7,
    maxSlope: 0.6,
    obstacleDensity: 0.2,
    accent: 'fuchsia',
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    blurb: 'roll your own with the sidebar dials.',
    gravity: 'earth',
    roughness: 0.45,
    maxSlope: 0.5,
    obstacleDensity: 0.06,
    accent: 'cyan',
  },
};

export const TRACK_ORDER: TrackId[] = ['earth', 'lunar', 'mars', 'mountain', 'crater', 'custom'];

/**
 * Identify which preset (if any) matches a SimSettings tuple — used by the
 * sidebar to highlight the "active" preset even when the user later tweaks.
 * Returns 'custom' if no preset matches exactly.
 */
export function matchPreset(
  gravity: GravityKey,
  roughness: number,
  maxSlope: number,
): TrackId {
  for (const id of TRACK_ORDER) {
    if (id === 'custom') continue;
    const p = TRACK_PRESETS[id];
    if (
      p.gravity === gravity &&
      Math.abs(p.roughness - roughness) < 0.01 &&
      Math.abs(p.maxSlope - maxSlope) < 0.01
    ) {
      return id;
    }
  }
  return 'custom';
}
