import { Vec2, Polygon, Circle, RevoluteJoint, type Body, type World } from 'planck';
import {
  ARM_RENDER_MIN,
  CHASSIS_VERTICES,
  MAX_WHEELS,
  chassisVertexAngle,
  decodeArmLength,
  decodeChassisDensity,
  decodeChassisRadius,
  decodeMotorTorque,
  decodeWheelDensity,
  decodeWheelRadius,
  type Genome,
} from './genome';

/** Visual-only arm — the wheel is still held by a single revolute joint to the chassis.
 * Storing the chassis-vertex this wheel "extends from" lets the renderer draw a
 * line in the chassis's frame each frame. No separate body, no extra joints,
 * no constraint-solver instability. */
export interface CarArm {
  /** local-frame chassis vertex the arm sticks out of */
  anchorLocal: Vec2;
  /** local-frame wheel center (vertex + outward * armLength) */
  wheelLocal: Vec2;
}

export interface Car {
  chassis: Body;
  /** Realized wheels only (active === 1). Length 1..MAX_WHEELS. */
  wheels: Body[];
  /** Parallel to wheels — `null` for wheels attached directly to the chassis vertex. */
  arms: (CarArm | null)[];
  /** Parallel to wheels — radius in meters. */
  wheelRadii: number[];
  /** chassis vertices in local coords — handy for the renderer */
  chassisVerts: Vec2[];
  startX: number;
  alive: boolean;
  maxX: number;
  stallTicks: number;
}

const MOTOR_SPEED = -22;
const MOTOR_TORQUE = 150;

export function buildCar(
  world: World,
  genome: Genome,
  originX: number,
  originY: number,
  varyTorque = true,
): Car {
  const localVerts: Vec2[] = [];
  for (let i = 0; i < CHASSIS_VERTICES; i++) {
    const r = decodeChassisRadius(genome.chassis[i]);
    const a = chassisVertexAngle(i);
    localVerts.push(new Vec2(Math.cos(a) * r, Math.sin(a) * r));
  }

  const chassisPos = new Vec2(originX, originY);
  const chassis = world.createBody({
    type: 'dynamic',
    position: chassisPos,
    // Higher damping than before — long arms create larger moment arms on the
    // motor reaction torque, so without damping the chassis can spin away.
    angularDamping: 0.4,
  });
  chassis.createFixture({
    shape: new Polygon(localVerts),
    density: decodeChassisDensity(genome.chassisDensity),
    friction: 0.3,
    restitution: 0.02,
    // Negative groupIndex = bodies in same group never collide.
    filterGroupIndex: -1,
  });

  const wheels: Body[] = [];
  const arms: (CarArm | null)[] = [];
  const wheelRadii: number[] = [];

  for (let w = 0; w < MAX_WHEELS; w++) {
    if (!genome.wheelActive[w]) continue;

    const vi = genome.wheelVertex[w];
    const vertex = localVerts[vi];
    const armLength = decodeArmLength(genome.wheelArm[w]);
    const radius = decodeWheelRadius(genome.wheelRadii[w]);

    // Offset the wheel outward from the chassis vertex by armLength.
    // The "arm" is purely visual — there's no separate body to maintain it.
    // A single revolute joint at the wheel center holds the wheel in place
    // relative to the chassis (same physics as no-arm wheels, just offset).
    let wheelLocal: Vec2;
    let arm: CarArm | null = null;
    if (armLength < ARM_RENDER_MIN) {
      wheelLocal = vertex;
    } else {
      const vertexMag = Math.hypot(vertex.x, vertex.y) || 1;
      const ox = vertex.x / vertexMag;
      const oy = vertex.y / vertexMag;
      wheelLocal = new Vec2(vertex.x + ox * armLength, vertex.y + oy * armLength);
      arm = { anchorLocal: vertex, wheelLocal };
    }

    const wheelWorld = new Vec2(chassisPos.x + wheelLocal.x, chassisPos.y + wheelLocal.y);
    const wheelBody = world.createBody({ type: 'dynamic', position: wheelWorld });
    wheelBody.createFixture({
      shape: new Circle(radius),
      density: decodeWheelDensity(genome.wheelDensity[w]),
      friction: 1.0,
      restitution: 0.05,
      filterGroupIndex: -1,
    });

    // Torque is either evolved per-wheel (varyTorque) or the uniform legacy constant.
    // Motor speed stays constant either way so improvements still come from morphology
    // + drivetrain, not evolved top-end gearing.
    const maxMotorTorque = varyTorque ? decodeMotorTorque(genome.wheelTorque[w]) : MOTOR_TORQUE;
    const joint = world.createJoint(
      new RevoluteJoint(
        {
          enableMotor: true,
          motorSpeed: MOTOR_SPEED,
          maxMotorTorque,
        },
        chassis,
        wheelBody,
        wheelWorld,
      ),
    );
    if (!joint) throw new Error('createJoint returned null');

    wheels.push(wheelBody);
    arms.push(arm);
    wheelRadii.push(radius);
  }

  return {
    chassis,
    wheels,
    arms,
    wheelRadii,
    chassisVerts: localVerts,
    startX: originX,
    alive: true,
    maxX: originX,
    stallTicks: 0,
  };
}

export function destroyCar(world: World, car: Car): void {
  world.destroyBody(car.chassis);
  for (const w of car.wheels) world.destroyBody(w);
}
