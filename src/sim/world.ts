import { World as PlanckWorld, Vec2, Edge, type World as PlanckWorldType } from 'planck';
import { generateTerrain, type Terrain, type TerrainOptions } from './terrain';
import { buildCar, type Car } from './car';
import { randomGenome, type Genome, type Rng } from './genome';

const STEP = 1 / 60;
const VEL_ITERATIONS = 8;
const POS_ITERATIONS = 3;
const STALL_TICK_LIMIT = 180; // 3 seconds with no forward progress = dead
const STALL_MIN_GAIN = 0.05; // meters
const SPAWN_X = 2;
const SPAWN_Y = 5;

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export class SimWorld {
  private world: PlanckWorldType;
  private terrain: Terrain;
  cars: Car[] = [];
  camera: CameraState = { x: 0, y: 0, zoom: 28 };
  /** wall-clock simulation ticks since reset */
  ticks = 0;

  constructor(rng: Rng, gravity: number, terrainOpts: TerrainOptions, genomes?: Genome[]) {
    this.world = new PlanckWorld(new Vec2(0, -gravity));
    this.terrain = generateTerrain(rng, terrainOpts);
    this.buildTerrainBodies();
    const seeds = genomes ?? [randomGenome(rng)];
    for (const g of seeds) {
      this.cars.push(buildCar(this.world, g, SPAWN_X, SPAWN_Y));
    }
    if (this.cars.length > 0) {
      this.camera.x = this.cars[0].chassis.getPosition().x;
      this.camera.y = this.cars[0].chassis.getPosition().y;
    }
  }

  private buildTerrainBodies(): void {
    const ground = this.world.createBody({ type: 'static' });
    const pts = this.terrain.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      ground.createFixture({
        shape: new Edge(new Vec2(a.x, a.y), new Vec2(b.x, b.y)),
        friction: 0.9,
      });
    }
  }

  step(): void {
    this.world.step(STEP, VEL_ITERATIONS, POS_ITERATIONS);
    this.ticks++;
    // Update fitness + stall detection per car
    for (const car of this.cars) {
      if (!car.alive) continue;
      const x = car.chassis.getPosition().x;
      // Physics blow-up guard: if a body's position goes non-finite or beyond a
      // sane traversal limit, kill the car so it can't poison stats or stall the gen.
      if (!Number.isFinite(x) || x > 100000) {
        car.alive = false;
        continue;
      }
      if (x > car.maxX + STALL_MIN_GAIN) {
        car.maxX = x;
        car.stallTicks = 0;
      } else {
        car.stallTicks++;
        if (car.stallTicks > STALL_TICK_LIMIT) car.alive = false;
      }
    }
    // Follow the leading alive car (or last leader if all dead)
    const leader = this.leader();
    if (leader) {
      const p = leader.chassis.getPosition();
      this.camera.x += (p.x - this.camera.x) * 0.1;
      this.camera.y += (p.y - this.camera.y) * 0.1;
    }
  }

  leader(): Car | null {
    let best: Car | null = null;
    for (const c of this.cars) {
      if (best === null || c.maxX > best.maxX) best = c;
    }
    return best;
  }

  aliveCount(): number {
    let n = 0;
    for (const c of this.cars) if (c.alive) n++;
    return n;
  }

  getTerrain(): Terrain {
    return this.terrain;
  }

  getWorld(): PlanckWorldType {
    return this.world;
  }
}
