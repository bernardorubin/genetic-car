import type { GenerationStat } from '../sim/population';

export type GravityKey = 'moon' | 'mars' | 'earth' | 'jupiter';
export type FloorMode = 'fixed' | 'mutable';

export const GRAVITY_VALUES: Record<GravityKey, number> = {
  moon: 1.62,
  mars: 3.71,
  earth: 9.81,
  jupiter: 24.79,
};

export interface SimSettings {
  mutationRate: number;
  mutationSize: number;
  eliteCount: number;
  gravity: GravityKey;
  floor: FloorMode;
  seed: string;
  render: boolean;
}

export interface LiveStats {
  generation: number;
  alive: number;
  total: number;
  best: number;
  avg: number;
  history: GenerationStat[];
  replay: boolean;
  hasBestGenome: boolean;
  hasSaved: boolean;
}

export const POP_SIZE = 20;

export const DEFAULT_SETTINGS: SimSettings = {
  mutationRate: 0.05,
  mutationSize: 0.2,
  eliteCount: 2,
  gravity: 'earth',
  floor: 'fixed',
  seed: '',
  render: true,
};

export const EMPTY_STATS: LiveStats = {
  generation: 0,
  alive: 0,
  total: 0,
  best: 0,
  avg: 0,
  history: [],
  replay: false,
  hasBestGenome: false,
  hasSaved: false,
};
