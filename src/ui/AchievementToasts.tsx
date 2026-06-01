import { useEffect } from 'react';
import { useSim } from '../state/useSim';

const TOAST_DURATION_MS = 4500;

export function AchievementToasts() {
  const { toasts, dismissToast } = useSim();

  useEffect(() => {
    if (toasts.length === 0) return;
    // Each toast self-dismisses; we set timers for any new ones.
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismissToast(t.key), TOAST_DURATION_MS),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 w-[min(22rem,calc(100vw-1.5rem))] flex flex-col items-center gap-2 pointer-events-none z-10">
      {toasts.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => dismissToast(t.key)}
          className="achievement-toast glass rounded-xl px-4 py-2.5 w-full flex items-center gap-3 pointer-events-auto hover:bg-white/5 transition"
          style={{ animation: 'achievement-slide 320ms cubic-bezier(.2,.7,.3,1)' }}
        >
          <span className="text-lg leading-none">★</span>
          <div className="text-left">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-400">
              achievement unlocked
            </div>
            <div className="text-sm font-semibold text-ink-50 leading-tight">
              {t.achievement.title}
            </div>
            <div className="text-[11px] text-ink-300 leading-tight mt-0.5">
              {t.achievement.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
