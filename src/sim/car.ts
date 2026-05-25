import { Vec2, Polygon, Circle, RevoluteJoint, type Body, type World } from 'planck';
import {
  CHASSIS_VERTICES,
  MAX_WHEELS,
  chassisVertexAngle,
  decodeChassisDensity,
  decodeChassisRadius,
  decodeWheelDensity,
  decodeWheelRadius,
  type Genome,
} from './genome';

export interface Car {
  chassis: Body;
  /** Realized wheels only (active === 1). Length 1..MAX_WHEELS. */
  wheels: Body[];
  joints: RevoluteJoint[];
  /** Parallel to `wheels` — radius in meters for each realized wheel. */
  wheelRadii: number[];
  /** chassis vertices in local coords — handy for the renderer */
  chassisVerts: Vec2[];
  startX: number;
  alive: boolean;
  /** monotonic max-x reached so far — fitness */
  maxX: number;
  /** ticks since maxX last advanced (stall detector) */
  stallTicks: number;
}

const MOTOR_SPEED = -18;
const MOTOR_TORQUE = 60;

export function buildCar(world: World, genome: Genome, originX: number, originY: number): Car {
  const localVerts: Vec2[] = [];
  for (let i = 0; i < CHASSIS_VERTICES; i++) {
    const r = decodeChassisRadius(genome.chassis[i]);
    const a = chassisVertexAngle(i);
    localVerts.push(new Vec2(Math.cos(a) * r, Math.sin(a) * r));
  }

  const chassis = world.createBody({
    type: 'dynamic',
    position: new Vec2(originX, originY),
    angularDamping: 0.05,
  });
  chassis.createFixture({
    shape: new Polygon(localVerts),
    density: decodeChassisDensity(genome.chassisDensity),
    friction: 0.3,
    restitution: 0.02,
    // Negative groupIndex = bodies in same group never collide.
    // Keeps wheels from colliding with their own chassis (and each other).
    filterGroupIndex: -1,
  });

  const wheels: Body[] = [];
  const joints: RevoluteJoint[] = [];
  const wheelRadii: number[] = [];
  for (let w = 0; w < MAX_WHEELS; w++) {
    if (!genome.wheelActive[w]) continue;
    const vi = genome.wheelVertex[w];
    const anchor = localVerts[vi];
    const radius = decodeWheelRadius(genome.wheelRadii[w]);
    const worldPos = new Vec2(originX + anchor.x, originY + anchor.y);
    const wheelBody = world.createBody({
      type: 'dynamic',
      position: worldPos,
    });
    wheelBody.createFixture({
      shape: new Circle(radius),
      density: decodeWheelDensity(genome.wheelDensity[w]),
      friction: 1.0,
      restitution: 0.05,
      filterGroupIndex: -1,
    });
    const joint = world.createJoint(
      new RevoluteJoint(
        {
          enableMotor: true,
          motorSpeed: MOTOR_SPEED,
          maxMotorTorque: MOTOR_TORQUE,
        },
        chassis,
        wheelBody,
        worldPos,
      ),
    );
    if (!joint) throw new Error('createJoint returned null');
    wheels.push(wheelBody);
    joints.push(joint);
    wheelRadii.push(radius);
  }

  return {
    chassis,
    wheels,
    joints,
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
