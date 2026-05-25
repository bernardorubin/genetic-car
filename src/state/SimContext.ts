import { createContext } from 'react';
import type { Population } from '../sim/population';
import type { Achievement } from '../sim/achievements';
import type { HallOfFameEntry } from '../sim/hallOfFame';
import type { LiveStats, SimSettings } from './types';

export interface AchievementToast {
  /** unique id of the unlock event (so the UI can key it for animation) */
  key: number;
  achievement: Achievement;
}

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
  /** active achievement toasts (auto-dismiss managed by the toast component) */
  toasts: AchievementToast[];
  dismissToast: (key: number) => void;
  /** set of achievement ids unlocked so far */
  unlockedAchievements: Set<string>;
  /** all-time top genomes across all sessions, sorted descending by score */
  hallOfFame: HallOfFameEntry[];
  /** replay an arbitrary genome (typically from the hall of fame) */
  replayGenome: (genome: HallOfFameEntry['genome']) => void;
  /** Active record-celebration events. Self-dismissed by the overlay component. */
  recordCelebrations: { key: number; score: number }[];
  dismissRecordCelebration: (key: number) => void;
}

export const SimContext = createContext<SimContextValue | null>(null);
