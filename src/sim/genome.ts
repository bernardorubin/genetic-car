// Genome: a fixed-shape vector of normalized [0,1] floats decoded into
// physical car properties. Pure data — no planck dependency.

export const CHASSIS_VERTICES = 8;

export type Rng = () => number;

export interface Genome {
  /** length 8, each in [0,1] — radius from car center at angle i*(2π/8) */
  chassis: Float32Array;
  /** length 2, in [0,1] — wheel radius */
  wheelRadii: Float32Array;
  /** length 2, in [0,7] — index of chassis vertex each wheel attaches to */
  wheelVertex: Uint8Array;
  /** length 2, in [0,1] — wheel density */
  wheelDensity: Float32Array;
  /** in [0,1] — chassis density */
  chassisDensity: number;
}

// Physical decode ranges. Tuned for ~2m cars.
export const CHASSIS_RADIUS_MIN = 0.3;
export const CHASSIS_RADIUS_MAX = 1.1;
export const WHEEL_RADIUS_MIN = 0.2;
export const WHEEL_RADIUS_MAX = 0.5;
export const CHASSIS_DENSITY_MIN = 30;
export const CHASSIS_DENSITY_MAX = 300;
export const WHEEL_DENSITY_MIN = 40;
export const WHEEL_DENSITY_MAX = 120;

export function randomGenome(rng: Rng): Genome {
  const chassis = new Float32Array(CHASSIS_VERTICES);
  for (let i = 0; i < CHASSIS_VERTICES; i++) chassis[i] = rng();
  return {
    chassis,
    wheelRadii: Float32Array.from([rng(), rng()]),
    wheelVertex: Uint8Array.from([
      Math.floor(rng() * CHASSIS_VERTICES),
      Math.floor(rng() * CHASSIS_VERTICES),
    ]),
    wheelDensity: Float32Array.from([rng(), rng()]),
    chassisDensity: rng(),
  };
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

export function chassisVertexAngle(i: number): number {
  return (i / CHASSIS_VERTICES) * Math.PI * 2;
}
