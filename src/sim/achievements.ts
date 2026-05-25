// Achievement definitions + unlock detection. Pure logic, no React.
//
// Each achievement has a stable `id` (the localStorage key), a display title,
// description, and a check function that runs once per generation completion.

import type { Population } from './population';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Returns true if the achievement should unlock based on the current state. */
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  population: Population;
  /** best distance this generation just completed */
  genBest: number;
  /** all-time top score (post-update) */
  topScore: number;
  /** total generations evolved in this world (since last new-pop) */
  generation: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-100m',
    title: 'Off the Block',
    description: 'A car traveled 100 meters.',
    check: ({ genBest, topScore }) => Math.max(genBest, topScore) >= 100,
  },
  {
    id: 'first-300m',
    title: 'Cruising',
    description: 'A car traveled 300 meters.',
    check: ({ genBest, topScore }) => Math.max(genBest, topScore) >= 300,
  },
  {
    id: 'first-500m',
    title: 'Long Hauler',
    description: 'A car traveled 500 meters — into the rose tier.',
    check: ({ genBest, topScore }) => Math.max(genBest, topScore) >= 500,
  },
  {
    id: 'first-1km',
    title: 'Kilometer Club',
    description: 'One full kilometer of evolution.',
    check: ({ genBest, topScore }) => Math.max(genBest, topScore) >= 1000,
  },
  {
    id: 'gen-10',
    title: 'Adolescence',
    description: 'Survived 10 generations of selection pressure.',
    check: ({ generation }) => generation >= 10,
  },
  {
    id: 'gen-50',
    title: 'Maturity',
    description: '50 generations down. The lineage is real now.',
    check: ({ generation }) => generation >= 50,
  },
  {
    id: 'gen-200',
    title: 'Patient Breeder',
    description: '200 generations — your world has depth.',
    check: ({ generation }) => generation >= 200,
  },
  {
    id: 'monowheel',
    title: 'Monowheel',
    description: 'The best-ever car has exactly 1 active wheel.',
    check: ({ population }) => {
      const g = population.bestGenome;
      if (!g) return false;
      let n = 0;
      for (let i = 0; i < g.wheelActive.length; i++) if (g.wheelActive[i]) n++;
      return n === 1;
    },
  },
  {
    id: 'quad-master',
    title: 'Quad Master',
    description: 'The best-ever car has all 4 wheels active.',
    check: ({ population }) => {
      const g = population.bestGenome;
      if (!g) return false;
      let n = 0;
      for (let i = 0; i < g.wheelActive.length; i++) if (g.wheelActive[i]) n++;
      return n === 4;
    },
  },
  {
    id: 'long-legs',
    title: 'Spider Legs',
    description: 'A surviving car has a wheel on a strut longer than 50 cm.',
    check: ({ population }) => {
      const g = population.bestGenome;
      if (!g) return false;
      for (let i = 0; i < g.wheelArm.length; i++) {
        if (g.wheelActive[i] && g.wheelArm[i] > 0.5) return true;
      }
      return false;
    },
  },
  {
    id: 'doubling',
    title: 'Doubling Down',
    description: "This generation's best more than doubled the all-time record.",
    check: ({ genBest, topScore }) => topScore > 0 && genBest > topScore * 2,
  },
];

const STORAGE_KEY = 'genetic-cars:achievements:v1';

export function getUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function setUnlocked(set: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

/** Run all checks against the current context. Returns NEWLY-unlocked achievements
 * and writes the updated set back to localStorage. */
export function checkUnlocks(
  ctx: AchievementContext,
  already: Set<string>,
): { newlyUnlocked: Achievement[]; updated: Set<string> } {
  const newlyUnlocked: Achievement[] = [];
  const updated = new Set(already);
  for (const a of ACHIEVEMENTS) {
    if (updated.has(a.id)) continue;
    if (a.check(ctx)) {
      updated.add(a.id);
      newlyUnlocked.push(a);
    }
  }
  if (newlyUnlocked.length > 0) setUnlocked(updated);
  return { newlyUnlocked, updated };
}

export function listAchievements(): readonly Achievement[] {
  return ACHIEVEMENTS;
}
