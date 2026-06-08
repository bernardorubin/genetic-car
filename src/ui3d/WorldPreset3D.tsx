import {
  WORLD_ORDER_3D,
  WORLD_PRESETS_3D,
  matchWorld3d,
  type WorldId,
} from '../sim3d/worldPresets3d';
import { useSim3d } from '../state3d/useSim3d';

const ACCENT_CLASSES: Record<string, string> = {
  cyan: 'text-accent-400 border-accent-500/40',
  lime: 'text-lime-400 border-lime-400/40',
  amber: 'text-amber-400 border-amber-400/40',
  rose: 'text-rose-400 border-rose-400/40',
};

export function WorldPreset3D() {
  const { settings, setSetting } = useSim3d();
  const active = matchWorld3d(
    settings.gravity,
    settings.roughness,
    settings.maxSlope,
    settings.trackWidth,
  );

  const apply = (id: WorldId) => {
    if (id === 'custom') return; // custom is just the "you tweaked it" indicator
    const p = WORLD_PRESETS_3D[id];
    setSetting('gravity', p.gravity);
    setSetting('roughness', p.roughness);
    setSetting('maxSlope', p.maxSlope);
    setSetting('trackWidth', p.trackWidth);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {WORLD_ORDER_3D.map((id) => {
        const p = WORLD_PRESETS_3D[id];
        const isActive = active === id;
        const accent = ACCENT_CLASSES[p.accent] ?? ACCENT_CLASSES.cyan;
        return (
          <button
            key={id}
            onClick={() => apply(id)}
            disabled={id === 'custom'}
            className={`text-left hairline rounded-md px-2.5 py-1.5 transition ${
              isActive
                ? `bg-white/5 ${accent}`
                : id === 'custom'
                  ? 'text-ink-500 cursor-default'
                  : 'text-ink-100 hover:bg-white/5'
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono">{p.label}</span>
              {isActive && (
                <span className="text-[9px] font-mono uppercase tracking-[0.18em] opacity-70">
                  active
                </span>
              )}
            </div>
            <div className="text-[10px] text-ink-500 leading-tight mt-0.5">{p.blurb}</div>
          </button>
        );
      })}
    </div>
  );
}
