# genetic.cars

A from-scratch modernization of [HTML5 Genetic Cars](https://rednuht.org/genetic_cars_2/) (spiritual successor to BoxCar2D). A genetic algorithm evolves 2D vehicles (up to 4 wheels each) across generations on procedurally-generated terrain. The user can tweak mutation/selection knobs per generation and watch evolution play out.

## Stack

- **Runtime / pkg manager**: Bun (`bun install`, `bun run dev`). Never use npm/yarn/pnpm here.
- **App**: Vite + React 19 + TypeScript (strict).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. Theme tokens live in `src/index.css` under `@theme`. Custom `glass` and `hairline` utilities are defined with `@utility` in the same file.
- **Physics**: `planck` (pure-JS Box2D 2.3 port). Deterministic when paired with `seedrandom` — that's what makes seeded runs reproducible.
- **RNG**: `seedrandom`. Every random draw in the sim goes through an RNG instance, never `Math.random`.
- **Persistence**: `localStorage` only. No database, no server, no API.
- **Charts**: rolled by hand on canvas. No charting lib.

## Module layout

```
src/
  App.tsx                  # top-level layout shell
  main.tsx                 # React entry
  index.css                # Tailwind theme + global styles + glass utility

  sim/                     # pure simulation domain — no React, no DOM
    genome.ts              # Genome type + random/decode helpers + ensureValid
    terrain.ts             # seeded floor generation + difficultyRamp(x)
    car.ts                 # Genome -> planck bodies + wheel revolute joints with motors
    world.ts               # SimWorld: planck.World lifecycle, step loop, follow camera
    ga.ts                  # tournament selection, uniform crossover, mutation, elitism
    population.ts          # Population: per-gen lifecycle, replay mode, snapshot/load
    storage.ts             # localStorage save/restore (key versioned, v4 currently)

  render/
    canvas.ts              # draws a SimWorld snapshot to a Canvas2D context + TERRAIN_TIERS

  state/                   # React glue — only file that bridges sim <-> UI
    types.ts               # SimSettings, LiveStats, GravityKey, FloorMode, defaults
    SimContext.ts          # React context (definition only)
    SimProvider.tsx        # Provider that owns the Population ref + drives the RAF loop
    useSim.ts              # the hook UI components import

  ui/                      # React components only — never imports planck
    SimCanvas.tsx          # mounts canvas + drives render-side RAF (sim ticks live in SimProvider)
    Sidebar.tsx            # control panel (sliders, selects, action buttons)
    Hud.tsx                # overlay stats — mobile (compact scoreboard) + desktop (full readout), toggled by Tailwind breakpoints
    FitnessGraph.tsx       # per-generation best / top10 avg / avg chart
    MobileControls.tsx     # <lg bottom-sheet: FAB + swipe-dismiss glass sheet wrapping <Sidebar/>
    useMediaQuery.ts       # matchMedia hook (own file for react-refresh)
```

**Boundary rule**: `sim/` and `render/` must not import React or anything from `ui/`. UI talks to the sim through a single imperative facade (`Population`) exposed via the `useSim()` hook. Per-frame state (positions, scores) flows through the canvas directly — React state holds only UI knobs and throttled per-generation summaries.

## Responsive layout

`App.tsx` switches at `lg` (1024px) via `useMediaQuery` — a **JS** breakpoint, not just CSS `hidden`. Below `lg`: full-bleed canvas + `<MobileControls>` bottom sheet. At `lg`+: the original `grid-cols-[1fr_340px]`. The Sidebar is heavy (canvas effects, context subs), so it must mount in exactly **one** place — hence conditional render (`isDesktop ? <aside> : <MobileControls/>`) instead of double-mounting two CSS-hidden copies. The sheet stays mounted (translated off-screen when closed) so open/close both animate and the FitnessGraph canvas keeps a measured width.

Mobile foundations live in `index.css`: `#root` uses `100dvh` (URL-bar-safe), `glass-strong` (opaque sheet legible over the canvas), taller range sliders on `pointer: coarse`. `index.html` carries `viewport-fit=cover` + `theme-color`; safe-area insets are applied via `env(safe-area-inset-*)`.

**Gotcha**: the canvas renderer used to draw its own top-right `leader · Xm` label. It was invisible on desktop (covered by HUD glass pills) but bled through the translucent mobile HUD chip and collided. It was removed — the DOM `Hud` is the single source of truth for distance. Don't re-add a canvas-drawn HUD label.

## State + simulation loop

The sim runs in `SimProvider.tsx`, **not** in `SimCanvas`. This matters because the user can toggle rendering off and we still want generations to advance.

1. `SimProvider` holds a `populationRef` (mutable, persists across renders) and a `stats` state (throttled live snapshot for the UI).
2. A single RAF loop calls `population.step()` 2× per frame when rendering is on, 12× per frame when rendering is off.
3. Every 6 frames the loop reads `population.liveStats()` and pushes a fresh `LiveStats` into React state. Components re-render off that, not off raw sim state.
4. `SimCanvas` has its own RAF that *only* draws — it pulls the current Population from `getPopulation()` and renders the latest frame.

Population rebuild triggers: changing **seed**, **gravity**, **floor**, **roughness**, or **maxSlope** creates a new `Population`. Changing mutation params updates in place via `pop.updateGAParams()`.

## Genome (working spec)

41 genes per car, all normalized floats in [0, 1] unless noted. Each gene maps through a `decode*` helper in `genome.ts` into a physical value.

| Gene group | Count | Stored as | Decoded range | Notes |
|---|---|---|---|---|
| Chassis radii | 8 | `Float32Array` | **0.1m – 1.8m** | Polar radii at fixed evenly-spaced angles. Wide range (~18×) lets the GA evolve dramatic asymmetric spikes, BoxCar2D-style. Convex polygon guaranteed. |
| Wheel radii | 4 | `Float32Array` | **0.2m – 0.5m** | One per wheel slot. Narrower range — wheels much bigger than chassis break physics. |
| Wheel vertex | 4 | `Uint8Array` | 0–7 | Which chassis vertex each wheel attaches to. |
| Wheel density | 4 | `Float32Array` | 40 – 120 kg/m² | Per wheel. |
| Wheel active | 4 | `Uint8Array` | 0 / 1 | `ensureValid()` guarantees ≥1 active so a car can move. GA discovers 1/2/3/4-wheel designs on its own. |
| Wheel arm | 4 | `Float32Array` | **0m – 1m** | Visual-only strut length. If above `ARM_RENDER_MIN`, the wheel is held at a position offset from the chassis vertex along the outward normal. A line is drawn in the renderer; no physics body backs the arm. |
| Wheel spring | 4 | `Float32Array` | 2 – 10 Hz | Reserved for future shock-absorber support — currently ignored (RevoluteJoint is rigid). See "Deferred" below. |
| Wheel damping | 4 | `Float32Array` | 0.25 – 0.85 | Same as above. |
| Wheel torque | 4 | `Float32Array` | **60 – 260 N·m** | Per-wheel motor torque. Only consulted when the `varyTorque` setting is on (default on); otherwise every wheel uses the uniform legacy constant (150). `decodeMotorTorque`; gene 0.45 = the legacy 150, used to backfill pre-v4 saves. |
| Chassis density | 1 | `number` | 30 – 300 kg/m² | |

Wheel motor **speed** is a constant (`MOTOR_SPEED = -22`), never evolved. Wheel motor **torque** is evolvable per wheel via the `wheelTorque` gene, gated by the `varyTorque` toggle (default on). With the toggle off, every wheel runs the uniform legacy `MOTOR_TORQUE = 150` — so improvements come from morphology alone, the original design intent. Toggling it live rebuilds the current sim in place (`Population.applyVaryTorque`) without discarding the population, so it's a clean A/B on the same genomes.

When the genome shape changes, bump the `KEY` version in `src/sim/storage.ts` — old saves are silently dropped.

## Wheel arms (visual struts)

Each wheel slot has an `armLength` gene. If the decoded value is ≥ `ARM_RENDER_MIN`, the wheel center is placed at `vertex + outwardNormal × armLength` — i.e., further out from the chassis vertex.

Physically, the wheel is still attached to the chassis by a single `RevoluteJoint` at the wheel center; there's no separate rod body. **A first attempt used a welded rod body + WheelJoint suspension and crashed planck's TOI solver** — the rod-weld-revolute chain became degenerate. The current approach is stable: physics behave exactly like a wheel directly on the chassis, just at an offset position. The renderer draws a line from the chassis vertex to the wheel center in the chassis's transform.

## Numerical-blow-up guards

Genomes with wide chassis ranges + long arms occasionally produce configurations the constraint solver can't stabilize, sending a body's position to infinity. Three guards prevent that from poisoning the rest of the simulation:

1. `SimWorld.step()` kills any car whose chassis x becomes non-finite or > 100,000 m.
2. `Population.advanceGeneration()` clamps each car's score to 0 if non-finite or > 1e6.
3. `storage.getTopScore()` and `updateTopScore()` reject non-finite / > 1e6 values, purging the stored key if a stale corrupt value is found.

These are last-line defences — the constraint solver should be the layer that prevents these states. Don't remove the guards without first investigating the underlying physics bug.

## Deferred work

- **Shock absorbers via `WheelJoint`**: the genome already carries `wheelSpring` and `wheelDamping` genes, but `car.ts` currently uses `RevoluteJoint` for stability. Re-enabling needs gentler spring/damping ranges, possibly lower motor torque, and careful interaction with the visual-only arm setup.

## Terrain

Generated by a seeded random walk with two dials (`roughness`, `maxSlope`, both 0..1).

Base mapping (at full ramp):
- `stepNoise` = 0.25 + roughness × 1.15 → **0.25 .. 1.40** per-step slope drift
- `clamp`     = 0.50 + maxSlope × 1.80 → **0.50 .. 2.30** absolute slope ceiling

Difficulty ramp by x (tightened in v3 — dials need to be visible at typical leader distances):
- x < 20m: 0.4× (just enough easing so gen-0 cars don't instantly flip at the spawn)
- x = 20..100m: ramps 0.4× → 1.0×
- x = 100..400m: 1.0× → 1.15×
- x = 400..800m: 1.15× → 1.4×
- x ≥ 800m: 1.4× (expert zone)

Helper: `difficultyRamp(x)` in `src/sim/terrain.ts`. Generates ~1500 segments × 1.4m = ~2 km of track. If cars ever evolve to need more, extend `SEGMENTS_DEFAULT`.

**Left apron**: cars spawn at x≈2 dropping from y=5, and a wide chassis or a leftward tip used to land vertices at x<0 (no ground → fell into the void). `generateTerrain` prepends a flat apron (`LEFT_RUNWAY` ≈ 16m at y=0) with a far-left vertical lip so the initial drop always has ground. It consumes no RNG, so determinism holds and the x≥0 track stays byte-identical — saved pops still resume on the same right-side terrain. Don't shorten the apron below the spawn margin.

**Important**: if you make the ramp gentler (lower starting multiplier, longer easing zone), the user's dials become invisible at the distances they actually see. We learned this the hard way in v2 — the dials looked broken because 100% roughness at x=80m was being scaled to ~30%.

`floor: 'fixed'` reuses the same terrain across generations. `floor: 'mutable'` re-seeds the terrain each generation (terrain seed becomes `<base>:terrain:<gen>`).

## Generation lifecycle

A generation ends when **either**:

1. All cars are dead (stall detector: a car making < 5 cm forward progress over 3 sim-seconds is killed — `STALL_TICK_LIMIT` in `world.ts`).
2. The optional `maxGenSeconds` time cap fires (configurable in the sidebar; **default `null` = no cap**).

Default is no cap so leaders can run as far as they evolve to. The stall detector is the real backstop — a stuck population will always end. Time cap is there if a user wants tight gen-per-minute pacing during fast mode.

`maxGenSeconds` updates live without rebuilding the Population — the step loop just reads `opts.maxGenSeconds` each tick.

## Visual tiers

`TERRAIN_TIERS` in `src/render/canvas.ts` maps milestone x positions (80 / 200 / 400 / 650 / 1000 m) to terrain colors via a horizontal canvas gradient. Adding a new tier = add an entry to that array. Each tier also gets a faint vertical tick + label drawn in world space.

## Persistence

`src/sim/storage.ts` writes to three separate `localStorage` keys:

| Key | Written when | Read when |
|---|---|---|
| `genetic-cars:saved-pop:v4` | User clicks "save" | User clicks "restore" |
| `genetic-cars:autosave:v4` | Every generation completion (in the RAF loop) | First mount — hydrates the initial Population so a refresh resumes |
| `genetic-cars:top-score:v1` | Whenever `pop.bestScore` exceeds the stored value | On mount, and live during the sim (displayed as "all-time" in the HUD) |

The autosave and manual-save keys are independent — manual save is a user-controlled checkpoint and never overwritten by autosave. Genome `Float32Array`/`Uint8Array` fields are serialized as `number[]` for JSON.

The snapshot bundles everything needed for byte-identical resume: seed, gravity, mutableFloor, roughness, maxSlope, maxGenSeconds, bestScore, bestGenome, plus the full population and history. `gravityKeyFromValue()` in `state/types.ts` reverses the numeric gravity back to the `GravityKey` enum.

**StrictMode gotcha**: the initial-hydrate effect runs twice in dev. We use a seed-match guard (`auto.seed === settings.seed`) instead of clearing the ref after use — clearing would let the second mount start from gen 0 and discard the restored state.

## Seeds

Every Population owns three derived seeds, all stamped from one user-facing seed string:
- `<seed>:ga` — the RNG that drives crossover, mutation, and selection.
- `<seed>:terrain` — the RNG that builds the terrain (fixed across generations when `floor: 'fixed'`).
- `<seed>:terrain:<gen>` — only used when `floor: 'mutable'`, so each generation gets a fresh terrain seed.

Same user seed + same params = byte-identical run. This is why we route every random call through an injected `Rng` function in `genome.ts`, `terrain.ts`, and `ga.ts` instead of touching `Math.random()`.

## 3D lab (a second, unlockable experience)

A 3D version of the same concept lives **alongside** the 2D lab. It evolves box-chassis
vehicles (up to 3 mirrored axles → 2/4/6 wheels) over 3D terrain. The 2D lab is unchanged.

- **Stack**: Three.js + React Three Fiber (render only) + **Rapier 3D** (`@dimforge/rapier3d-compat`).
  Mirrors the 2D architecture: the **sim owns and steps its own Rapier world** (`sim3d/world3d.ts`,
  no React); R3F (`ui3d/Scene3D.tsx`) only *reads body transforms* each frame via `useFrame`.
  We do **not** use `@react-three/rapier` (it couples physics to the render loop and breaks fast mode).
- **Modules**: `sim3d/` (genome3d, ga3d, terrain3d, car3d, world3d, population3d, storage3d — all
  pure, parallel to `sim/`), `state3d/` (Sim3DProvider + context + hook, mirrors `state/`), `ui3d/`
  (Scene3D, Hud3D, Sidebar3D). Shared UI lives in `ui/controls.tsx` + `ui/FitnessGraphCanvas.tsx`
  (both labs import them). `ga3d.ts` is a deliberate parallel of `ga.ts` (different genome shape).
- **Shell**: `App.tsx` is an `AppShell` holding `mode: '2d'|'3d'` + a header `[2D|3D]` switch
  (`ui/ModeSwitch.tsx`). `Lab2D`/`Lab3D` are the two experiences; `Lab3D` is **lazy-loaded**
  (`React.lazy`) so 2D sessions never download Three+Rapier (it's a separate ~3MB chunk).
- **Unlock gate**: 3D starts locked. `sim/unlock3d.ts` persists the flag; the 2D `SimProvider`
  gen-completion hook fires `shouldUnlock3d(gen, bestScore)` → `gen >= 20 || bestScore >= 500`, marks
  it, and dispatches a `window` `CustomEvent('genetic-cars:unlock-3d')`. `AppShell` listens, enables
  the switch, and shows `Unlock3DCelebration`.
- **Rapier init**: `Sim3DProvider` must `await RAPIER.init()` once before building `Population3D`
  (renders a "booting physics…" state until `ready`). StrictMode double-mounts the init effect — the
  `mounted` guard handles it.
- **Terrain is a TRIMESH, not a heightfield** (`terrain3d.ts` `terrainMeshData`). A Rapier heightfield's
  row/col layout was ambiguous and let **every car fall straight through the floor**. The trimesh is
  built from the *same vertices the renderer draws*, so the physics floor is exactly the visible floor.
  Don't switch back to a heightfield without solving that layout.
- **Free old worlds**: a fresh Rapier `World` is built every generation. `SimWorld3D.dispose()`
  (`world.free()`) is called via `Population3D.swapSim()` before each swap — without it the WASM heap
  grows unbounded over a long run.
- **Determinism**: `rapier3d-compat` is locally deterministic (same machine). Seeded GA + same machine
  → reproducible. Cross-device byte-identical would need the `-deterministic` build (a future swap, only
  needed for the headless-worker milestone, which is deferred).
- **Storage**: separate `genetic-cars-3d:*` localStorage namespace (`storage3d.ts`), independent of 2D.

## Conventions

- **No `any`, no `@ts-ignore`, no `eslint-disable`**. Strict TS. If a planck typing is wrong, narrow it locally with a typed wrapper.
- **Pure sim helpers** (genome/ga/terrain) take an RNG parameter (`() => number`) rather than calling `Math.random()` — this is what makes seeded runs reproducible.
- **Units**: planck works in meters at small magnitudes (a car is ~2m wide). Renderer applies a meters→pixels scale and a follow-camera transform; sim code never thinks in pixels.
- **Hot path**: avoid per-frame allocations inside the step loop. Reuse vectors, prefer typed arrays for per-car scratch state.
- **Comments**: only where the WHY is non-obvious (a planck quirk, a physics tuning constant, a non-intuitive GA choice). No JSDoc on components.
- **react-refresh**: keep hooks in their own files (`useSim.ts`), context definition separate from provider (`SimContext.ts` / `SimProvider.tsx`). Co-locating hooks and components breaks fast-refresh.

## Commands

- `bun run dev` — Vite dev server on :5173
- `bun run build` — `tsc -b` then `vite build`
- `bun run lint` — ESLint
- `bunx tsc -b` — full project typecheck (run after edits)

## Reference

- Original project: https://rednuht.org/genetic_cars_2/
- Original source (for inspiration only — we reimplement from scratch): https://github.com/red42/HTML5_Genetic_Cars
- planck.js docs: https://piqnt.com/planck.js/
