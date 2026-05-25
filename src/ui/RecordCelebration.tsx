import { useEffect } from 'react';
import { useSim } from '../state/useSim';

const DURATION_MS = 1100;

export function RecordCelebration() {
  const { recordCelebrations, dismissRecordCelebration } = useSim();

  useEffect(() => {
    if (recordCelebrations.length === 0) return;
    const timers = recordCelebrations.map((c) =>
      window.setTimeout(() => dismissRecordCelebration(c.key), DURATION_MS),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [recordCelebrations, dismissRecordCelebration]);

  if (recordCelebrations.length === 0) return null;
  // Only render the most recent — stacked records flash sequentially as the
  // older ones time out.
  const c = recordCelebrations[recordCelebrations.length - 1];

  return (
    <>
      <div key={`flash-${c.key}`} className="record-flash" />
      <div
        key={`label-${c.key}`}
        className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center"
        style={{ animation: 'achievement-slide 320ms cubic-bezier(.2,.7,.3,1)' }}
      >
        <div className="glass rounded-2xl px-5 py-3 flex flex-col items-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-400">
            new all-time record
          </div>
          <div className="mt-1 text-2xl font-semibold text-ink-50 tracking-tight">
            {c.score.toFixed(1)} m
          </div>
        </div>
      </div>
    </>
  );
}
