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
  /** length MAX_AXLES, [0,1] — per-axle strut/leg length: how far the wheel sits below
   * the chassis (lifts the body up on legs). Decoded amount scales with bodyVariety. */
  strutLen: Float32Array;
  /** [0,1] — gate for a second welded body box (cabin/pod). Only appears above a
   * bodyVariety threshold, so low-variety cars stay single-box. */
  seg2Present: number;
  /** [0,1] — second-segment half-length / -height / -width */
  seg2HalfL: number;
  seg2HalfH: number;
  seg2HalfW: number;
  /** [0,1] — second-segment longitudinal offset (decoded -1..1 × chassis half-length) */
  seg2OffX: number;
  /** [0,1] — second-segment vertical seating (embedded ↔ stacked on top) */
  seg2OffY: number;
  /** [0,1] — per-car color hue (decoded 0..360°). Always active so cars are distinct. */
  hue: number;
}

// Physical decode ranges (SI: meters, kg/m³, N·m).
//
// Morphology ranges have two bounds plus a "uniform" anchor. The bodyVariety knob
// (a setting, not a gene) lerps each gene's effective band from {anchor..anchor}
// (variety 0 → every car is the same tame box) out to {MIN..MAX} (variety 1 → the
// full wild span). See decodeVaried. Anchors ≈ the pre-upgrade midpoints so variety 0
// reproduces the original look.
export const CHASSIS_HALF_L_MIN = 0.6;
export const CHASSIS_HALF_L_MAX = 2.4; // long limos / trucks
export const CHASSIS_HALF_L_UNIFORM = 1.1;
export const CHASSIS_HALF_H_MIN = 0.14;
export const CHASSIS_HALF_H_MAX = 1.2; // tall towers ↔ squat buggies (half → up to 2.4m tall)
export const CHASSIS_HALF_H_UNIFORM = 0.3;
export const CHASSIS_HALF_W_MIN = 0.35;
export const CHASSIS_HALF_W_MAX = 1.0;
export const CHASSIS_HALF_W_UNIFORM = 0.6;
export const CHASSIS_DENSITY_MIN = 40;
export const CHASSIS_DENSITY_MAX = 160;
export const TRACK_EXTRA_MIN = 0.05;
export const TRACK_EXTRA_MAX = 0.45;
export const WHEEL_RADIUS_MIN = 0.22;
export const WHEEL_RADIUS_MAX = 0.85;
export const WHEEL_RADIUS_UNIFORM = 0.4;
export const WHEEL_WIDTH_MIN = 0.15;
export const WHEEL_WIDTH_MAX = 0.4;
export const MOTOR_TORQUE_MIN = 80;
export const MOTOR_TORQUE_MAX = 420;

// Second body segment (welded cabin/pod).
export const SEG2_HALF_L_MIN = 0.3;
export const SEG2_HALF_L_MAX = 1.2;
export const SEG2_HALF_H_MIN = 0.2;
export const SEG2_HALF_H_MAX = 0.9;
export const SEG2_HALF_W_MIN = 0.3;
export const SEG2_HALF_W_MAX = 0.95;
/** Pods only appear above this bodyVariety, and only when seg2Present clears the gate. */
export const SEG2_VARIETY_GATE = 0.25;
export const SEG2_PRESENCE_THRESHOLD = 0.5;

/** Max leg length (m) the wheel can drop below the chassis, at full bodyVariety. */
export const STRUT_LEN_MAX = 0.9;

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
  const strutLen = new Float32Array(MAX_AXLES);
  for (let i = 0; i < MAX_AXLES; i++) {
    axleActive[i] = rng() < INITIAL_AXLE_ACTIVE_P ? 1 : 0;
    axlePos[i] = rng();
    wheelRadius[i] = rng();
    wheelWidth[i] = rng();
    motorTorque[i] = rng();
    strutLen[i] = rng();
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
    strutLen,
    seg2Present: rng(),
    seg2HalfL: rng(),
    seg2HalfH: rng(),
    seg2HalfW: rng(),
    seg2OffX: rng(),
    seg2OffY: rng(),
    hue: rng(),
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
const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

/** Map a [0,1] gene through a variety-scaled band: at variety 0 the band collapses to
 * `uniform` (tame, identical look); at variety 1 it spans the full [wildMin, wildMax].
 * No RNG → fully deterministic, so the same genome decodes identically for a given knob. */
function decodeVaried(
  gene: number,
  uniform: number,
  wildMin: number,
  wildMax: number,
  variety: number,
): number {
  const min = uniform + (wildMin - uniform) * variety;
  const max = uniform + (wildMax - uniform) * variety;
  return lerp(min, max, gene);
}

export const decodeHalfL = (g: number, variety = 0) =>
  decodeVaried(g, CHASSIS_HALF_L_UNIFORM, CHASSIS_HALF_L_MIN, CHASSIS_HALF_L_MAX, variety);
export const decodeHalfH = (g: number, variety = 0) =>
  decodeVaried(g, CHASSIS_HALF_H_UNIFORM, CHASSIS_HALF_H_MIN, CHASSIS_HALF_H_MAX, variety);
export const decodeHalfW = (g: number, variety = 0) =>
  decodeVaried(g, CHASSIS_HALF_W_UNIFORM, CHASSIS_HALF_W_MIN, CHASSIS_HALF_W_MAX, variety);
export const decodeChassisDensity3d = (g: number) =>
  lerp(CHASSIS_DENSITY_MIN, CHASSIS_DENSITY_MAX, g);
export const decodeTrackExtra = (g: number) => lerp(TRACK_EXTRA_MIN, TRACK_EXTRA_MAX, g);

/** Wheel radius: axle 0's gene sets the car's base size (variety-scaled); each axle then
 * deviates from that base by ±spread, so `wheelSizeSpread` controls cross-axle variety
 * (monster-truck-front / tiny-rear). spread 0 → all wheels equal the base. */
export const decodeWheelRadius3d = (g: number, variety = 0, spread = 0, baseGene = g) => {
  const base = decodeVaried(baseGene, WHEEL_RADIUS_UNIFORM, WHEEL_RADIUS_MIN, WHEEL_RADIUS_MAX, variety);
  const dev = (g - 0.5) * spread * (WHEEL_RADIUS_MAX - WHEEL_RADIUS_MIN);
  return clamp(base + dev, WHEEL_RADIUS_MIN, WHEEL_RADIUS_MAX);
};
export const decodeWheelWidth = (g: number) => lerp(WHEEL_WIDTH_MIN, WHEEL_WIDTH_MAX, g);
export const decodeMotorTorque3d = (g: number) => lerp(MOTOR_TORQUE_MIN, MOTOR_TORQUE_MAX, g);
/** Longitudinal wheel offset from chassis center, in meters, given the axle's half-length. */
export const decodeAxleOffset = (g: number, halfL: number) => (g * 2 - 1) * halfL * 0.82;

/** Per-axle leg length (m). Scales with variety so variety 0 keeps wheels tucked under. */
export const decodeStrutLen = (g: number, variety = 0) => g * STRUT_LEN_MAX * variety;

/** Whether the welded second body box exists for this genome at the given variety. */
export const seg2Active = (g: Genome3D, variety: number) =>
  variety > SEG2_VARIETY_GATE && g.seg2Present > SEG2_PRESENCE_THRESHOLD;
export const decodeSeg2HalfL = (g: number) => lerp(SEG2_HALF_L_MIN, SEG2_HALF_L_MAX, g);
export const decodeSeg2HalfH = (g: number) => lerp(SEG2_HALF_H_MIN, SEG2_HALF_H_MAX, g);
export const decodeSeg2HalfW = (g: number) => lerp(SEG2_HALF_W_MIN, SEG2_HALF_W_MAX, g);
/** Pod longitudinal offset from chassis center, in meters. */
export const decodeSeg2OffX = (g: number, mainHalfL: number) => (g * 2 - 1) * mainHalfL;
/** Pod vertical seating: g=0 embeds it into the body top, g=1 stacks it cleanly on top. */
export const decodeSeg2OffY = (g: number, mainHalfH: number, seg2HalfH: number) =>
  mainHalfH + seg2HalfH * (0.3 + 0.7 * g);
/** Per-car color hue in degrees. */
export const decodeHue = (g: number) => g * 360;

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
    strutLen: new Float32Array(g.strutLen),
    seg2Present: g.seg2Present,
    seg2HalfL: g.seg2HalfL,
    seg2HalfH: g.seg2HalfH,
    seg2HalfW: g.seg2HalfW,
    seg2OffX: g.seg2OffX,
    seg2OffY: g.seg2OffY,
    hue: g.hue,
  };
}
