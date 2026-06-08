import seedrandom from 'seedrandom';
import { SimWorld3D } from './world3d';
import {
  nextGeneration3d,
  randomPopulation3d,
  type GA3DParams,
  type ScoredGenome3D,
} from './ga3d';
import { cloneGenome3d, type Genome3D, type Rng } from './genome3d';

export interface Population3DOptions {
  size: number;
  seed: string;
  gravity: number;
  mutableFloor: boolean;
  roughness: number;
  maxSlope: number;
  maxGenSeconds: number | null;
  varyTorque: boolean;
  ga: GA3DParams;
}

export interface GenerationStat3D {
  index: number;
  best: number;
  top10Avg: number;
  avg: number;
}

const TICKS_PER_SEC = 60;

/** Per-generation lifecycle for the 3D sim. Mirrors the 2D sim/population.ts. */
export class Population3D {
  opts: Population3DOptions;
  generation = 0;
  history: GenerationStat3D[] = [];

  private gaRng: Rng;
  private worldRng: Rng;
  private genomes: Genome3D[];
  private terrainSeed: string;

  sim: SimWorld3D;

  bestGenome: Genome3D | null = null;
  bestScore = 0;
  favoriteGenome: Genome3D | null = null;
  replayMode = false;
  private savedGenomesBeforeReplay: Genome3D[] | null = null;

  constructor(opts: Population3DOptions) {
    this.opts = opts;
    this.gaRng = seedrandom(opts.seed + ':ga');
    this.terrainSeed = opts.seed + ':terrain';
    this.worldRng = seedrandom(this.terrainSeed);
    this.genomes = randomPopulation3d(this.gaRng, opts.size);
    this.sim = this.makeSim(this.genomes);
  }

  private terrainOpts() {
    return { roughness: this.opts.roughness, maxSlope: this.opts.maxSlope };
  }

  private makeSim(genomes: Genome3D[], rng: Rng = this.worldRng): SimWorld3D {
    return new SimWorld3D(rng, this.opts.gravity, this.terrainOpts(), genomes, this.opts.varyTorque);
  }

  /** Free the outgoing world's WASM memory, then swap in the next one. */
  private swapSim(next: SimWorld3D): void {
    this.sim.dispose();
    this.sim = next;
  }

  /** One tick. Returns true when a new generation just started. */
  step(): boolean {
    this.sim.step();
    if (this.replayMode) return false;
    const timedOut =
      this.opts.maxGenSeconds !== null &&
      this.sim.ticks > this.opts.maxGenSeconds * TICKS_PER_SEC;
    if (this.sim.aliveCount() === 0 || timedOut) {
      this.advanceGeneration();
      return true;
    }
    return false;
  }

  private advanceGeneration(): void {
    const scored: ScoredGenome3D[] = this.sim.cars.map((c, i) => ({
      genome: this.genomes[i],
      score: c.maxX - c.startX,
    }));
    for (const s of scored) {
      if (!Number.isFinite(s.score) || s.score < 0 || s.score > 1e6) s.score = 0;
    }
    const sortedByScore = [...scored].sort((a, b) => b.score - a.score);
    const best = sortedByScore[0]?.score ?? 0;
    const top10 = sortedByScore.slice(0, Math.min(10, sortedByScore.length));
    const top10Avg = top10.reduce((a, b) => a + b.score, 0) / Math.max(1, top10.length);
    const avg = sortedByScore.reduce((a, b) => a + b.score, 0) / Math.max(1, sortedByScore.length);
    this.history.push({ index: this.generation, best, top10Avg, avg });

    if (best > this.bestScore && sortedByScore[0]) {
      this.bestScore = best;
      this.bestGenome = cloneGenome3d(sortedByScore[0].genome);
    }

    this.genomes = nextGeneration3d(this.gaRng, scored, this.opts.ga, this.favoriteGenome);
    this.generation++;

    if (this.opts.mutableFloor) {
      this.terrainSeed = this.opts.seed + ':terrain:' + this.generation;
    }
    this.worldRng = seedrandom(this.terrainSeed);
    this.swapSim(this.makeSim(this.genomes));
  }

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

  updateGAParams(params: Partial<GA3DParams>): void {
    this.opts.ga = { ...this.opts.ga, ...params };
  }

  applyVaryTorque(varyTorque: boolean): void {
    if (this.opts.varyTorque === varyTorque) return;
    this.opts.varyTorque = varyTorque;
    if (this.replayMode) return;
    this.swapSim(this.makeSim(this.genomes, seedrandom(this.terrainSeed)));
  }

  resetPopulation(): void {
    this.gaRng = seedrandom(this.opts.seed + ':ga:' + this.generation + ':' + this.bestScore);
    this.genomes = randomPopulation3d(this.gaRng, this.opts.size);
    this.generation = 0;
    this.history = [];
    this.bestGenome = null;
    this.bestScore = 0;
    this.replayMode = false;
    this.savedGenomesBeforeReplay = null;
    this.worldRng = seedrandom(this.terrainSeed);
    this.swapSim(this.makeSim(this.genomes));
  }

  enterReplay(): void {
    if (!this.bestGenome || this.replayMode) return;
    this.savedGenomesBeforeReplay = this.genomes;
    this.replayMode = true;
    this.swapSim(this.makeSim([cloneGenome3d(this.bestGenome)], seedrandom(this.terrainSeed)));
  }

  exitReplay(): void {
    if (!this.replayMode || !this.savedGenomesBeforeReplay) return;
    this.replayMode = false;
    this.genomes = this.savedGenomesBeforeReplay;
    this.savedGenomesBeforeReplay = null;
    this.swapSim(this.makeSim(this.genomes, seedrandom(this.terrainSeed)));
  }

  topLive(k = 5): { genome: Genome3D; score: number; carIndex: number }[] {
    const out: { genome: Genome3D; score: number; carIndex: number }[] = [];
    const cars = this.sim.cars;
    for (let i = 0; i < cars.length; i++) {
      out.push({ genome: this.genomes[i], score: cars[i].maxX - cars[i].startX, carIndex: i });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, k);
  }

  setFavoriteByIndex(carIndex: number): void {
    const g = this.genomes[carIndex];
    if (g) this.favoriteGenome = cloneGenome3d(g);
  }

  clearFavorite(): void {
    this.favoriteGenome = null;
  }

  snapshot() {
    return {
      generation: this.generation,
      seed: this.opts.seed,
      gravity: this.opts.gravity,
      mutableFloor: this.opts.mutableFloor,
      roughness: this.opts.roughness,
      maxSlope: this.opts.maxSlope,
      maxGenSeconds: this.opts.maxGenSeconds,
      varyTorque: this.opts.varyTorque,
      bestScore: this.bestScore,
      bestGenome: this.bestGenome ? cloneGenome3d(this.bestGenome) : null,
      genomes: this.genomes.map(cloneGenome3d),
      history: this.history,
    };
  }

  loadGenomes(
    genomes: Genome3D[],
    generation: number,
    history: GenerationStat3D[],
    bestScore = 0,
    bestGenome: Genome3D | null = null,
  ): void {
    this.genomes = genomes.map(cloneGenome3d);
    this.generation = generation;
    this.history = [...history];
    this.bestScore =
      Number.isFinite(bestScore) && bestScore >= 0 && bestScore < 1e6 ? bestScore : 0;
    this.bestGenome = bestGenome ? cloneGenome3d(bestGenome) : null;
    this.replayMode = false;
    this.savedGenomesBeforeReplay = null;
    this.swapSim(this.makeSim(this.genomes, seedrandom(this.terrainSeed)));
  }
}
