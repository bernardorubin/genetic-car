// Shared sidebar control primitives, used by both the 2D and 3D labs. Pure
// presentational components — no sim/physics imports.

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-ink-500 mb-3">
      {children}
    </h2>
  );
}

/** Muted one-line helper text under a control. */
export function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-[10px] font-mono text-ink-500 leading-relaxed">{children}</p>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  description,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  description?: string;
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
      {description && <FieldHint>{description}</FieldHint>}
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  description,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  description?: string;
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
      {description && <FieldHint>{description}</FieldHint>}
    </div>
  );
}

export function Toggle({
  label,
  value,
  onToggle,
  onLabel = 'on',
  offLabel = 'off',
  activeColor = 'text-accent-400',
  inactiveColor = 'text-ink-500',
  description,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  onLabel?: string;
  offLabel?: string;
  activeColor?: string;
  inactiveColor?: string;
  description?: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between hairline rounded-md px-3 py-2 hover:bg-white/5 transition"
      >
        <span className="text-sm text-ink-100">{label}</span>
        <span
          className={`text-[10px] font-mono uppercase tracking-[0.18em] ${
            value ? activeColor : inactiveColor
          }`}
        >
          {value ? onLabel : offLabel}
        </span>
      </button>
      {description && <FieldHint>{description}</FieldHint>}
    </div>
  );
}

export function ActionButton({
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
