import {
  CHASSIS_VERTICES,
  MAX_WHEELS,
  ensureValid,
  randomGenome,
  type Genome,
  type Rng,
} from './genome';

export interface GAParams {
  /** [0,1] — chance any single gene mutates each child */
  mutationRate: number;
  /** [0,1] — when a gene mutates, how far it can jump (1 = full random replace) */
  mutationSize: number;
  /** number of unchanged top-N genomes carried forward */
  eliteCount: number;
}

export interface ScoredGenome {
  genome: Genome;
  score: number;
}

export function cloneGenome(g: Genome): Genome {
  return {
    chassis: new Float32Array(g.chassis),
    wheelRadii: new Float32Array(g.wheelRadii),
    wheelVertex: new Uint8Array(g.wheelVertex),
    wheelDensity: new Float32Array(g.wheelDensity),
    wheelActive: new Uint8Array(g.wheelActive),
    chassisDensity: g.chassisDensity,
  };
}

export function randomPopulation(rng: Rng, size: number): Genome[] {
  const pop: Genome[] = [];
  for (let i = 0; i < size; i++) pop.push(randomGenome(rng));
  return pop;
}

/**
 * Tournament selection of size 3 — picks 3 random genomes, returns the best.
 * Good balance between selection pressure and diversity vs roulette/rank.
 */
function tournamentPick(rng: Rng, scored: ScoredGenome[]): Genome {
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
function crossover(rng: Rng, a: Genome, b: Genome): Genome {
  const child = cloneGenome(a);
  for (let i = 0; i < CHASSIS_VERTICES; i++) {
    if (rng() < 0.5) child.chassis[i] = b.chassis[i];
  }
  for (let w = 0; w < MAX_WHEELS; w++) {
    if (rng() < 0.5) child.wheelRadii[w] = b.wheelRadii[w];
    if (rng() < 0.5) child.wheelVertex[w] = b.wheelVertex[w];
    if (rng() < 0.5) child.wheelDensity[w] = b.wheelDensity[w];
    if (rng() < 0.5) child.wheelActive[w] = b.wheelActive[w];
  }
  if (rng() < 0.5) child.chassisDensity = b.chassisDensity;
  ensureValid(child);
  return child;
}

function mutateGene01(rng: Rng, value: number, size: number): number {
  // Mix between current value and a random one, scaled by mutationSize.
  // size=1 means full replace, size=0.1 means small nudge toward random.
  const target = rng();
  const v = value * (1 - size) + target * size;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function mutateGenome(rng: Rng, g: Genome, params: GAParams): Genome {
  const out = cloneGenome(g);
  const { mutationRate, mutationSize } = params;
  for (let i = 0; i < CHASSIS_VERTICES; i++) {
    if (rng() < mutationRate) out.chassis[i] = mutateGene01(rng, out.chassis[i], mutationSize);
  }
  for (let w = 0; w < MAX_WHEELS; w++) {
    if (rng() < mutationRate) out.wheelRadii[w] = mutateGene01(rng, out.wheelRadii[w], mutationSize);
    if (rng() < mutationRate) {
      // Wheel vertex is integer 0..7 — bigger mutationSize == bigger random jump
      if (rng() < mutationSize) {
        out.wheelVertex[w] = Math.floor(rng() * CHASSIS_VERTICES);
      } else {
        const delta = rng() < 0.5 ? -1 : 1;
        out.wheelVertex[w] = (out.wheelVertex[w] + delta + CHASSIS_VERTICES) % CHASSIS_VERTICES;
      }
    }
    if (rng() < mutationRate) out.wheelDensity[w] = mutateGene01(rng, out.wheelDensity[w], mutationSize);
    // Active-flip uses a softened rate — flipping a wheel on/off is a high-impact change.
    if (rng() < mutationRate * 0.5) out.wheelActive[w] = out.wheelActive[w] ? 0 : 1;
  }
  if (rng() < mutationRate) out.chassisDensity = mutateGene01(rng, out.chassisDensity, mutationSize);
  ensureValid(out);
  return out;
}

/**
 * Build the next generation:
 *   1. Sort by descending score
 *   2. Copy top `eliteCount` unchanged
 *   3. Fill the rest by tournament selection → crossover → mutation
 */
export function nextGeneration(
  rng: Rng,
  scored: ScoredGenome[],
  params: GAParams,
): Genome[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const size = sorted.length;
  const elites = Math.min(params.eliteCount, size);
  const next: Genome[] = [];
  for (let i = 0; i < elites; i++) next.push(cloneGenome(sorted[i].genome));
  while (next.length < size) {
    const a = tournamentPick(rng, sorted);
    const b = tournamentPick(rng, sorted);
    next.push(mutateGenome(rng, crossover(rng, a, b), params));
  }
  return next;
}
