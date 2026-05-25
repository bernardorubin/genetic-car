import { createContext } from 'react';
import type { Population } from '../sim/population';
import type { LiveStats, SimSettings } from './types';

export interface SimContextValue {
  settings: SimSettings;
  stats: LiveStats;
  getPopulation: () => Population | null;
  setSetting: <K extends keyof SimSettings>(k: K, v: SimSettings[K]) => void;
  newPopulation: () => void;
  regenWorld: () => void;
  resetAll: () => void;
  save: () => void;
  restore: () => void;
  toggleReplay: () => void;
}

export const SimContext = createContext<SimContextValue | null>(null);
