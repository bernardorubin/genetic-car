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
  decodeMotorTorque3d,
  decodeTrackExtra,
  decodeWheelRadius3d,
  decodeWheelWidth,
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

export interface Wheel3D {
  body: RAPIER.RigidBody;
  radius: number;
  width: number;
}

export interface Car3D {
  chassis: RAPIER.RigidBody;
  wheels: Wheel3D[];
  halfL: number;
  halfH: number;
  halfW: number;
  startX: number;
  alive: boolean;
  /** furthest forward (+X) reached — the fitness metric */
  maxX: number;
  stallTicks: number;
}

/** Build a 3D car: box chassis + mirrored wheel pairs on each active axle, each wheel
 * held by a motorized revolute joint about the lateral (Z) axis. Wheels use sphere
 * colliders (robust, render as cylinders) constrained to roll by the joint. */
export function buildCar3d(
  world: RAPIER.World,
  genome: Genome3D,
  spawnX: number,
  spawnY: number,
  varyTorque = true,
): Car3D {
  const halfL = decodeHalfL(genome.chassisHalfL);
  const halfH = decodeHalfH(genome.chassisHalfH);
  const halfW = decodeHalfW(genome.chassisHalfW);
  const density = decodeChassisDensity3d(genome.chassisDensity);
  const track = decodeTrackExtra(genome.trackExtra);

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

  const wheels: Wheel3D[] = [];
  for (let i = 0; i < MAX_AXLES; i++) {
    if (!genome.axleActive[i]) continue;
    const radius = decodeWheelRadius3d(genome.wheelRadius[i]);
    const width = decodeWheelWidth(genome.wheelWidth[i]);
    const offsetX = decodeAxleOffset(genome.axlePos[i], halfL);
    const lateral = halfW + track + width * 0.5;
    const torque = varyTorque ? decodeMotorTorque3d(genome.motorTorque[i]) : UNIFORM_TORQUE;
    const factor = torque * MOTOR_FACTOR_SCALE;

    for (const side of [-1, 1] as const) {
      const wz = side * lateral;
      const wheel = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(spawnX + offsetX, spawnY - halfH, wz)
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
          { x: offsetX, y: -halfH, z: wz }, // anchor on chassis (local)
          { x: 0, y: 0, z: 0 }, // anchor on wheel (local center)
          { x: 0, y: 0, z: 1 }, // rotation axis (lateral)
        ),
        chassis,
        wheel,
        true,
      ) as RAPIER.RevoluteImpulseJoint;
      // Negative target spin drives the contact patch backward → car rolls +X.
      joint.configureMotorVelocity(-MOTOR_SPEED, factor);

      wheels.push({ body: wheel, radius, width });
    }
  }

  return {
    chassis,
    wheels,
    halfL,
    halfH,
    halfW,
    startX: spawnX,
    alive: true,
    maxX: spawnX,
    stallTicks: 0,
  };
}
