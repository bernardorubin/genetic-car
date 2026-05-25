import {
  TRACK_ORDER,
  TRACK_PRESETS,
  matchPreset,
  type TrackId,
} from '../sim/tracks';
import { useSim } from '../state/useSim';

const ACCENT_CLASSES: Record<string, string> = {
  cyan: 'text-accent-400 border-accent-500/40',
  lime: 'text-lime-400 border-lime-400/40',
  amber: 'text-amber-400 border-amber-400/40',
  rose: 'text-rose-400 border-rose-400/40',
  fuchsia: 'text-fuchsia-400 border-fuchsia-400/40',
  violet: 'text-violet-400 border-violet-400/40',
};

export function TrackPicker() {
  const { settings, setSetting } = useSim();
  const active = matchPreset(settings.gravity, settings.roughness, settings.maxSlope);

  const apply = (id: TrackId) => {
    if (id === 'custom') return; // custom is just the "you tweaked it" indicator
    const p = TRACK_PRESETS[id];
    setSetting('gravity', p.gravity);
    setSetting('roughness', p.roughness);
    setSetting('maxSlope', p.maxSlope);
    setSetting('obstacleDensity', p.obstacleDensity);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {TRACK_ORDER.map((id) => {
        const p = TRACK_PRESETS[id];
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
            <div className="text-[10px] text-ink-500 leading-tight mt-0.5">
              {p.blurb}
            </div>
          </button>
        );
      })}
    </div>
  );
}
