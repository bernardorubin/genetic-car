# genetic.cars

A modern, from-scratch reimagining of [HTML5 Genetic Cars](https://rednuht.org/genetic_cars_2/) — the spiritual successor to BoxCar2D. A genetic algorithm evolves 2D vehicles (with up to four wheels) across generations on procedurally-generated terrain. Tweak the mutation knobs, swap planets, save/replay your best designs.

Built with Bun, Vite, React 19, TypeScript, Tailwind v4, and [planck.js](https://piqnt.com/planck.js/) (a pure-JS Box2D port).

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
- **Reproducible runs** — every seeded option produces a byte-identical evolution. Share a seed and someone else gets the same world and the same outcomes.
- **Replay best ever** — pause evolution and watch the fittest genome solo on the terrain.
- **Fast mode** — turn rendering off and let the population race through ~50+ generations per minute in the background.
- **Auto-save + auto-resume** — every generation snapshot is written to `localStorage`; refresh the page and the sim picks up exactly where it left off (same seed, same generation, same population).
- **All-time top score** — best distance ever, persisted across sessions, shown in the HUD.
- **Manual save / restore** — a separate checkpoint slot if you want to roll back to a specific run later.
- **Beefier motors** — torque tuned so cars can actually climb the cliffs the jagged terrain produces.

## Architecture

No backend, no database, no API calls. Everything runs in the browser:

- `src/sim/*` — pure simulation (genome, GA, terrain, physics wrapper). No React, no DOM.
- `src/render/canvas.ts` — draws the simulation onto a `<canvas>`.
- `src/state/*` — React glue that owns the `Population` instance and drives the per-frame loop.
- `src/ui/*` — React components for the controls, HUD, and graph.

See [`CLAUDE.md`](./CLAUDE.md) for the deeper architecture write-up (boundary rules, seed scheme, genome spec, terrain ramp, etc).

## Credits

Inspired by [HTML5 Genetic Cars](https://github.com/red42/HTML5_Genetic_Cars) by red42 and the original [BoxCar2D](http://www.boxcar2d.com/) by Ben Lewis-Evans.
