import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_AXLES } from '../sim3d/genome3d';
import { terrainMeshData, type Terrain3D } from '../sim3d/terrain3d';
import { useSim3d } from '../state3d/useSim3d';

const POOL_CARS = 16;
const POOL_WHEELS = MAX_AXLES * 2;

const COLOR_LEADER = 0xfbbf24;
const COLOR_ALIVE = 0x7dd3fc;
const COLOR_DEAD = 0x3a4256;
const COLOR_WHEEL = 0xa3e635;
const COLOR_WHEEL_DEAD = 0x4a5168;

export function Scene3D() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [-11, 6, 12], fov: 50, near: 0.1, far: 2000 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[0x0a0d14]} />
      <fog attach="fog" args={[0x0a0d14, 60, 220]} />
      <hemisphereLight args={[0xbcd2ff, 0x202634, 0.8]} />
      <directionalLight
        position={[40, 60, 20]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <FollowCamera />
      <TerrainMesh />
      <Vehicles />
    </Canvas>
  );
}

function FollowCamera() {
  const { camera } = useThree();
  const { getPopulation } = useSim3d();
  const desired = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const pop = getPopulation();
    if (!pop) return;
    const c = pop.sim.camera;
    desired.set(c.x - 11, c.y + 6, c.z + 12);
    camera.position.lerp(desired, 0.08);
    camera.lookAt(c.x + 3, c.y + 0.4, c.z);
  });
  return null;
}

function TerrainMesh() {
  const { getPopulation } = useSim3d();
  const meshRef = useRef<THREE.Mesh>(null);
  const lastTerrain = useRef<Terrain3D | null>(null);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        metalness: 0.0,
        roughness: 0.95,
        flatShading: true,
      }),
    [],
  );

  useFrame(() => {
    const pop = getPopulation();
    const mesh = meshRef.current;
    if (!pop || !mesh) return;
    const terrain = pop.sim.getTerrain();
    if (terrain === lastTerrain.current) return;
    lastTerrain.current = terrain;
    mesh.geometry.dispose();
    mesh.geometry = buildTerrainGeometry(terrain);
  });

  return <mesh ref={meshRef} material={material} receiveShadow geometry={EMPTY_GEO} />;
}

const EMPTY_GEO = new THREE.BufferGeometry();

function buildTerrainGeometry(t: Terrain3D): THREE.BufferGeometry {
  // Same vertices/indices the physics trimesh uses — the visible floor is the collider.
  const { vertices, indices } = terrainMeshData(t);
  const colors = new Float32Array(vertices.length);
  const lo = new THREE.Color(0x1b3a4b);
  const hi = new THREE.Color(0x7dd3fc);
  const tmp = new THREE.Color();
  for (let v = 0; v < vertices.length; v += 3) {
    const f = Math.min(1, vertices[v] / t.forwardLen); // forward-distance tint
    tmp.copy(lo).lerp(hi, f);
    colors[v] = tmp.r;
    colors[v + 1] = tmp.g;
    colors[v + 2] = tmp.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();
  return geo;
}

const CAR_INDICES = Array.from({ length: POOL_CARS }, (_, i) => i);
const WHEEL_INDICES = Array.from({ length: POOL_WHEELS }, (_, w) => w);

function Vehicles() {
  const { getPopulation } = useSim3d();

  // Declarative mesh pool; refs (mutable by design) are mutated each frame.
  const chassisRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wheelRefs = useRef<(THREE.Mesh | null)[][]>([]);

  // Shared geometries (cylinder axis is Y; we re-aim it to Z per-frame via baseQuat).
  const chassisGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const wheelGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 22), []);
  const baseQuat = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
    [],
  );
  const spin = useMemo(() => new THREE.Quaternion(), []);
  useEffect(() => {
    return () => {
      chassisGeo.dispose();
      wheelGeo.dispose();
    };
  }, [chassisGeo, wheelGeo]);

  useFrame(() => {
    const pop = getPopulation();
    if (!pop) return;
    const cars = pop.sim.cars;
    const leader = pop.sim.leader();
    for (let i = 0; i < POOL_CARS; i++) {
      const car = cars[i];
      const cMesh = chassisRefs.current[i];
      const ws = wheelRefs.current[i] ?? [];
      if (!cMesh) continue;
      if (!car) {
        cMesh.visible = false;
        for (const wm of ws) if (wm) wm.visible = false;
        continue;
      }
      const ct = car.chassis.translation();
      const cr = car.chassis.rotation();
      cMesh.visible = true;
      cMesh.position.set(ct.x, ct.y, ct.z);
      cMesh.quaternion.set(cr.x, cr.y, cr.z, cr.w);
      cMesh.scale.set(car.halfL * 2, car.halfH * 2, car.halfW * 2);
      const cmat = cMesh.material as THREE.MeshStandardMaterial;
      cmat.color.setHex(!car.alive ? COLOR_DEAD : car === leader ? COLOR_LEADER : COLOR_ALIVE);
      cmat.opacity = car.alive ? 0.92 : 0.4;

      for (let w = 0; w < POOL_WHEELS; w++) {
        const wm = ws[w];
        if (!wm) continue;
        const wheel = car.wheels[w];
        if (!wheel) {
          wm.visible = false;
          continue;
        }
        const wt = wheel.body.translation();
        const wr = wheel.body.rotation();
        wm.visible = true;
        wm.position.set(wt.x, wt.y, wt.z);
        spin.set(wr.x, wr.y, wr.z, wr.w);
        wm.quaternion.copy(spin).multiply(baseQuat); // aim cylinder along Z, then spin
        // geometry-local axes (Y-up cylinder): radius on X/Z, width on Y
        wm.scale.set(wheel.radius, wheel.width, wheel.radius);
        (wm.material as THREE.MeshStandardMaterial).color.setHex(
          car.alive ? COLOR_WHEEL : COLOR_WHEEL_DEAD,
        );
      }
    }
  });

  return (
    <group>
      {CAR_INDICES.map((i) => (
        <group key={i}>
          <mesh
            ref={(m) => {
              chassisRefs.current[i] = m;
            }}
            geometry={chassisGeo}
            castShadow
            visible={false}
          >
            <meshStandardMaterial
              color={COLOR_ALIVE}
              metalness={0.2}
              roughness={0.5}
              transparent
              opacity={0.92}
            />
          </mesh>
          {WHEEL_INDICES.map((w) => (
            <mesh
              key={w}
              ref={(m) => {
                (wheelRefs.current[i] ??= [])[w] = m;
              }}
              geometry={wheelGeo}
              castShadow
              visible={false}
            >
              <meshStandardMaterial color={COLOR_WHEEL} metalness={0.3} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
