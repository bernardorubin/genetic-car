// Genetic algorithm for Genome3D — mirrors the proven structure of the 2D sim/ga.ts
// (tournament selection size 3, uniform crossover, scaled-jump mutation, elitism +
// favorite). Kept as a separate file rather than a forced generic abstraction, per
// "prefer duplication over wrong abstractions".

import {
  MAX_AXLES,
  cloneGenome3d,
  ensureValid3d,
  randomGenome3d,
  type Genome3D,
  type Rng,
} from './genome3d';

export interface GA3DParams {
  /** [0,1] — chance any single gene mutates each child */
  mutationRate: number;
  /** [0,1] — when a gene mutates, how far it can jump (1 = full random replace) */
  mutationSize: number;
  /** number of unchanged top-N genomes carried forward */
  eliteCount: number;
}

export interface ScoredGenome3D {
  genome: Genome3D;
  score: number;
}

export function randomPopulation3d(rng: Rng, size: number): Genome3D[] {
  const pop: Genome3D[] = [];
  for (let i = 0; i < size; i++) pop.push(randomGenome3d(rng));
  return pop;
}

function tournamentPick(rng: Rng, scored: ScoredGenome3D[]): Genome3D {
  const k = 3;
  let bestIdx = Math.floor(rng() * scored.length);
  let bestScore = scored[bestIdx].score;
  for (let i = 1; i < k; i++) {
    const idx = Math.floor(rng() * scored.length);
    if (scored[idx].score > bestScore) {
      bestScore = scored[idx].score;
      bestIdx = idx;
    }
  }
  return scored[bestIdx].genome;
}

/** Uniform crossover — each gene independently picked from parentA or parentB. */
function crossover(rng: Rng, a: Genome3D, b: Genome3D): Genome3D {
  const child = cloneGenome3d(a);
  if (rng() < 0.5) child.chassisHalfL = b.chassisHalfL;
  if (rng() < 0.5) child.chassisHalfH = b.chassisHalfH;
  if (rng() < 0.5) child.chassisHalfW = b.chassisHalfW;
  if (rng() < 0.5) child.chassisDensity = b.chassisDensity;
  if (rng() < 0.5) child.trackExtra = b.trackExtra;
  for (let i = 0; i < MAX_AXLES; i++) {
    if (rng() < 0.5) child.axleActive[i] = b.axleActive[i];
    if (rng() < 0.5) child.axlePos[i] = b.axlePos[i];
    if (rng() < 0.5) child.wheelRadius[i] = b.wheelRadius[i];
    if (rng() < 0.5) child.wheelWidth[i] = b.wheelWidth[i];
    if (rng() < 0.5) child.motorTorque[i] = b.motorTorque[i];
  }
  ensureValid3d(child);
  return child;
}

function mutateGene01(rng: Rng, value: number, size: number): number {
  const target = rng();
  const v = value * (1 - size) + target * size;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function mutateGenome(rng: Rng, g: Genome3D, params: GA3DParams): Genome3D {
  const out = cloneGenome3d(g);
  const { mutationRate, mutationSize } = params;
  if (rng() < mutationRate) out.chassisHalfL = mutateGene01(rng, out.chassisHalfL, mutationSize);
  if (rng() < mutationRate) out.chassisHalfH = mutateGene01(rng, out.chassisHalfH, mutationSize);
  if (rng() < mutationRate) out.chassisHalfW = mutateGene01(rng, out.chassisHalfW, mutationSize);
  if (rng() < mutationRate)
    out.chassisDensity = mutateGene01(rng, out.chassisDensity, mutationSize);
  if (rng() < mutationRate) out.trackExtra = mutateGene01(rng, out.trackExtra, mutationSize);
  for (let i = 0; i < MAX_AXLES; i++) {
    if (rng() < mutationRate) out.axlePos[i] = mutateGene01(rng, out.axlePos[i], mutationSize);
    if (rng() < mutationRate)
      out.wheelRadius[i] = mutateGene01(rng, out.wheelRadius[i], mutationSize);
    if (rng() < mutationRate)
      out.wheelWidth[i] = mutateGene01(rng, out.wheelWidth[i], mutationSize);
    if (rng() < mutationRate)
      out.motorTorque[i] = mutateGene01(rng, out.motorTorque[i], mutationSize);
    // Axle-flip uses a softened rate — adding/removing an axle is a high-impact change.
    if (rng() < mutationRate * 0.5) out.axleActive[i] = out.axleActive[i] ? 0 : 1;
  }
  ensureValid3d(out);
  return out;
}

/**
 * Build the next generation: sort by score, copy `favorite` + top `eliteCount`
 * unchanged, fill the rest by tournament selection → crossover → mutation.
 */
export function nextGeneration3d(
  rng: Rng,
  scored: ScoredGenome3D[],
  params: GA3DParams,
  favorite: Genome3D | null = null,
): Genome3D[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const size = sorted.length;
  const elites = Math.min(params.eliteCount, size);
  const next: Genome3D[] = [];
  if (favorite) next.push(cloneGenome3d(favorite));
  for (let i = 0; next.length < elites + (favorite ? 1 : 0) && i < size; i++) {
    next.push(cloneGenome3d(sorted[i].genome));
  }
  const pool: ScoredGenome3D[] = [...sorted];
  if (favorite) {
    const favScore = sorted[0]?.score ?? 1;
    for (let i = 0; i < 3; i++) pool.push({ genome: favorite, score: favScore });
  }
  while (next.length < size) {
    const a = tournamentPick(rng, pool);
    const b = tournamentPick(rng, pool);
    next.push(mutateGenome(rng, crossover(rng, a, b), params));
  }
  return next;
}
