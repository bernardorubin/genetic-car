// Genome3D: a fixed-shape vector of normalized [0,1] genes decoded into a 3D
// "car" — a box chassis riding on up to MAX_AXLES mirrored wheel pairs. Pure data,
// no Rapier / React dependency (mirrors the 2D sim/genome.ts conventions).
//
// Forward axis = +X (fitness). Up = +Y. Lateral = ±Z. Wheels are mirrored left/right
// per axle so the vehicle stays laterally stable — this is the "cars that look like
// cars" model: it evolves proportions, wheelbase, ride height, wheel size/count, and
// per-axle motor power, but can't grow into a tumbling free-form blob.

export const MAX_AXLES = 3; // → 2, 4, or 6 wheels

export type Rng = () => number;

export interface Genome3D {
  /** [0,1] — chassis half-length along the forward (+X) axis */
  chassisHalfL: number;
  /** [0,1] — chassis half-height (+Y) */
  chassisHalfH: number;
  /** [0,1] — chassis half-width (±Z) */
  chassisHalfW: number;
  /** [0,1] — chassis density */
  chassisDensity: number;
  /** [0,1] — extra lateral stance beyond the chassis side (wider = more stable) */
  trackExtra: number;
  /** length MAX_AXLES, 0/1 — whether this axle (a mirrored wheel pair) exists */
  axleActive: Uint8Array;
  /** length MAX_AXLES, [0,1] — longitudinal position along the chassis (0=rear .. 1=front) */
  axlePos: Float32Array;
  /** length MAX_AXLES, [0,1] — wheel radius */
  wheelRadius: Float32Array;
  /** length MAX_AXLES, [0,1] — wheel width (visual; physics uses a sphere) */
  wheelWidth: Float32Array;
  /** length MAX_AXLES, [0,1] — per-axle motor torque (only used when varyTorque is on) */
  motorTorque: Float32Array;
}

// Physical decode ranges (SI: meters, kg/m³, N·m).
export const CHASSIS_HALF_L_MIN = 0.7;
export const CHASSIS_HALF_L_MAX = 1.8;
export const CHASSIS_HALF_H_MIN = 0.18;
export const CHASSIS_HALF_H_MAX = 0.5;
export const CHASSIS_HALF_W_MIN = 0.4;
export const CHASSIS_HALF_W_MAX = 0.9;
export const CHASSIS_DENSITY_MIN = 40;
export const CHASSIS_DENSITY_MAX = 160;
export const TRACK_EXTRA_MIN = 0.05;
export const TRACK_EXTRA_MAX = 0.45;
export const WHEEL_RADIUS_MIN = 0.25;
export const WHEEL_RADIUS_MAX = 0.6;
export const WHEEL_WIDTH_MIN = 0.15;
export const WHEEL_WIDTH_MAX = 0.4;
export const MOTOR_TORQUE_MIN = 80;
export const MOTOR_TORQUE_MAX = 420;

/** Constants (not evolved). Motor speed is fixed so gains come from morphology +
 * power distribution, not evolved top-end gearing — same philosophy as the 2D sim. */
export const MOTOR_SPEED = 16; // rad/s target wheel spin (sign drives the car +X)
export const WHEEL_DENSITY = 80;
/** Gene value that decodes to a mid-range torque — used to backfill pre-existing saves. */
export const DEFAULT_TORQUE_GENE = 0.4;

/** ~60% of axle slots start active → most gen-0 cars have 2 axles (4 wheels),
 * with enough variance to discover 1-axle and 3-axle designs. */
const INITIAL_AXLE_ACTIVE_P = 0.6;

export function randomGenome3d(rng: Rng): Genome3D {
  const axleActive = new Uint8Array(MAX_AXLES);
  const axlePos = new Float32Array(MAX_AXLES);
  const wheelRadius = new Float32Array(MAX_AXLES);
  const wheelWidth = new Float32Array(MAX_AXLES);
  const motorTorque = new Float32Array(MAX_AXLES);
  for (let i = 0; i < MAX_AXLES; i++) {
    axleActive[i] = rng() < INITIAL_AXLE_ACTIVE_P ? 1 : 0;
    axlePos[i] = rng();
    wheelRadius[i] = rng();
    wheelWidth[i] = rng();
    motorTorque[i] = rng();
  }
  const g: Genome3D = {
    chassisHalfL: rng(),
    chassisHalfH: rng(),
    chassisHalfW: rng(),
    chassisDensity: rng(),
    trackExtra: rng(),
    axleActive,
    axlePos,
    wheelRadius,
    wheelWidth,
    motorTorque,
  };
  ensureValid3d(g);
  return g;
}

/** Guarantee at least one active axle — a wheelless car can never move. Bias the
 * fallback toward the rear+front so a single-axle car is at least centered-ish. */
export function ensureValid3d(g: Genome3D): void {
  for (let i = 0; i < MAX_AXLES; i++) if (g.axleActive[i]) return;
  g.axleActive[0] = 1;
  g.axleActive[MAX_AXLES - 1] = 1;
}

export function activeAxleCount(g: Genome3D): number {
  let n = 0;
  for (let i = 0; i < MAX_AXLES; i++) if (g.axleActive[i]) n++;
  return n;
}

const lerp = (min: number, max: number, g: number) => min + g * (max - min);

export const decodeHalfL = (g: number) => lerp(CHASSIS_HALF_L_MIN, CHASSIS_HALF_L_MAX, g);
export const decodeHalfH = (g: number) => lerp(CHASSIS_HALF_H_MIN, CHASSIS_HALF_H_MAX, g);
export const decodeHalfW = (g: number) => lerp(CHASSIS_HALF_W_MIN, CHASSIS_HALF_W_MAX, g);
export const decodeChassisDensity3d = (g: number) =>
  lerp(CHASSIS_DENSITY_MIN, CHASSIS_DENSITY_MAX, g);
export const decodeTrackExtra = (g: number) => lerp(TRACK_EXTRA_MIN, TRACK_EXTRA_MAX, g);
export const decodeWheelRadius3d = (g: number) => lerp(WHEEL_RADIUS_MIN, WHEEL_RADIUS_MAX, g);
export const decodeWheelWidth = (g: number) => lerp(WHEEL_WIDTH_MIN, WHEEL_WIDTH_MAX, g);
export const decodeMotorTorque3d = (g: number) => lerp(MOTOR_TORQUE_MIN, MOTOR_TORQUE_MAX, g);
/** Longitudinal wheel offset from chassis center, in meters, given the axle's half-length. */
export const decodeAxleOffset = (g: number, halfL: number) => (g * 2 - 1) * halfL * 0.82;

export function cloneGenome3d(g: Genome3D): Genome3D {
  return {
    chassisHalfL: g.chassisHalfL,
    chassisHalfH: g.chassisHalfH,
    chassisHalfW: g.chassisHalfW,
    chassisDensity: g.chassisDensity,
    trackExtra: g.trackExtra,
    axleActive: new Uint8Array(g.axleActive),
    axlePos: new Float32Array(g.axlePos),
    wheelRadius: new Float32Array(g.wheelRadius),
    wheelWidth: new Float32Array(g.wheelWidth),
    motorTorque: new Float32Array(g.motorTorque),
  };
}
