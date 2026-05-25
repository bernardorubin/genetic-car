import { Vec2, Polygon, Circle, RevoluteJoint, type Body, type World } from 'planck';
import {
  CHASSIS_VERTICES,
  chassisVertexAngle,
  decodeChassisDensity,
  decodeChassisRadius,
  decodeWheelDensity,
  decodeWheelRadius,
  type Genome,
} from './genome';

export interface Car {
  chassis: Body;
  wheels: [Body, Body];
  joints: [RevoluteJoint, RevoluteJoint];
  /** chassis vertices in local coords — handy for the renderer */
  chassisVerts: Vec2[];
  /** wheel radii in meters */
  wheelRadii: [number, number];
  startX: number;
  alive: boolean;
  /** monotonic max-x reached so far — fitness */
  maxX: number;
  /** ticks since maxX last advanced (stall detector) */
  stallTicks: number;
}

const MOTOR_SPEED = -18; // negative = forward (rolls toward +x on inverted-y world)
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
    // Keeps wheels from colliding with their own chassis.
    filterGroupIndex: -1,
  });

  const wheelBodies: Body[] = [];
  const wheelJoints: RevoluteJoint[] = [];
  const wheelRadii: number[] = [];
  for (let w = 0; w < 2; w++) {
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
    wheelBodies.push(wheelBody);
    wheelJoints.push(joint);
    wheelRadii.push(radius);
  }

  return {
    chassis,
    wheels: [wheelBodies[0], wheelBodies[1]],
    joints: [wheelJoints[0], wheelJoints[1]],
    chassisVerts: localVerts,
    wheelRadii: [wheelRadii[0], wheelRadii[1]],
    startX: originX,
    alive: true,
    maxX: originX,
    stallTicks: 0,
  };
}

export function destroyCar(world: World, car: Car): void {
  world.destroyBody(car.chassis);
  world.destroyBody(car.wheels[0]);
  world.destroyBody(car.wheels[1]);
}
