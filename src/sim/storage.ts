import type { Genome } from './genome';

// v3 schema adds wheelArm/wheelSpring/wheelDamping per wheel slot (legs + shocks).
// Earlier saves are silently dropped — hasSavedPopulation() returns false until a v3 save exists.
const KEY = 'genetic-cars:saved-pop:v3';
// Separate slot — written automatically after every generation so a refresh resumes.
// Manual save uses KEY; auto-save uses AUTO_KEY. The two never overwrite each other.
const AUTO_KEY = 'genetic-cars:autosave:v3';
// All-time best distance. Never wiped by new-pop, restore, or seed changes.
const TOP_KEY = 'genetic-cars:top-score:v1';

interface SerializedGenome {
  chassis: number[];
  wheelRadii: number[];
  wheelVertex: number[];
  wheelDensity: number[];
  wheelActive: number[];
  wheelArm: number[];
  wheelSpring: number[];
  wheelDamping: number[];
  chassisDensity: number;
}

interface SavedSnapshot {
  savedAt: string;
  generation: number;
  seed: string;
  gravity: number;
  mutableFloor: boolean;
  roughness: number;
  maxSlope: number;
  maxGenSeconds: number | null;
  bestScore: number;
  bestGenome: SerializedGenome | null;
  genomes: SerializedGenome[];
  history: { index: number; best: number; top10Avg: number; avg: number }[];
}

function toSerialized(g: Genome): SerializedGenome {
  return {
    chassis: Array.from(g.chassis),
    wheelRadii: Array.from(g.wheelRadii),
    wheelVertex: Array.from(g.wheelVertex),
    wheelDensity: Array.from(g.wheelDensity),
    wheelActive: Array.from(g.wheelActive),
    wheelArm: Array.from(g.wheelArm),
    wheelSpring: Array.from(g.wheelSpring),
    wheelDamping: Array.from(g.wheelDamping),
    chassisDensity: g.chassisDensity,
  };
}

function fromSerialized(s: SerializedGenome): Genome {
  return {
    chassis: Float32Array.from(s.chassis),
    wheelRadii: Float32Array.from(s.wheelRadii),
    wheelVertex: Uint8Array.from(s.wheelVertex),
    wheelDensity: Float32Array.from(s.wheelDensity),
    wheelActive: Uint8Array.from(s.wheelActive),
    wheelArm: Float32Array.from(s.wheelArm),
    wheelSpring: Float32Array.from(s.wheelSpring),
    wheelDamping: Float32Array.from(s.wheelDamping),
    chassisDensity: s.chassisDensity,
  };
}

type SaveInput = Omit<SavedSnapshot, 'savedAt' | 'genomes' | 'bestGenome'> & {
  genomes: Genome[];
  bestGenome: Genome | null;
};

function writeSnapshot(key: string, snapshot: SaveInput): void {
  const payload: SavedSnapshot = {
    ...snapshot,
    genomes: snapshot.genomes.map(toSerialized),
    bestGenome: snapshot.bestGenome ? toSerialized(snapshot.bestGenome) : null,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // QuotaExceeded or private mode — swallow; the sim shouldn't crash because of storage.
  }
}

export function savePopulation(snapshot: SaveInput): void {
  writeSnapshot(KEY, snapshot);
}

export function autosavePopulation(snapshot: SaveInput): void {
  writeSnapshot(AUTO_KEY, snapshot);
}

export interface RestoredPopulation {
  generation: number;
  seed: string;
  gravity: number;
  mutableFloor: boolean;
  roughness: number;
  maxSlope: number;
  maxGenSeconds: number | null;
  bestScore: number;
  bestGenome: Genome | null;
  genomes: Genome[];
  history: SavedSnapshot['history'];
  savedAt: string;
}

function readSnapshot(key: string): RestoredPopulation | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedSnapshot>;
    if (!parsed.genomes || !parsed.seed) return null;
    return {
      generation: parsed.generation ?? 0,
      seed: parsed.seed,
      gravity: parsed.gravity ?? 9.81,
      mutableFloor: parsed.mutableFloor ?? false,
      roughness: parsed.roughness ?? 0.45,
      maxSlope: parsed.maxSlope ?? 0.5,
      maxGenSeconds: parsed.maxGenSeconds === undefined ? null : parsed.maxGenSeconds,
      bestScore: parsed.bestScore ?? 0,
      bestGenome: parsed.bestGenome ? fromSerialized(parsed.bestGenome) : null,
      genomes: parsed.genomes.map(fromSerialized),
      history: parsed.history ?? [],
      savedAt: parsed.savedAt ?? '',
    };
  } catch {
    return null;
  }
}

export function loadPopulation(): RestoredPopulation | null {
  return readSnapshot(KEY);
}

export function loadAutosave(): RestoredPopulation | null {
  return readSnapshot(AUTO_KEY);
}

export function hasSavedPopulation(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export function getTopScore(): number {
  const raw = localStorage.getItem(TOP_KEY);
  if (!raw) return 0;
  const n = Number(raw);
  // Reject stale corrupt values from earlier sessions that lacked the
  // updateTopScore guard — anything non-finite or implausibly large is dropped.
  if (!Number.isFinite(n) || n < 0 || n > 1e6) {
    try { localStorage.removeItem(TOP_KEY); } catch { /* ignore */ }
    return 0;
  }
  return n;
}

/** Update top score if the candidate beats the stored one. Returns the (possibly unchanged) new top.
 * Rejects non-finite / negative / absurdly-large values — protects against
 * a single physics blow-up corrupting the all-time stat. */
export function updateTopScore(candidate: number): number {
  const current = getTopScore();
  if (!Number.isFinite(candidate) || candidate < 0 || candidate > 1e6) return current;
  if (candidate > current) {
    try {
      localStorage.setItem(TOP_KEY, String(candidate));
    } catch {
      // ignore
    }
    return candidate;
  }
  return current;
}
