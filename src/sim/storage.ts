import type { Genome } from './genome';

// v2 schema adds wheelActive[] for up-to-4 wheels; v1 saves are silently dropped
// (old key no longer read, hasSavedPopulation returns false until a v2 save exists).
const KEY = 'genetic-cars:saved-pop:v2';

interface SerializedGenome {
  chassis: number[];
  wheelRadii: number[];
  wheelVertex: number[];
  wheelDensity: number[];
  wheelActive: number[];
  chassisDensity: number;
}

interface SavedSnapshot {
  savedAt: string;
  generation: number;
  seed: string;
  gravity: number;
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
    chassisDensity: s.chassisDensity,
  };
}

export function savePopulation(snapshot: Omit<SavedSnapshot, 'savedAt' | 'genomes'> & { genomes: Genome[] }): void {
  const payload: SavedSnapshot = {
    ...snapshot,
    genomes: snapshot.genomes.map(toSerialized),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export interface RestoredPopulation {
  generation: number;
  seed: string;
  gravity: number;
  genomes: Genome[];
  history: SavedSnapshot['history'];
  savedAt: string;
}

export function loadPopulation(): RestoredPopulation | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as SavedSnapshot;
  return {
    generation: parsed.generation,
    seed: parsed.seed,
    gravity: parsed.gravity,
    genomes: parsed.genomes.map(fromSerialized),
    history: parsed.history,
    savedAt: parsed.savedAt,
  };
}

export function hasSavedPopulation(): boolean {
  return localStorage.getItem(KEY) !== null;
}
