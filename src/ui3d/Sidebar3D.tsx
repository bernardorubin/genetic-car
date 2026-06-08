import { useSim3d } from '../state3d/useSim3d';
import type { GravityKey } from '../state3d/types3d';
import {
  ActionButton,
  SectionHeading,
  Select,
  Slider,
  Toggle,
} from '../ui/controls';
import { FitnessGraphCanvas } from '../ui/FitnessGraphCanvas';

export function Sidebar3D() {
  const { settings, stats, setSetting, newPopulation, regenWorld, save, restore, toggleReplay } =
    useSim3d();

  return (
    <div className="p-5 flex flex-col gap-6">
      <section>
        <SectionHeading>evolution</SectionHeading>
        <Slider
          label="mutation rate"
          value={settings.mutationRate}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setSetting('mutationRate', v)}
          description="chance each gene changes in a child · higher = faster but noisier"
        />
        <Slider
          label="mutation size"
          value={settings.mutationSize}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setSetting('mutationSize', v)}
          description="how far a gene jumps when it mutates · small = fine-tune, large = bold leaps"
        />
        <Slider
          label="elite clones"
          value={settings.eliteCount}
          min={0}
          max={10}
          step={1}
          format={(v) => `${v}`}
          onChange={(v) => setSetting('eliteCount', v)}
          description="top N cars copied unchanged each gen · protects the best designs"
        />
        <Toggle
          label="evolve wheel power"
          value={settings.varyTorque}
          onToggle={() => setSetting('varyTorque', !settings.varyTorque)}
          description="each axle evolves its own motor torque · off = uniform power for all"
        />
        <Select<string>
          label="max gen length"
          value={settings.maxGenSeconds === null ? 'none' : String(settings.maxGenSeconds)}
          onChange={(v) => setSetting('maxGenSeconds', v === 'none' ? null : Number(v))}
          options={[
            ['15', '15 seconds'],
            ['25', '25 seconds'],
            ['45', '45 seconds'],
            ['90', '90 seconds'],
            ['none', 'no limit'],
          ]}
          description="hard time cap per generation · keeps evolution moving"
        />
      </section>

      <section>
        <SectionHeading>world</SectionHeading>
        <Select<GravityKey>
          label="gravity"
          value={settings.gravity}
          onChange={(v) => setSetting('gravity', v)}
          options={[
            ['moon', 'Moon  ·  1.62'],
            ['mars', 'Mars  ·  3.71'],
            ['earth', 'Earth ·  9.81'],
            ['jupiter', 'Jupiter · 24.79'],
          ]}
          description="downward pull · affects climbing grip and air time"
        />
        <Slider
          label="roughness"
          value={settings.roughness}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setSetting('roughness', v)}
          description="how jagged the forward hills are"
        />
        <Slider
          label="max slope"
          value={settings.maxSlope}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setSetting('maxSlope', v)}
          description="ceiling on hill steepness · lower = flatter"
        />
        <div className="mt-3">
          <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ink-500 mb-1.5">
            world seed
          </label>
          <div className="flex gap-2">
            <input
              value={settings.seed}
              onChange={(e) => setSetting('seed', e.target.value)}
              placeholder="auto"
              className="flex-1 hairline rounded-md bg-black/30 px-2.5 py-1.5 text-sm font-mono text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-accent-500/60"
            />
            <button
              onClick={regenWorld}
              className="hairline rounded-md px-3 py-1.5 text-xs font-mono text-ink-100 hover:bg-white/5 transition"
            >
              regen
            </button>
          </div>
          <p className="mt-1.5 text-[10px] font-mono text-ink-500">
            same seed · same terrain · same evolution
          </p>
        </div>
      </section>

      <section>
        <SectionHeading>population</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={newPopulation}>new pop</ActionButton>
          <ActionButton onClick={toggleReplay} disabled={!stats.hasBestGenome} highlight={stats.replay}>
            {stats.replay ? 'exit replay' : 'view top'}
          </ActionButton>
          <ActionButton onClick={save}>save</ActionButton>
          <ActionButton onClick={restore} disabled={!stats.hasSaved}>
            restore
          </ActionButton>
        </div>
        {stats.replay && (
          <p className="mt-2 text-[11px] font-mono text-amber-400">
            replay · running best ever · gens paused
          </p>
        )}
      </section>

      <section>
        <SectionHeading>render</SectionHeading>
        <Toggle
          label="draw simulation"
          value={settings.render}
          onToggle={() => setSetting('render', !settings.render)}
          offLabel="off · fast"
          inactiveColor="text-amber-400"
          description="turn off to let the population evolve in the background at higher speed"
        />
      </section>

      <section>
        <SectionHeading>fitness · last 100 gens</SectionHeading>
        <FitnessGraphCanvas history={stats.history} />
      </section>
    </div>
  );
}
