import type { Genome3D } from './genome3d';

// 3D save slots — separate namespace from the 2D lab so the two never collide.
// v2: genome gained struts / second-segment / hue genes + world morphology settings;
// old v1 saves are silently dropped (same convention as the 2D sim's key bumps).
const KEY = 'genetic-cars-3d:saved-pop:v2';
const AUTO_KEY = 'genetic-cars-3d:autosave:v2';
const TOP_KEY = 'genetic-cars-3d:top-score:v1';

interface SerializedGenome3D {
  chassisHalfL: number;
  chassisHalfH: number;
  chassisHalfW: number;
  chassisDensity: number;
  trackExtra: number;
  axleActive: number[];
  axlePos: number[];
  wheelRadius: number[];
  wheelWidth: number[];
  motorTorque: number[];
  strutLen: number[];
  seg2Present: number;
  seg2HalfL: number;
  seg2HalfH: number;
  seg2HalfW: number;
  seg2OffX: number;
  seg2OffY: number;
  hue: number;
}

interface SavedSnapshot3D {
  savedAt: string;
  generation: number;
  seed: string;
  gravity: number;
  mutableFloor: boolean;
  roughness: number;
  maxSlope: number;
  maxGenSeconds: number | null;
  varyTorque: boolean;
  bodyVariety: number;
  wheelSizeSpread: number;
  trackWidth: number;
  bestScore: number;
  bestGenome: SerializedGenome3D | null;
  genomes: SerializedGenome3D[];
  history: { index: number; best: number; top10Avg: number; avg: number }[];
}

function toSerialized(g: Genome3D): SerializedGenome3D {
  return {
    chassisHalfL: g.chassisHalfL,
    chassisHalfH: g.chassisHalfH,
    chassisHalfW: g.chassisHalfW,
    chassisDensity: g.chassisDensity,
    trackExtra: g.trackExtra,
    axleActive: Array.from(g.axleActive),
    axlePos: Array.from(g.axlePos),
    wheelRadius: Array.from(g.wheelRadius),
    wheelWidth: Array.from(g.wheelWidth),
    motorTorque: Array.from(g.motorTorque),
    strutLen: Array.from(g.strutLen),
    seg2Present: g.seg2Present,
    seg2HalfL: g.seg2HalfL,
    seg2HalfH: g.seg2HalfH,
    seg2HalfW: g.seg2HalfW,
    seg2OffX: g.seg2OffX,
    seg2OffY: g.seg2OffY,
    hue: g.hue,
  };
}

function fromSerialized(s: SerializedGenome3D): Genome3D {
  return {
    chassisHalfL: s.chassisHalfL,
    chassisHalfH: s.chassisHalfH,
    chassisHalfW: s.chassisHalfW,
    chassisDensity: s.chassisDensity,
    trackExtra: s.trackExtra,
    axleActive: Uint8Array.from(s.axleActive),
    axlePos: Float32Array.from(s.axlePos),
    wheelRadius: Float32Array.from(s.wheelRadius),
    wheelWidth: Float32Array.from(s.wheelWidth),
    motorTorque: Float32Array.from(s.motorTorque),
    strutLen: Float32Array.from(s.strutLen),
    seg2Present: s.seg2Present,
    seg2HalfL: s.seg2HalfL,
    seg2HalfH: s.seg2HalfH,
    seg2HalfW: s.seg2HalfW,
    seg2OffX: s.seg2OffX,
    seg2OffY: s.seg2OffY,
    hue: s.hue,
  };
}

type SaveInput = Omit<SavedSnapshot3D, 'savedAt' | 'genomes' | 'bestGenome'> & {
  genomes: Genome3D[];
  bestGenome: Genome3D | null;
};

function writeSnapshot(key: string, snapshot: SaveInput): void {
  const payload: SavedSnapshot3D = {
    ...snapshot,
    genomes: snapshot.genomes.map(toSerialized),
    bestGenome: snapshot.bestGenome ? toSerialized(snapshot.bestGenome) : null,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // QuotaExceeded / private mode — swallow.
  }
}

export function savePopulation3d(snapshot: SaveInput): void {
  writeSnapshot(KEY, snapshot);
}

export function autosavePopulation3d(snapshot: SaveInput): void {
  writeSnapshot(AUTO_KEY, snapshot);
}

export interface RestoredPopulation3D {
  generation: number;
  seed: string;
  gravity: number;
  mutableFloor: boolean;
  roughness: number;
  maxSlope: number;
  maxGenSeconds: number | null;
  varyTorque: boolean;
  bodyVariety: number;
  wheelSizeSpread: number;
  trackWidth: number;
  bestScore: number;
  bestGenome: Genome3D | null;
  genomes: Genome3D[];
  history: SavedSnapshot3D['history'];
  savedAt: string;
}

function readSnapshot(key: string): RestoredPopulation3D | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedSnapshot3D>;
    if (!parsed.genomes || !parsed.seed) return null;
    return {
      generation: parsed.generation ?? 0,
      seed: parsed.seed,
      gravity: parsed.gravity ?? 9.81,
      mutableFloor: parsed.mutableFloor ?? false,
      roughness: parsed.roughness ?? 0.4,
      maxSlope: parsed.maxSlope ?? 0.5,
      maxGenSeconds: parsed.maxGenSeconds === undefined ? null : parsed.maxGenSeconds,
      varyTorque: parsed.varyTorque ?? true,
      bodyVariety: parsed.bodyVariety ?? 0.6,
      wheelSizeSpread: parsed.wheelSizeSpread ?? 0.3,
      trackWidth: parsed.trackWidth ?? 14,
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

export function loadPopulation3d(): RestoredPopulation3D | null {
  return readSnapshot(KEY);
}

export function loadAutosave3d(): RestoredPopulation3D | null {
  return readSnapshot(AUTO_KEY);
}

export function hasSavedPopulation3d(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function getTopScore3d(): number {
  let raw: string | null;
  try {
    raw = localStorage.getItem(TOP_KEY);
  } catch {
    return 0;
  }
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1e6) {
    try {
      localStorage.removeItem(TOP_KEY);
    } catch {
      /* ignore */
    }
    return 0;
  }
  return n;
}

export function updateTopScore3d(candidate: number): number {
  const current = getTopScore3d();
  if (!Number.isFinite(candidate) || candidate < 0 || candidate > 1e6) return current;
  if (candidate > current) {
    try {
      localStorage.setItem(TOP_KEY, String(candidate));
    } catch {
      /* ignore */
    }
    return candidate;
  }
  return current;
}
