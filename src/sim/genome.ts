// Genome: a fixed-shape vector of normalized [0,1] floats decoded into
// physical car properties. Pure data — no planck dependency.

export const CHASSIS_VERTICES = 8;
export const MAX_WHEELS = 4;

export type Rng = () => number;

export interface Genome {
  /** length 8, each in [0,1] — radius from car center at angle i*(2π/8) */
  chassis: Float32Array;
  /** length MAX_WHEELS, in [0,1] — wheel radius */
  wheelRadii: Float32Array;
  /** length MAX_WHEELS, in [0..CHASSIS_VERTICES) — chassis vertex each wheel attaches to */
  wheelVertex: Uint8Array;
  /** length MAX_WHEELS, in [0,1] — wheel density */
  wheelDensity: Float32Array;
  /** length MAX_WHEELS, 0/1 — whether this wheel slot is realized */
  wheelActive: Uint8Array;
  /** length MAX_WHEELS, in [0,1] — strut/leg length sticking out from the chassis vertex */
  wheelArm: Float32Array;
  /** length MAX_WHEELS, in [0,1] — suspension spring stiffness */
  wheelSpring: Float32Array;
  /** length MAX_WHEELS, in [0,1] — suspension damping ratio */
  wheelDamping: Float32Array;
  /** length MAX_WHEELS, in [0,1] — per-wheel motor torque (only used when varyTorque is on) */
  wheelTorque: Float32Array;
  /** in [0,1] — chassis density */
  chassisDensity: number;
}

// Physical decode ranges.
// Wide chassis range (0.1..2.2m, ~22× ratio) lets the GA evolve dramatic
// asymmetric shapes — long spikes next to deep concavities — instead of
// converging on rounded hexagons. Wheels also have a wide range so the GA
// can pick small caster-style wheels OR big monster-truck-style wheels.
export const CHASSIS_RADIUS_MIN = 0.1;
export const CHASSIS_RADIUS_MAX = 2.2;
export const WHEEL_RADIUS_MIN = 0.15;
export const WHEEL_RADIUS_MAX = 0.85;
export const CHASSIS_DENSITY_MIN = 30;
export const CHASSIS_DENSITY_MAX = 300;
export const WHEEL_DENSITY_MIN = 40;
export const WHEEL_DENSITY_MAX = 120;

// Arm/strut sticking out from a chassis vertex.
// < ARM_RENDER_MIN = no arm (wheel attached directly to vertex).
export const ARM_MIN = 0.0;
export const ARM_MAX = 1.0;       // meters
export const ARM_RENDER_MIN = 0.12;

// Suspension parameters for the WheelJoint.
export const SPRING_HZ_MIN = 2;
export const SPRING_HZ_MAX = 10;
export const DAMPING_MIN = 0.25;
export const DAMPING_MAX = 0.85;

// Per-wheel motor torque (N·m). Only consulted when the `varyTorque` toggle is on;
// otherwise every wheel runs the uniform legacy constant (150, see car.ts MOTOR_TORQUE).
// The legacy 150 sits exactly at gene value 0.45 — used to backfill pre-torque saves.
export const MOTOR_TORQUE_MIN = 60;
export const MOTOR_TORQUE_MAX = 260;
export const DEFAULT_TORQUE_GENE = 0.45;

/** Probability a fresh wheel slot starts active. ~50% biases toward 2-wheelers
 * at gen 0 with enough variance for 1/3/4-wheeler discovery. */
const INITIAL_WHEEL_ACTIVE_P = 0.5;

/**
 * Bimodal initial distribution for chassis radii — each vertex tends to be
 * either short or long, never medium. Produces visibly spiky gen-0 cars that
 * resemble the BoxCar2D originals rather than smooth blobs. With a uniform
 * distribution the average vertex sits at the middle of the range and shapes
 * look interchangeable.
 */
function bimodalSample(rng: Rng): number {
  const pickLong = rng() < 0.5;
  const tail = rng() * 0.35; // 0..0.35
  return pickLong ? 0.65 + tail : tail; // either [0, 0.35] or [0.65, 1.0]
}

export function randomGenome(rng: Rng): Genome {
  const chassis = new Float32Array(CHASSIS_VERTICES);
  for (let i = 0; i < CHASSIS_VERTICES; i++) chassis[i] = bimodalSample(rng);
  const wheelRadii = new Float32Array(MAX_WHEELS);
  const wheelVertex = new Uint8Array(MAX_WHEELS);
  const wheelDensity = new Float32Array(MAX_WHEELS);
  const wheelActive = new Uint8Array(MAX_WHEELS);
  const wheelArm = new Float32Array(MAX_WHEELS);
  const wheelSpring = new Float32Array(MAX_WHEELS);
  const wheelDamping = new Float32Array(MAX_WHEELS);
  const wheelTorque = new Float32Array(MAX_WHEELS);
  for (let i = 0; i < MAX_WHEELS; i++) {
    // Wheels also bimodal so gen-0 has cars with very small AND very big wheels.
    wheelRadii[i] = bimodalSample(rng);
    wheelVertex[i] = Math.floor(rng() * CHASSIS_VERTICES);
    wheelDensity[i] = rng();
    wheelActive[i] = rng() < INITIAL_WHEEL_ACTIVE_P ? 1 : 0;
    // Wider initial arm range so some gen-0 cars have visible long legs.
    wheelArm[i] = rng() * 0.7;
    wheelSpring[i] = rng();
    wheelDamping[i] = rng();
    wheelTorque[i] = rng();
  }
  const g: Genome = {
    chassis,
    wheelRadii,
    wheelVertex,
    wheelDensity,
    wheelActive,
    wheelArm,
    wheelSpring,
    wheelDamping,
    wheelTorque,
    chassisDensity: rng(),
  };
  ensureValid(g);
  return g;
}

/** Guarantee at least one active wheel — a 0-wheeled car can never move. */
export function ensureValid(g: Genome): void {
  for (let i = 0; i < MAX_WHEELS; i++) {
    if (g.wheelActive[i]) return;
  }
  g.wheelActive[0] = 1;
}

export function activeWheelCount(g: Genome): number {
  let n = 0;
  for (let i = 0; i < MAX_WHEELS; i++) if (g.wheelActive[i]) n++;
  return n;
}

export function decodeChassisRadius(g: number): number {
  return CHASSIS_RADIUS_MIN + g * (CHASSIS_RADIUS_MAX - CHASSIS_RADIUS_MIN);
}
export function decodeWheelRadius(g: number): number {
  return WHEEL_RADIUS_MIN + g * (WHEEL_RADIUS_MAX - WHEEL_RADIUS_MIN);
}
export function decodeChassisDensity(g: number): number {
  return CHASSIS_DENSITY_MIN + g * (CHASSIS_DENSITY_MAX - CHASSIS_DENSITY_MIN);
}
export function decodeWheelDensity(g: number): number {
  return WHEEL_DENSITY_MIN + g * (WHEEL_DENSITY_MAX - WHEEL_DENSITY_MIN);
}
export function decodeArmLength(g: number): number {
  return ARM_MIN + g * (ARM_MAX - ARM_MIN);
}
export function decodeSpringHz(g: number): number {
  return SPRING_HZ_MIN + g * (SPRING_HZ_MAX - SPRING_HZ_MIN);
}
export function decodeDamping(g: number): number {
  return DAMPING_MIN + g * (DAMPING_MAX - DAMPING_MIN);
}
export function decodeMotorTorque(g: number): number {
  return MOTOR_TORQUE_MIN + g * (MOTOR_TORQUE_MAX - MOTOR_TORQUE_MIN);
}

export function chassisVertexAngle(i: number): number {
  return (i / CHASSIS_VERTICES) * Math.PI * 2;
}
