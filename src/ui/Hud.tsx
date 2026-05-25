import { useSim } from '../state/useSim';

export function Hud() {
  const { stats, settings } = useSim();

  return (
    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
      <div className="glass rounded-xl px-3 py-2 flex items-center gap-5 pointer-events-auto">
        <Stat label="generation" value={stats.generation.toString()} />
        <Stat label="alive" value={`${stats.alive}/${stats.total}`} />
        <Stat label="best dist" value={`${stats.best.toFixed(1)} m`} accent="text-accent-400" />
        <Stat label="avg dist" value={`${stats.avg.toFixed(1)} m`} />
      </div>
      <div className="glass rounded-xl px-3 py-1.5 text-[11px] font-mono text-ink-300 pointer-events-auto flex items-center gap-2">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${settings.render ? 'bg-lime-400' : 'bg-amber-400'}`} />
        {settings.render ? 'running · 2x' : 'fast · 12x · no render'}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-500">
        {label}
      </span>
      <span className={`text-sm font-mono ${accent ?? 'text-ink-50'}`}>{value}</span>
    </div>
  );
}
