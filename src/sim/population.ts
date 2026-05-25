import seedrandom from 'seedrandom';
import { SimWorld } from './world';
import {
  cloneGenome,
  nextGeneration,
  randomPopulation,
  type GAParams,
  type ScoredGenome,
} from './ga';
import type { Genome, Rng } from './genome';

export interface PopulationOptions {
  size: number;
  seed: string;
  gravity: number;
  mutableFloor: boolean;
  roughness: number;
  maxSlope: number;
  ga: GAParams;
}

export interface GenerationStat {
  index: number;
  best: number;
  top10Avg: number;
  avg: number;
}

const HARD_TICK_LIMIT = 60 * 30; // 30 simulated seconds per generation

export class Population {
  opts: PopulationOptions;
  generation = 0;
  history: GenerationStat[] = [];

  /** RNG used for GA decisions (seeded by opts.seed + ":ga"). */
  private gaRng: Rng;
  /** RNG used for world generation (re-seeded each generation by opts.seed + ":world:<gen>" if mutable). */
  private worldRng: Rng;
  private genomes: Genome[];
  private terrainSeed: string;

  sim: SimWorld;

  bestGenome: Genome | null = null;
  bestScore = 0;
  /** When true, sim runs the best-ever genome alone and does NOT advance generations. */
  replayMode = false;
  private savedGenomesBeforeReplay: Genome[] | null = null;

  constructor(opts: PopulationOptions) {
    this.opts = opts;
    this.gaRng = seedrandom(opts.seed + ':ga');
    this.terrainSeed = opts.seed + ':terrain';
    this.worldRng = seedrandom(this.terrainSeed);
    this.genomes = randomPopulation(this.gaRng, opts.size);
    this.sim = this.makeSim(this.genomes);
  }

  private terrainOpts() {
    return { roughness: this.opts.roughness, maxSlope: this.opts.maxSlope };
  }

  private makeSim(genomes: Genome[], rng: Rng = this.worldRng): SimWorld {
    return new SimWorld(rng, this.opts.gravity, this.terrainOpts(), genomes);
  }

  /** Run a single simulation tick. Returns true when a new generation just started. */
  step(): boolean {
    this.sim.step();
    if (this.replayMode) return false;
    if (this.sim.aliveCount() === 0 || this.sim.ticks > HARD_TICK_LIMIT) {
      this.advanceGeneration();
      return true;
    }
    return false;
  }

  private advanceGeneration(): void {
    const scored: ScoredGenome[] = this.sim.cars.map((c, i) => ({
      genome: this.genomes[i],
      score: c.maxX - c.startX,
    }));
    const sortedByScore = [...scored].sort((a, b) => b.score - a.score);
    const best = sortedByScore[0]?.score ?? 0;
    const top10 = sortedByScore.slice(0, Math.min(10, sortedByScore.length));
    const top10Avg = top10.reduce((a, b) => a + b.score, 0) / Math.max(1, top10.length);
    const avg = sortedByScore.reduce((a, b) => a + b.score, 0) / Math.max(1, sortedByScore.length);
    this.history.push({ index: this.generation, best, top10Avg, avg });

    if (best > this.bestScore && sortedByScore[0]) {
      this.bestScore = best;
      this.bestGenome = cloneGenome(sortedByScore[0].genome);
    }

    this.genomes = nextGeneration(this.gaRng, scored, this.opts.ga);
    this.generation++;

    // Re-seed terrain only if the floor is set to mutate per generation
    if (this.opts.mutableFloor) {
      this.terrainSeed = this.opts.seed + ':terrain:' + this.generation;
    }
    this.worldRng = seedrandom(this.terrainSeed);
    this.sim = this.makeSim(this.genomes);
  }

  /** Snapshot of live per-generation stats (in progress) for the HUD. */
  liveStats() {
    let best = 0;
    let sum = 0;
    for (const car of this.sim.cars) {
      const d = car.maxX - car.startX;
      if (d > best) best = d;
      sum += d;
    }
    const avg = this.sim.cars.length ? sum / this.sim.cars.length : 0;
    return {
      generation: this.generation,
      alive: this.sim.aliveCount(),
      total: this.sim.cars.length,
      best,
      avg,
    };
  }

  /** Mutate live GA params without resetting (e.g. user drags a slider). */
  updateGAParams(params: Partial<GAParams>): void {
    this.opts.ga = { ...this.opts.ga, ...params };
  }

  /** Wipe genomes, rebuild fresh population on the same terrain. */
  resetPopulation(): void {
    this.gaRng = seedrandom(this.opts.seed + ':ga:' + Date.now());
    this.genomes = randomPopulation(this.gaRng, this.opts.size);
    this.generation = 0;
    this.history = [];
    this.bestGenome = null;
    this.bestScore = 0;
    this.replayMode = false;
    this.savedGenomesBeforeReplay = null;
    this.worldRng = seedrandom(this.terrainSeed);
    this.sim = this.makeSim(this.genomes);
  }

  enterReplay(): void {
    if (!this.bestGenome || this.replayMode) return;
    this.savedGenomesBeforeReplay = this.genomes;
    this.replayMode = true;
    this.sim = this.makeSim([cloneGenome(this.bestGenome)], seedrandom(this.terrainSeed));
  }

  exitReplay(): void {
    if (!this.replayMode || !this.savedGenomesBeforeReplay) return;
    this.replayMode = false;
    this.genomes = this.savedGenomesBeforeReplay;
    this.savedGenomesBeforeReplay = null;
    this.sim = this.makeSim(this.genomes, seedrandom(this.terrainSeed));
  }

  snapshot() {
    return {
      generation: this.generation,
      seed: this.opts.seed,
      gravity: this.opts.gravity,
      genomes: this.genomes.map(cloneGenome),
      history: this.history,
    };
  }

  /** Reload from saved genomes — keeps the current terrain. */
  loadGenomes(genomes: Genome[], generation: number, history: GenerationStat[]): void {
    this.genomes = genomes.map(cloneGenome);
    this.generation = generation;
    this.history = [...history];
    this.replayMode = false;
    this.savedGenomesBeforeReplay = null;
    this.sim = this.makeSim(this.genomes, seedrandom(this.terrainSeed));
  }
}
