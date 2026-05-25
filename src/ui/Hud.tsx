type Stat = { label: string; value: string; accent?: string };

const STATS: Stat[] = [
  { label: 'generation', value: '—' },
  { label: 'alive', value: '—' },
  { label: 'best dist', value: '—', accent: 'text-accent-400' },
  { label: 'avg dist', value: '—' },
];

export function Hud() {
  return (
    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
      <div className="glass rounded-xl px-3 py-2 flex items-center gap-5 pointer-events-auto">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col leading-tight">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-500">
              {s.label}
            </span>
            <span className={`text-sm font-mono ${s.accent ?? 'text-ink-50'}`}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
      <div className="glass rounded-xl px-3 py-1.5 text-[11px] font-mono text-ink-300 pointer-events-auto">
        idle · waiting for sim
      </div>
    </div>
  );
}
