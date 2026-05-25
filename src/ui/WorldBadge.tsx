import { useSim } from '../state/useSim';
import { worldName } from '../state/worldName';

export function WorldBadge() {
  const { settings, stats } = useSim();
  const name = worldName(settings.seed);

  return (
    <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2.5">
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-500">
        your world
      </span>
      <span className="text-sm font-semibold tracking-tight text-ink-50">
        {name}
      </span>
      <span className="text-[10px] font-mono text-ink-500">
        · gen {stats.generation}
      </span>
    </div>
  );
}
