import RAPIER from '@dimforge/rapier3d-compat';
import {
  generateTerrain3d,
  sampleHeight3d,
  terrainMeshData,
  type Terrain3D,
  type Terrain3DOptions,
} from './terrain3d';
import { TERRAIN_GROUPS, buildCar3d, type Car3D } from './car3d';
import {
  MAX_AXLES,
  decodeHalfH,
  decodeWheelRadius3d,
  randomGenome3d,
  type Genome3D,
  type Rng,
} from './genome3d';

const STEP_DT = 1 / 60;
const STALL_TICK_LIMIT = 180; // 3 s of no forward progress = dead
const STALL_MIN_GAIN = 0.05; // meters
const SPAWN_X = 6;
const SPAWN_DROP = 0.4; // gap above the ground at spawn
const BLOWUP_LIMIT = 100000;

export interface CameraTarget {
  x: number;
  y: number;
  z: number;
}

/** Owns a Rapier world for one generation: builds terrain + cars, steps physics,
 * tracks per-car forward progress + stall/blow-up death, and exposes a follow target.
 * Mirrors the 2D sim/world.ts structure. No React. */
export class SimWorld3D {
  private world: RAPIER.World;
  private terrain: Terrain3D;
  cars: Car3D[] = [];
  ticks = 0;
  camera: CameraTarget = { x: SPAWN_X, y: 2, z: 0 };

  constructor(
    rng: Rng,
    gravity: number,
    terrainOpts: Terrain3DOptions,
    genomes?: Genome3D[],
    varyTorque = true,
  ) {
    this.world = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
    this.world.timestep = STEP_DT;
    this.terrain = generateTerrain3d(rng, terrainOpts);
    this.buildTerrainBody();

    const seeds = genomes ?? [randomGenome3d(rng)];
    const groundH = sampleHeight3d(this.terrain, SPAWN_X);
    for (const g of seeds) {
      const halfH = decodeHalfH(g.chassisHalfH);
      let maxR = 0;
      for (let i = 0; i < MAX_AXLES; i++) {
        if (g.axleActive[i]) maxR = Math.max(maxR, decodeWheelRadius3d(g.wheelRadius[i]));
      }
      const spawnY = groundH + halfH + maxR + SPAWN_DROP;
      this.cars.push(buildCar3d(this.world, g, SPAWN_X, spawnY, varyTorque));
    }
    if (this.cars.length > 0) {
      const p = this.cars[0].chassis.translation();
      this.camera = { x: p.x, y: p.y, z: p.z };
    }
  }

  private buildTerrainBody(): void {
    // Trimesh built from the same vertices the renderer draws (absolute world coords),
    // so the physics floor is exactly the visible floor.
    const { vertices, indices } = terrainMeshData(this.terrain);
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(vertices, indices)
        .setFriction(0.95)
        .setCollisionGroups(TERRAIN_GROUPS),
      ground,
    );
  }

  step(): void {
    this.world.step();
    this.ticks++;
    for (const car of this.cars) {
      if (!car.alive) continue;
      const p = car.chassis.translation();
      // Blow-up guard: non-finite or absurd position → kill (don't poison stats).
      if (!Number.isFinite(p.x) || Math.abs(p.x) > BLOWUP_LIMIT || !Number.isFinite(p.y)) {
        car.alive = false;
        continue;
      }
      if (p.x > car.maxX + STALL_MIN_GAIN) {
        car.maxX = p.x;
        car.stallTicks = 0;
      } else {
        car.stallTicks++;
        if (car.stallTicks > STALL_TICK_LIMIT) car.alive = false;
      }
    }
    const leader = this.leader();
    if (leader) {
      const p = leader.chassis.translation();
      this.camera.x += (p.x - this.camera.x) * 0.08;
      this.camera.y += (p.y - this.camera.y) * 0.08;
      this.camera.z += (p.z - this.camera.z) * 0.08;
    }
  }

  leader(): Car3D | null {
    let best: Car3D | null = null;
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

  getTerrain(): Terrain3D {
    return this.terrain;
  }

  /** Release the Rapier WASM memory backing this world. Must be called before
   * dropping the reference — we build a fresh world every generation, so without
   * this the WASM heap grows unbounded over a long evolution run. */
  dispose(): void {
    this.world.free();
  }
}
