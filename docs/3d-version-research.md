# 3D genetic cars — stack research

Research for a 3D successor to this 2D `genetic.cars` project: evolve 3D vehicles
(chassis + wheels/joints) over 3D terrain with a genetic algorithm, in the browser.
Sources checked are current as of early 2026; physics-engine determinism and vehicle
support move fast, so re-verify the cited pages before committing.

## The hard requirement: determinism

The whole GA depends on **reproducibility** — same seed + same params must give a
byte-identical run, exactly as the 2D project gets from `planck` + `seedrandom`. That
single constraint drives the engine choice more than raw performance or features. A
"fast but non-deterministic" engine is disqualifying, because:

- Selection/crossover/mutation are seeded; if the *physics* fitness eval drifts between
  runs, identical genomes score differently and the seeded GA stops being reproducible.
- We want **headless fast-forward** evaluation (step physics with no rendering, many
  sims in parallel in Web Workers). That only pays off if a worker's result is identical
  to the main thread's and to every other worker's.

So the two axes that matter most: **(1) cross-platform deterministic stepping** and
**(2) headless, worker-friendly WASM** that can run many independent worlds.

## Engine comparison

| Engine | Determinism | Vehicle / joint support | WASM-in-Worker | Maturity (2025/26) | Notes |
|---|---|---|---|---|---|
| **Rapier 3D** (`@dimforge/rapier3d`) | **Cross-platform deterministic** by design; documented, plus a determinism-focused build | Revolute/prismatic joints **with motors**; `DynamicRayCastVehicleController` | **Strong** — WASM runs in workers; `world.takeSnapshot()`/`restoreSnapshot()` for cheap world clone/reset | Production-ready, Rust core, active | Best determinism story + snapshot API. Caveat: `Math.sin/cos` etc. aren't guaranteed identical across platforms — keep trig out of the deterministic path or precompute. |
| **Jolt** (`jolt-physics`) | Deterministic **builds** available (`CROSS_PLATFORM_DETERMINISTIC`) | Purpose-built `VehicleConstraint` / wheeled-vehicle controller | Workers OK; multi-threaded builds exist but JS/worker docs are thinner | Stable, AAA pedigree (Horizon, Death Stranding 2) | Excellent vehicles; fewer browser examples than Rapier. The JS bindings (`JoltPhysics.js`) lag the native feature set. |
| **Havok** (`@babylonjs/havok`) | Stated cross-platform deterministic | Vehicle systems via Babylon; demos exist | Headless/server-capable; worker story unclear | Production-ready | Tied to the Babylon ecosystem in practice. Needs WASM SIMD (excludes old iOS). Less idiomatic outside Babylon. |
| **Ammo.js** (Bullet 2.8.2) | **No determinism guarantee** | `btRaycastVehicle` (well-documented) | Works in workers, slower | Minimal maintenance, stuck on old Bullet | Legacy. The classic BoxCar-style choice, but the determinism gap rules it out for a seeded GA. |
| **cannon-es** | Deterministic only with a fixed timestep, never rigorously verified | `RaycastVehicle` | Pure JS → trivially worker-friendly, but no SIMD | Mature but slow | Great for a quick prototype; too slow for hundreds of parallel 3D evals. |
| **PhysX** (`physx-js-webidl`) | Not stated | Vehicle demo included | Emscripten; worker use untested | Niche bindings | Overkill; partial API coverage. Skip. |

### Determinism detail
- **Rapier** documents cross-platform determinism for the WASM build and ships a
  determinism-oriented variant. Snapshots make "reset world to a known state per
  candidate" cheap and exact — ideal for evaluating a generation.
- **Jolt** guarantees deterministic *if you build with the flag*; the prebuilt JS
  package may or may not be that build — verify before relying on it.
- **Havok** is deterministic but its determinism is realistically consumed *through*
  Babylon, which couples the physics choice to the renderer choice.

## Rendering layer

| Option | React fit | Physics integration | Tradeoff |
|---|---|---|---|
| **React Three Fiber** (`@react-three/fiber` + `drei`) over Three.js | **Best** — React-first, matches this project's React 19 + Vite + TS | `@react-three/rapier` (components for bodies/colliders/joints; ships a car example using revolute joints + motor velocity) | Smaller base bundle; large pmndrs ecosystem; reuses our current skills directly. |
| **Babylon.js** + Havok | Awkward — Babylon owns its own scene graph; React is a bolt-on | Native Havok plugin, deterministic | Heavier bundle; steeper if you're React-centric; fewer GA examples. |

**Recommendation: React Three Fiber + Three.js.** It keeps the entire stack in the
React/TS/Vite world we already use, and `@react-three/rapier` gives a maintained bridge
to the recommended physics engine — while still letting us call the **raw Rapier API**
inside workers (where React isn't involved).

## Headless GA evaluation architecture

The point of a GA is to score many candidates fast. Rendering all of them is the
bottleneck, so split simulation from rendering:

```
Main thread (React + R3F)
  └─ GA coordinator: build population, dispatch candidates, collect fitness
       └─ Worker pool (≈ navigator.hardwareConcurrency)
            ├─ Worker: own Rapier World (no WebGL context)
            │    • restore a baseline world snapshot (or rebuild deterministically)
            │    • add the candidate vehicle from its genome
            │    • step a fixed number of fixed-timestep ticks (no RAF)
            │    • return fitness (max x / distance / etc.)
            └─ …
  └─ Renderer: draw only the current/best candidate (or replay via snapshot)
```

Key practices:
- **Physics-only stepping in workers** — no `requestAnimationFrame`, just a `for` loop
  over `world.step()`. This is where the fast-forward speedup comes from.
- **Fixed timestep** for determinism (decouple from render frame rate; accumulator
  pattern, à la Gaffer "Fix Your Timestep").
- **World reset per candidate** — Rapier `takeSnapshot()` once, then `restoreSnapshot()`
  before each eval; or rebuild the world deterministically. Objects must be created in
  identical order or determinism breaks.
- **Seeded RNG parity** — reuse `seedrandom` exactly like the 2D project; never touch
  `Math.random()`. Worker init must produce identical bodies/masses/joint params.
- **Transport** — start with `postMessage` (simple, no headers). Move to
  `SharedArrayBuffer` only if profiling shows contention; it needs COOP/COEP headers
  (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`).
- **WASM init cost** — each worker instantiates its own Rapier WASM once at startup; keep
  workers warm and reuse them across generations rather than respawning per candidate.
- **Don't render in workers** — OffscreenCanvas + WebGL in workers is fiddly and weak in
  Safari. Workers simulate; the main thread renders the leader/replay.

## Recommended stack

**Primary: Rapier 3D + React Three Fiber + Web Worker pool.**

- Physics: `@dimforge/rapier3d` (consider the determinism build), called directly in
  workers; `@react-three/rapier` for the on-screen leader/replay.
- Render: Three.js via `@react-three/fiber` (+ `drei`).
- RNG: `seedrandom` (same as 2D).
- Terrain: seeded procedural heightfield → Rapier heightfield collider.
- Build: Vite + React 19 + strict TS (reuse this repo's toolchain).

Why: best-documented cross-platform determinism, snapshot/restore for cheap exact world
resets, motorized joints + a ray-cast vehicle controller, proven WASM-in-worker support,
and it stays entirely in our existing React/TS/Vite skill set.

### Alternatives
- **Jolt + R3F** — AAA-grade vehicles and deterministic builds; pick it if Rapier's
  vehicle controller proves too limited. Risk: thinner browser/worker examples, JS
  bindings trail native.
- **Babylon.js + Havok** — deterministic and batteries-included if you'd rather adopt a
  full game engine. Risk: not React-idiomatic, heavier, smaller GA ecosystem.

### Main risks / unknowns to spike first
1. **Determinism across worker + main thread** — prove a seeded run scores identically in
   a worker and on the main thread *before* building the GA on top.
2. **Snapshot cost** — benchmark `takeSnapshot`/`restoreSnapshot` vs. deterministic
   rebuild for our world size; pick the cheaper reset path.
3. **Trig determinism** — Rapier flags `Math.sin/cos` as not cross-platform identical;
   keep them out of the physics-affecting path or precompute tables.
4. **Vehicle model fit** — decide raycast-vehicle controller vs. explicit wheel bodies +
   motorized revolute joints (closer to the current 2D model). The latter ports our
   mental model more directly.

## Suggested phased roadmap (research → build)

1. **Render spike** — R3F scene, procedural heightfield terrain, one static vehicle mesh.
2. **Physics spike** — Rapier world, vehicle (wheels + motorized joints), drive it;
   verify determinism with seeded runs on the main thread.
3. **Single-thread GA PoC** — population, fitness, selection/crossover/mutation; slow but
   proves the loop and reproducibility end-to-end.
4. **Worker-pool eval** — move stepping into workers, dispatch candidates, collect
   fitness; measure the speedup and re-verify determinism worker-vs-main.
5. **Visualization + UX** — render the leader/replay, port the fitness graph / HUD /
   sidebar concepts from the 2D app.

This is **research only** — actually building the 3D app is a separate, large effort.

## References
- Rapier — determinism: https://rapier.rs/docs/user_guides/javascript/determinism/
- Rapier — World snapshot API: https://rapier.rs/javascript3d/classes/World.html
- Rapier — 2025 retrospective (perf): https://dimforge.com/blog/2026/01/09/the-year-2025-in-dimforge/
- `@react-three/rapier`: https://github.com/pmndrs/react-three-rapier
- `@react-three/rapier` car example: https://github.com/pmndrs/react-three-rapier/blob/main/demo/src/examples/car/CarExample.tsx
- React Three Fiber docs: https://r3f.docs.pmnd.rs/
- Jolt Physics: https://github.com/jrouwe/JoltPhysics — JS bindings: https://github.com/jrouwe/JoltPhysics.js
- Havok (Babylon): https://github.com/BabylonJS/havok — plugin docs: https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin
- Ammo.js: https://github.com/kripken/ammo.js/ · cannon-es: https://github.com/pmndrs/cannon-es · PhysX WASM: https://github.com/fabmax/physx-js-webidl
- Gaffer — "Fix Your Timestep": https://gafferongames.com/post/fix_your_timestep/
- Prior art — self-parking car evolution (Three.js + cannon): https://github.com/trekhleb/self-parking-car-evolution
