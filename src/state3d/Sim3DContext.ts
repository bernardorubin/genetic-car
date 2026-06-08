import { createContext } from 'react';
import type { Population3D } from '../sim3d/population3d';
import type { LiveStats3D, Sim3DSettings } from './types3d';

export interface Sim3DContextValue {
  settings: Sim3DSettings;
  stats: LiveStats3D;
  /** true once the Rapier WASM has initialized and a population exists */
  ready: boolean;
  getPopulation: () => Population3D | null;
  setSetting: <K extends keyof Sim3DSettings>(k: K, v: Sim3DSettings[K]) => void;
  newPopulation: () => void;
  regenWorld: () => void;
  save: () => void;
  restore: () => void;
  toggleReplay: () => void;
}

export const Sim3DContext = createContext<Sim3DContextValue | null>(null);
