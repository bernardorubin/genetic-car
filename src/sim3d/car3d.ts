import RAPIER from '@dimforge/rapier3d-compat';
import {
  MAX_AXLES,
  MOTOR_SPEED,
  MOTOR_TORQUE_MAX,
  MOTOR_TORQUE_MIN,
  WHEEL_DENSITY,
  decodeAxleOffset,
  decodeChassisDensity3d,
  decodeHalfH,
  decodeHalfL,
  decodeHalfW,
  decodeHue,
  decodeMotorTorque3d,
  decodeSeg2HalfH,
  decodeSeg2HalfL,
  decodeSeg2HalfW,
  decodeSeg2OffX,
  decodeSeg2OffY,
  decodeStrutLen,
  decodeTrackExtra,
  decodeWheelRadius3d,
  decodeWheelWidth,
  seg2Active,
  type Genome3D,
} from './genome3d';

// Collision groups (Rapier InteractionGroups: high 16 bits = membership, low 16 = filter).
// Cars collide with terrain but never with themselves or each other (same as the 2D sim's
// filterGroupIndex trick) — so a crowded generation doesn't turn into a pileup.
const GROUP_TERRAIN = 0x0001;
const GROUP_CAR = 0x0002;
export const TERRAIN_GROUPS = (GROUP_TERRAIN << 16) | GROUP_CAR;
const CAR_GROUPS = (GROUP_CAR << 16) | GROUP_TERRAIN;

const CHASSIS_FRICTION = 0.5;
const WHEEL_FRICTION = 1.5;
// configureMotorVelocity's second arg is a velocity-error gain ("factor"), not N·m.
// Map the torque gene through this scale so "more torque" = a stronger drive.
const MOTOR_FACTOR_SCALE = 0.12;
const UNIFORM_TORQUE = (MOTOR_TORQUE_MIN + MOTOR_TORQUE_MAX) / 2;

/** Per-build car tuning that lives outside the genome — driven by user settings. */
export interface BuildCarOpts {
  varyTorque: boolean;
  /** 0..1 — how dramatic morphology is allowed to get (see decodeVaried). */
  bodyVariety: number;
  /** 0..1 — how much wheel radius can differ across one car's axles. */
  wheelSizeSpread: number;
}

/** Decoded second-body-segment dims (chassis-local), or null when the car is single-box. */
export interface Seg2Dims {
  halfL: number;
  halfH: number;
  halfW: number;
  offX: number;
  offY: number;
}

export interface Wheel3D {
  body: RAPIER.RigidBody;
  radius: number;
  width: number;
  /** leg length below the chassis (0 = tucked under) — for the renderer's strut. */
  strut: number;
  /** chassis-local mount point (top of the strut), for drawing the leg. */
  anchorX: number;
  anchorY: number;
  anchorZ: number;
}

export interface Car3D {
  chassis: RAPIER.RigidBody;
  wheels: Wheel3D[];
  halfL: number;
  halfH: number;
  halfW: number;
  /** optional welded cabin/pod, chassis-local; null when single-box */
  seg2: Seg2Dims | null;
  /** per-car render color (decoded from the hue gene) */
  colorHex: number;
  startX: number;
  alive: boolean;
  /** furthest forward (+X) reached — the fitness metric */
  maxX: number;
  stallTicks: number;
}

/** HSL (h in degrees, s/l in [0,1]) → 0xRRGGBB. Pure; used to give each car a color. */
function hslToHex(h: number, s: number, l: number): number {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r: number;
  let g: number;
  let b: number;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}

/** Build a 3D car: a (possibly two-box) chassis + mirrored wheel pairs on each active
 * axle, each wheel held by a motorized revolute joint about the lateral (Z) axis. Wheels
 * use sphere colliders (robust, render as cylinders) and can sit on a strut (leg) that
 * lifts the body up. Morphology spread is driven by `opts` (a user setting), not genes. */
export function buildCar3d(
  world: RAPIER.World,
  genome: Genome3D,
  spawnX: number,
  spawnY: number,
  opts: BuildCarOpts,
): Car3D {
  const variety = opts.bodyVariety;
  const halfL = decodeHalfL(genome.chassisHalfL, variety);
  const halfH = decodeHalfH(genome.chassisHalfH, variety);
  const halfW = decodeHalfW(genome.chassisHalfW, variety);
  const density = decodeChassisDensity3d(genome.chassisDensity);
  const track = decodeTrackExtra(genome.trackExtra);
  const colorHex = hslToHex(decodeHue(genome.hue), 0.62, 0.56);

  const chassis = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnX, spawnY, 0)
      .setLinearDamping(0.05)
      .setAngularDamping(0.5),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(halfL, halfH, halfW)
      .setDensity(density)
      .setFriction(CHASSIS_FRICTION)
      .setRestitution(0)
      .setCollisionGroups(CAR_GROUPS),
    chassis,
  );

  // Optional welded second box (cabin/pod) — a second collider on the SAME rigid body,
  // so Rapier folds it into the car's mass/COM. Pod width is capped to the body width
  // so it never sticks out past the wheels.
  let seg2: Seg2Dims | null = null;
  if (seg2Active(genome, variety)) {
    const s2HalfH = decodeSeg2HalfH(genome.seg2HalfH);
    seg2 = {
      halfL: decodeSeg2HalfL(genome.seg2HalfL),
      halfH: s2HalfH,
      halfW: Math.min(decodeSeg2HalfW(genome.seg2HalfW), halfW),
      offX: decodeSeg2OffX(genome.seg2OffX, halfL),
      offY: decodeSeg2OffY(genome.seg2OffY, halfH, s2HalfH),
    };
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(seg2.halfL, seg2.halfH, seg2.halfW)
        .setTranslation(seg2.offX, seg2.offY, 0)
        .setDensity(density)
        .setFriction(CHASSIS_FRICTION)
        .setRestitution(0)
        .setCollisionGroups(CAR_GROUPS),
      chassis,
    );
  }

  const wheels: Wheel3D[] = [];
  for (let i = 0; i < MAX_AXLES; i++) {
    if (!genome.axleActive[i]) continue;
    const radius = decodeWheelRadius3d(
      genome.wheelRadius[i],
      variety,
      opts.wheelSizeSpread,
      genome.wheelRadius[0],
    );
    const width = decodeWheelWidth(genome.wheelWidth[i]);
    const offsetX = decodeAxleOffset(genome.axlePos[i], halfL);
    const strut = decodeStrutLen(genome.strutLen[i], variety);
    // Wheel center sits below the chassis bottom by `strut` — a rigid leg, no extra body
    // (a welded rod + WheelJoint crashed the 2D sim's TOI solver; offset-revolute is stable).
    const anchorY = -halfH - strut;
    const lateral = halfW + track + width * 0.5;
    const torque = opts.varyTorque ? decodeMotorTorque3d(genome.motorTorque[i]) : UNIFORM_TORQUE;
    const factor = torque * MOTOR_FACTOR_SCALE;

    for (const side of [-1, 1] as const) {
      const wz = side * lateral;
      const wheel = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(spawnX + offsetX, spawnY + anchorY, wz)
          .setAngularDamping(0.04),
      );
      world.createCollider(
        RAPIER.ColliderDesc.ball(radius)
          .setDensity(WHEEL_DENSITY)
          .setFriction(WHEEL_FRICTION)
          .setRestitution(0.05)
          .setCollisionGroups(CAR_GROUPS),
        wheel,
      );

      const joint = world.createImpulseJoint(
        RAPIER.JointData.revolute(
          { x: offsetX, y: anchorY, z: wz }, // anchor on chassis (local, lowered by strut)
          { x: 0, y: 0, z: 0 }, // anchor on wheel (local center)
          { x: 0, y: 0, z: 1 }, // rotation axis (lateral)
        ),
        chassis,
        wheel,
        true,
      ) as RAPIER.RevoluteImpulseJoint;
      // Negative target spin drives the contact patch backward → car rolls +X.
      joint.configureMotorVelocity(-MOTOR_SPEED, factor);

      wheels.push({ body: wheel, radius, width, strut, anchorX: offsetX, anchorY, anchorZ: wz });
    }
  }

  return {
    chassis,
    wheels,
    halfL,
    halfH,
    halfW,
    seg2,
    colorHex,
    startX: spawnX,
    alive: true,
    maxX: spawnX,
    stallTicks: 0,
  };
}
