import { worldName } from '../state/worldName';
import { useSim3d } from '../state3d/useSim3d';

export function Hud3D() {
  const { stats, settings } = useSim3d();
  const running = settings.render;

  return (
    <>
      {/* Mobile: compact scoreboard. */}
      <div className="lg:hidden absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5 pointer-events-none">
        <div className="glass rounded-xl px-3 py-2 min-w-0 pointer-events-auto">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-300 truncate">
            {worldName(settings.seed)}
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 font-mono leading-none">
            <span className="text-ink-50 text-sm">gen {stats.generation}</span>
            <span className="text-ink-500 text-[11px]">
              {stats.alive}/{stats.total} alive
            </span>
          </div>
        </div>
        <div className="glass rounded-xl px-3 py-2 flex flex-col items-end pointer-events-auto">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-500">best</span>
          <div className="font-mono text-accent-400 leading-none mt-1">
            <span className="text-xl">{stats.best.toFixed(1)}</span>
            <span className="text-sm text-ink-500">m</span>
          </div>
          <div className="text-[10px] font-mono text-amber-400 leading-none mt-1">
            all-time {stats.topScore.toFixed(1)}m
          </div>
        </div>
      </div>

      {/* Desktop: full readout. */}
      <div className="hidden lg:flex absolute top-3 left-3 right-3 items-center justify-between pointer-events-none">
        <div className="glass rounded-xl px-3 py-2 flex items-center gap-5 pointer-events-auto">
          <Stat label="generation" value={stats.generation.toString()} />
          <Stat label="alive" value={`${stats.alive}/${stats.total}`} />
          <Stat label="best dist" value={`${stats.best.toFixed(1)} m`} accent="text-accent-400" />
          <Stat label="avg dist" value={`${stats.avg.toFixed(1)} m`} />
        </div>
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-500">all-time</span>
            <span className="text-sm font-mono text-amber-400">{stats.topScore.toFixed(1)} m</span>
          </div>
          <div className="glass rounded-xl px-3 py-1.5 text-[11px] font-mono text-ink-300 flex items-center gap-2">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${running ? 'bg-lime-400' : 'bg-amber-400'}`}
            />
            {running ? 'running · 2x' : 'fast · 12x · no render'}
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-500">{label}</span>
      <span className={`text-sm font-mono ${accent ?? 'text-ink-50'}`}>{value}</span>
    </div>
  );
}
