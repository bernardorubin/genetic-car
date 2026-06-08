# genetic.cars

A modern, from-scratch reimagining of [HTML5 Genetic Cars](https://rednuht.org/genetic_cars_2/) — the spiritual successor to BoxCar2D. A genetic algorithm evolves 2D vehicles (with up to four wheels) across generations on procedurally-generated terrain. Tweak the mutation knobs, swap planets, save/replay your best designs.

Reach **generation 20** (or send a car **500 m**) and a second experience unlocks: a **3D lab** that evolves box-chassis vehicles over 3D hills using the same genetic algorithm. The 2D lab is always there — flip between the two from the header.

Built with Bun, Vite, React 19, TypeScript, and Tailwind v4. The 2D lab uses [planck.js](https://piqnt.com/planck.js/) (a pure-JS Box2D port); the 3D lab uses [Three.js](https://threejs.org/) + [React Three Fiber](https://r3f.docs.pmnd.rs/) for rendering and [Rapier 3D](https://rapier.rs/) for physics.

## Run it

```bash
bun install
bun run dev      # http://localhost:5173
```

## Build for production

```bash
bun run build    # outputs to dist/
bun run preview  # serve dist/ locally
```

## Features

- **Up-to-4-wheel cars** — the GA evolves the wheel count on its own (each car has 4 slots, each with an "active" gene).
- **Visible wheel arms / struts** — each wheel has an arm-length gene; high values place the wheel at the end of a visible strut for alien-looking designs.
- **Wide chassis morphology** — each car has 8 polar chassis radii (0.1m – 1.8m, ~18× ratio) so evolved cars can grow real spikes and asymmetric blades, BoxCar2D-style — not just rounded hexagons.
- **Independently randomized wheel sizes** — every wheel slot rolls its own radius (0.2m – 0.5m), density, chassis attachment point, and arm length.
- **Named worlds** — every seed deterministically maps to a fun two-word name ("Velvet Vault", "Ember Drifter") shown in the header; your world is your world.
- **Procedural terrain** that gets harder the farther a car travels (`difficultyRamp(x)`).
- **Distance color tiers** — terrain shifts cyan → lime → amber → orange → rose → fuchsia at 80 / 200 / 400 / 650 / 1000 m so you can see how far your generations are pushing.
- **Live controls** — mutation rate / size, elite clones, max gen length (default: **no limit**), gravity (Moon → Jupiter), fixed vs mutable floor, terrain roughness + max slope, world seed.
- **Explained controls** — every slider and toggle carries a one-line description of what it actually does (what mutation rate vs mutation size means, what elite clones do, etc.).
- **Reproducible runs** — every seeded option produces a byte-identical evolution. Share a seed and someone else gets the same world and the same outcomes.
- **Replay best ever** — pause evolution and watch the fittest genome solo on the terrain.
- **Fast mode** — turn rendering off and let the population race through ~50+ generations per minute in the background.
- **Auto-save + auto-resume** — every generation snapshot is written to `localStorage`; refresh the page and the sim picks up exactly where it left off (same seed, same generation, same population).
- **All-time top score** — best distance ever, persisted across sessions, shown in the HUD.
- **Manual save / restore** — a separate checkpoint slot if you want to roll back to a specific run later.
- **Evolvable wheel power** — each wheel's motor torque is its own gene (60–260 N·m). A toggle switches between evolving torque per wheel and a uniform constant, so you can A/B "morphology only" against "morphology + drivetrain" evolution; toggling it preserves the current population.

## The 3D lab

The 3D lab is a second, **unlockable** experience that runs the same kind of genetic algorithm in three dimensions. It stays locked until a 2D run hits **generation 20 or 500 m** (whichever comes first) — then a celebration fires and a `3D` button appears in the header. Once earned, it stays unlocked.

- **"Cars that look like cars"** — a box chassis on up to three mirrored axles (so 2, 4, or 6 wheels) evolving its proportions, wheelbase, ride height, wheel size/placement, and per-axle motor power.
- **Drives forward over 3D hills** — seeded procedural terrain, a chase camera that follows the current leader, and the same fitness graph / HUD / sidebar knobs as the 2D lab.
- **Deterministic + reproducible** on a given machine (seeded GA + Rapier), with its own auto-save namespace.
- **Loaded on demand** — Three.js + Rapier ship in a separate chunk, so 2D-only sessions never download them.

## Architecture

No backend, no database, no API calls. Everything runs in the browser. The two labs share the same shape — pure simulation, React glue, and React UI — kept apart so each is self-contained:

**2D lab**
- `src/sim/*` — pure simulation (genome, GA, terrain, planck physics wrapper). No React, no DOM.
- `src/render/canvas.ts` — draws the simulation onto a `<canvas>`.
- `src/state/*` — React glue that owns the `Population` instance and drives the per-frame loop.

**3D lab** (parallel structure)
- `src/sim3d/*` — pure simulation that owns and steps its own Rapier world (no React).
- `src/state3d/*` — React glue (initializes Rapier, drives the step loop).
- `src/ui3d/*` — the React Three Fiber scene, HUD, and sidebar. R3F only *reads* body transforms each frame; the sim does the stepping.

**Shared**
- `src/ui/*` — controls, HUD, fitness graph, mobile sheet, and the `2D/3D` mode switch, reused by both labs.
- `src/App.tsx` — the shell that holds the mode + unlock state and lazy-loads the 3D lab.

See [`CLAUDE.md`](./CLAUDE.md) for the deeper architecture write-up (boundary rules, seed scheme, genome spec, terrain ramp, the 3D trimesh-terrain gotcha, etc).

## Credits

Inspired by [HTML5 Genetic Cars](https://github.com/red42/HTML5_Genetic_Cars) by red42 and the original [BoxCar2D](http://www.boxcar2d.com/) by Ben Lewis-Evans.
