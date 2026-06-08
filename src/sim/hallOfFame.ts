// All-time best genomes across all sessions. Tops out at HALL_SIZE entries,
// sorted descending by score. Stored un-versioned (shared across genome schema
// versions): fromSerialized backfills any genes added after an entry was saved
// (e.g. wheelTorque) so old replays keep behaving like the build that recorded them.

import { DEFAULT_TORQUE_GENE, MAX_WHEELS, type Genome } from './genome';

const KEY = 'genetic-cars:hall-of-fame:v1';
const HALL_SIZE = 8;

interface SerializedGenome {
  chassis: number[];
  wheelRadii: number[];
  wheelVertex: number[];
  wheelDensity: number[];
  wheelActive: number[];
  wheelArm: number[];
  wheelSpring: number[];
  wheelDamping: number[];
  wheelTorque: number[];
  chassisDensity: number;
}

interface SerializedEntry {
  score: number;
  generation: number;
  seed: string;
  worldName: string;
  achievedAt: string;
  genome: SerializedGenome;
}

export interface HallOfFameEntry {
  score: number;
  generation: number;
  seed: string;
  worldName: string;
  achievedAt: string;
  genome: Genome;
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
    wheelTorque: Array.from(g.wheelTorque),
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
    // Backfill entries saved before the torque gene existed with the legacy constant.
    wheelTorque: Float32Array.from(
      s.wheelTorque ?? new Array(MAX_WHEELS).fill(DEFAULT_TORQUE_GENE),
    ),
    chassisDensity: s.chassisDensity,
  };
}

export function loadHallOfFame(): HallOfFameEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SerializedEntry[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => Number.isFinite(e.score) && e.score >= 0 && e.score < 1e6 && e.genome)
      .map((e) => ({
        score: e.score,
        generation: e.generation,
        seed: e.seed,
        worldName: e.worldName,
        achievedAt: e.achievedAt,
        genome: fromSerialized(e.genome),
      }));
  } catch {
    return [];
  }
}

function saveHall(entries: HallOfFameEntry[]): void {
  try {
    const serialized: SerializedEntry[] = entries.map((e) => ({
      score: e.score,
      generation: e.generation,
      seed: e.seed,
      worldName: e.worldName,
      achievedAt: e.achievedAt,
      genome: toSerialized(e.genome),
    }));
    localStorage.setItem(KEY, JSON.stringify(serialized));
  } catch {
    // ignore
  }
}

/** Submit a candidate; if it beats any existing entry or there's room, add it
 * and keep the top HALL_SIZE sorted descending. Returns the (possibly unchanged) hall. */
export function submitToHall(
  candidate: Omit<HallOfFameEntry, 'achievedAt'>,
): HallOfFameEntry[] {
  if (
    !Number.isFinite(candidate.score) ||
    candidate.score <= 0 ||
    candidate.score > 1e6
  ) {
    return loadHallOfFame();
  }
  const existing = loadHallOfFame();
  // De-dupe by seed: if a higher score for the same seed already exists, skip;
  // if this is a new high for the same seed, replace.
  const sameSeedIdx = existing.findIndex((e) => e.seed === candidate.seed);
  if (sameSeedIdx >= 0 && existing[sameSeedIdx].score >= candidate.score) {
    return existing;
  }
  const filtered = sameSeedIdx >= 0 ? existing.filter((_, i) => i !== sameSeedIdx) : existing;
  const next: HallOfFameEntry[] = [
    ...filtered,
    { ...candidate, achievedAt: new Date().toISOString() },
  ];
  next.sort((a, b) => b.score - a.score);
  next.splice(HALL_SIZE);
  saveHall(next);
  return next;
}
