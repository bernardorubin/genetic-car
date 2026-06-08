import type { GenerationStat3D } from '../sim3d/population3d';
import type { FloorMode, GravityKey } from '../state/types';

// Gravity + floor enums are physics-agnostic — reuse the 2D definitions.
export type { FloorMode, GravityKey } from '../state/types';
export { GRAVITY_VALUES, gravityKeyFromValue } from '../state/types';

export interface Sim3DSettings {
  mutationRate: number;
  mutationSize: number;
  eliteCount: number;
  gravity: GravityKey;
  floor: FloorMode;
  /** 0..1 — how chaotic the forward slope walk is */
  roughness: number;
  /** 0..1 — clamp on per-step slope */
  maxSlope: number;
  /** seconds; null = no cap (stall detector still ends idle gens) */
  maxGenSeconds: number | null;
  /** when true, each axle evolves its own motor torque */
  varyTorque: boolean;
  /** 0..1 — how dramatic car morphology can get (0 = uniform boxes, 1 = wild) */
  bodyVariety: number;
  /** 0..1 — how much wheel radius can differ across one car's axles */
  wheelSizeSpread: number;
  /** full lateral channel width in meters (berms bank the outer edges) */
  trackWidth: number;
  seed: string;
  render: boolean;
}

export interface LiveStats3D {
  generation: number;
  alive: number;
  total: number;
  best: number;
  avg: number;
  topScore: number;
  history: GenerationStat3D[];
  replay: boolean;
  hasBestGenome: boolean;
  hasSaved: boolean;
}

export const POP_SIZE_3D = 16;

export const DEFAULT_SETTINGS_3D: Sim3DSettings = {
  mutationRate: 0.08,
  mutationSize: 0.25,
  eliteCount: 2,
  gravity: 'earth',
  floor: 'fixed',
  roughness: 0.4,
  maxSlope: 0.5,
  // A cap keeps generations turning over so evolution stays watchable (a leader on
  // gentle 3D hills could otherwise roll a long time before stalling).
  maxGenSeconds: 25,
  varyTorque: true,
  // Mid-high so the morphology upgrade is visible out of the box.
  bodyVariety: 0.6,
  wheelSizeSpread: 0.3,
  trackWidth: 14,
  seed: '',
  render: true,
};

export const EMPTY_STATS_3D: LiveStats3D = {
  generation: 0,
  alive: 0,
  total: 0,
  best: 0,
  avg: 0,
  topScore: 0,
  history: [],
  replay: false,
  hasBestGenome: false,
  hasSaved: false,
};
