import type { FloorMode, GravityKey } from '../state/types';
import { useSim } from '../state/useSim';
import { FitnessGraph } from './FitnessGraph';
import { HallOfFame } from './HallOfFame';
import { AchievementsList } from './AchievementsList';
import { TrackPicker } from './TrackPicker';
import { FavoritePicker } from './FavoritePicker';
import { ShareBar } from './ShareBar';

export function Sidebar() {
  const { settings, stats, setSetting, newPopulation, regenWorld, save, restore, toggleReplay } = useSim();

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
        />
        <Slider
          label="mutation size"
          value={settings.mutationSize}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setSetting('mutationSize', v)}
        />
        <Slider
          label="elite clones"
          value={settings.eliteCount}
          min={0}
          max={10}
          step={1}
          format={(v) => `${v}`}
          onChange={(v) => setSetting('eliteCount', v)}
        />
        <Select<string>
          label="max gen length"
          value={settings.maxGenSeconds === null ? 'none' : String(settings.maxGenSeconds)}
          onChange={(v) =>
            setSetting('maxGenSeconds', v === 'none' ? null : Number(v))
          }
          options={[
            ['30', '30 seconds'],
            ['60', '1 minute'],
            ['120', '2 minutes'],
            ['300', '5 minutes'],
            ['none', 'no limit'],
          ]}
        />
        <p className="-mt-1 text-[10px] font-mono text-ink-500">
          stall detector still ends idle gens
        </p>
      </section>

      <section>
        <SectionHeading>track</SectionHeading>
        <TrackPicker />
        <p className="mt-2 text-[10px] font-mono text-ink-500 leading-relaxed">
          presets bulk-set gravity, terrain, and obstacles. tweak below to enter "custom".
        </p>
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
        />
        <Select<FloorMode>
          label="floor"
          value={settings.floor}
          onChange={(v) => setSetting('floor', v)}
          options={[
            ['fixed', 'fixed terrain'],
            ['mutable', 'mutates per gen'],
          ]}
        />
        <Slider
          label="roughness"
          value={settings.roughness}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setSetting('roughness', v)}
        />
        <Slider
          label="max slope"
          value={settings.maxSlope}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={(v) => setSetting('maxSlope', v)}
        />
        <Slider
          label="obstacles"
          value={settings.obstacleDensity}
          min={0}
          max={0.3}
          step={0.005}
          format={(v) => `${(v * 100).toFixed(1)}%`}
          onChange={(v) => setSetting('obstacleDensity', v)}
        />
        <p className="-mt-1 mb-3 text-[10px] font-mono text-ink-500">
          spike pits + ramps sprinkled past 60m
        </p>
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
          <ShareBar />
        </div>
      </section>

      <section>
        <SectionHeading>population</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={newPopulation}>new pop</ActionButton>
          <ActionButton
            onClick={toggleReplay}
            disabled={!stats.hasBestGenome}
            highlight={stats.replay}
          >
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
        <button
          onClick={() => setSetting('render', !settings.render)}
          className="w-full flex items-center justify-between hairline rounded-md px-3 py-2 hover:bg-white/5 transition"
        >
          <span className="text-sm text-ink-100">draw simulation</span>
          <span
            className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
              settings.render ? 'text-accent-400' : 'text-amber-400'
            }`}
          >
            {settings.render ? 'on' : 'off · fast'}
          </span>
        </button>
        <p className="mt-2 text-[11px] text-ink-500 leading-relaxed">
          turn off to let the population race in the background at higher speed.
        </p>
      </section>

      <section>
        <SectionHeading>fitness · last 100 gens</SectionHeading>
        <FitnessGraph />
      </section>

      <section>
        <SectionHeading>favorite · breeding boost</SectionHeading>
        <FavoritePicker />
      </section>

      <section>
        <SectionHeading>hall of fame</SectionHeading>
        <HallOfFame />
      </section>

      <section>
        <SectionHeading>achievements</SectionHeading>
        <AchievementsList />
      </section>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-ink-500 mb-3">
      {children}
    </h2>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-ink-300">{label}</span>
        <span className="text-xs font-mono text-ink-50">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent-500"
      />
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ink-500 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full hairline rounded-md bg-black/30 px-2.5 py-1.5 text-sm font-mono text-ink-50 focus:outline-none focus:border-accent-500/60"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className="bg-ink-900">
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  highlight,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`hairline rounded-md px-3 py-2 text-xs font-mono transition
        ${
          disabled
            ? 'text-ink-500 cursor-not-allowed opacity-60'
            : highlight
              ? 'text-amber-400 border-amber-400/40 bg-amber-400/5 hover:bg-amber-400/10'
              : 'text-ink-100 hover:bg-white/5 hover:border-white/15'
        }`}
    >
      {children}
    </button>
  );
}
