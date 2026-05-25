import { useState } from 'react';

export function Sidebar() {
  // Local state is scaffolding only — wired to the GA in the next chunk.
  const [mutationRate, setMutationRate] = useState(0.05);
  const [mutationSize, setMutationSize] = useState(0.2);
  const [elites, setElites] = useState(2);
  const [gravity, setGravity] = useState('earth');
  const [floor, setFloor] = useState('fixed');
  const [seed, setSeed] = useState('');

  return (
    <div className="p-5 flex flex-col gap-6">
      <section>
        <SectionHeading>evolution</SectionHeading>
        <Slider
          label="mutation rate"
          value={mutationRate}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={setMutationRate}
        />
        <Slider
          label="mutation size"
          value={mutationSize}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={setMutationSize}
        />
        <Slider
          label="elite clones"
          value={elites}
          min={0}
          max={10}
          step={1}
          format={(v) => `${v}`}
          onChange={setElites}
        />
      </section>

      <section>
        <SectionHeading>world</SectionHeading>
        <Select
          label="gravity"
          value={gravity}
          onChange={setGravity}
          options={[
            ['moon', 'Moon  ·  1.62'],
            ['mars', 'Mars  ·  3.71'],
            ['earth', 'Earth ·  9.81'],
            ['jupiter', 'Jupiter · 24.79'],
          ]}
        />
        <Select
          label="floor"
          value={floor}
          onChange={setFloor}
          options={[
            ['fixed', 'fixed terrain'],
            ['mutable', 'mutates per gen'],
          ]}
        />
        <div className="mt-3">
          <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ink-500 mb-1.5">
            world seed
          </label>
          <div className="flex gap-2">
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="auto"
              className="flex-1 hairline rounded-md bg-black/30 px-2.5 py-1.5 text-sm font-mono text-ink-50 placeholder:text-ink-500 focus:outline-none focus:border-accent-500/60"
            />
            <button className="hairline rounded-md px-3 py-1.5 text-xs font-mono text-ink-100 hover:bg-white/5 transition">
              regen
            </button>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>population</SectionHeading>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton>new pop</ActionButton>
          <ActionButton>view top</ActionButton>
          <ActionButton>save</ActionButton>
          <ActionButton>restore</ActionButton>
        </div>
      </section>

      <section>
        <SectionHeading>render</SectionHeading>
        <div className="flex items-center justify-between hairline rounded-md px-3 py-2">
          <span className="text-sm text-ink-100">draw simulation</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-accent-400">
            on
          </span>
        </div>
        <p className="mt-2 text-[11px] text-ink-500 leading-relaxed">
          turn off to let the population race in the background at hundreds of
          generations per minute.
        </p>
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

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="block text-[10px] font-mono uppercase tracking-[0.18em] text-ink-500 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

function ActionButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="hairline rounded-md px-3 py-2 text-xs font-mono text-ink-100 hover:bg-white/5 hover:border-white/15 transition">
      {children}
    </button>
  );
}
