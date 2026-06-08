/** One-shot overlay shown when the 3D lab unlocks. Offers a jump-straight-in button. */
export function Unlock3DCelebration({
  onEnter,
  onDismiss,
}: {
  onEnter: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="record-flash" />
      <div
        className="pointer-events-auto glass-strong rounded-2xl px-6 py-5 flex flex-col items-center gap-3 max-w-[24rem]"
        style={{ animation: 'achievement-slide 320ms cubic-bezier(.2,.7,.3,1)' }}
      >
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent-400">
          milestone reached
        </div>
        <div className="text-2xl font-semibold text-ink-50 tracking-tight">3D lab unlocked</div>
        <p className="text-[11px] font-mono text-ink-500 text-center leading-relaxed">
          evolve vehicles in three dimensions. switch anytime from the header.
        </p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onEnter}
            className="hairline rounded-md px-4 py-2 text-xs font-mono text-accent-400 border-accent-500/40 bg-accent-500/5 hover:bg-accent-500/10 transition"
          >
            enter 3D ↗
          </button>
          <button
            onClick={onDismiss}
            className="hairline rounded-md px-4 py-2 text-xs font-mono text-ink-300 hover:bg-white/5 transition"
          >
            later
          </button>
        </div>
      </div>
    </div>
  );
}
