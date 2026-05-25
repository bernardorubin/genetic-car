# genetic.cars

A from-scratch modernization of [HTML5 Genetic Cars](https://rednuht.org/genetic_cars_2/) (spiritual successor to BoxCar2D). A genetic algorithm evolves 2D two-wheeled vehicles across generations on procedurally-generated terrain. The user can tweak mutation/selection knobs per generation and watch evolution play out.

## Stack

- **Runtime / pkg manager**: Bun (`bun install`, `bun run dev`). Never use npm/yarn/pnpm here.
- **App**: Vite + React 19 + TypeScript (strict).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`. Theme tokens live in `src/index.css` under `@theme`. Custom `glass` and `hairline` utilities are defined with `@utility` in the same file.
- **Physics**: `planck` (pure-JS Box2D 2.3 port). Deterministic when paired with `seedrandom` — use this for reproducible runs from a seed.
- **Charts**: rolled by hand on canvas. No charting lib.

## Module layout

```
src/
  App.tsx             # top-level layout shell
  main.tsx            # React entry
  index.css           # Tailwind theme + global styles
  sim/                # pure simulation domain — no React, no DOM
    genome.ts         # Genome type + random/mutate/crossover
    terrain.ts        # seeded floor generation
    car.ts            # Genome -> planck bodies + joints + wheel motors
    world.ts          # planck.World lifecycle, step loop, follow camera
    ga.ts             # population, fitness, selection, elitism
  render/
    canvas.ts         # draws a World snapshot to a Canvas2D context
  ui/                 # React components only
    SimCanvas.tsx     # mounts canvas + drives RAF loop
    Sidebar.tsx       # control panel
    Hud.tsx           # overlay stats
    FitnessGraph.tsx  # per-generation graph (added later)
```

**Boundary rule**: `sim/` and `render/` must not import React or anything from `ui/`. UI talks to the sim through a small imperative facade (the World object) — not via React state for hot-path data. Per-frame state (positions, scores) flows through the canvas directly; React state holds only UI knobs and per-generation summaries.

## Genome (working spec)

22 genes per car, all normalized floats in [0, 1] unless noted:

- 8 chassis vertices, each a (radius, angle) pair around the car center → 16 values, but commonly stored as 8 radii at fixed evenly-spaced angles (simpler, matches the original).
- 2 wheel radii.
- 2 wheel positions (which chassis vertex each wheel attaches to, 0–7).
- 2 wheel densities.
- 1 chassis density.

Wheel motors run at a constant torque/speed (not evolved in v1) so improvements come from morphology, not control.

## Conventions

- **No `any`, no `@ts-ignore`**. Strict TS. If a planck typing is wrong, narrow it locally with a typed wrapper.
- **Pure sim helpers** (genome/ga/terrain) take an RNG parameter (`() => number`) rather than calling `Math.random()` — this is what makes seeded runs reproducible.
- **Units**: planck works in meters at small magnitudes (a car is ~2m wide). Renderer applies a meters→pixels scale and a follow-camera transform; sim code never thinks in pixels.
- **Hot path**: avoid per-frame allocations inside the step loop. Reuse vectors, prefer typed arrays for per-car scratch state.
- **Comments**: only where the WHY is non-obvious (a planck quirk, a physics tuning constant, a non-intuitive GA choice). No JSDoc on components.

## Commands

- `bun run dev` — Vite dev server on :5173
- `bun run build` — `tsc -b` then `vite build`
- `bun run lint` — ESLint
- `bunx tsc -b` — full project typecheck (run after edits)

## Reference

- Original project: https://rednuht.org/genetic_cars_2/
- Original source (for inspiration only — we reimplement from scratch): https://github.com/red42/HTML5_Genetic_Cars
- planck.js docs: https://piqnt.com/planck.js/
