import { useRef, useState, type ReactNode } from 'react';

// Distance (px) the sheet must be dragged down before release dismisses it.
const DISMISS_THRESHOLD = 110;

// Bottom-sheet control surface for phones/tablets. The given sidebar content is
// reused verbatim inside a glass sheet that slides up over the simulation. The
// sheet stays mounted (translated off-screen when closed) so open/close both
// animate, and so the FitnessGraph canvas keeps a real measured width.
export function MobileControls({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  // `dragging` drives the render (transition is disabled mid-drag for 1:1 finger
  // tracking); the refs back the touch handlers without stale-closure issues.
  const [dragging, setDragging] = useState(false);
  const dragYRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);

  const setDrag = (y: number) => {
    dragYRef.current = y;
    setDragY(y);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    draggingRef.current = true;
    setDragging(true);
    startYRef.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const dy = e.touches[0].clientY - startYRef.current;
    setDrag(dy > 0 ? dy : 0);
  };

  const onTouchEnd = () => {
    draggingRef.current = false;
    setDragging(false);
    if (dragYRef.current > DISMISS_THRESHOLD) setOpen(false);
    setDrag(0);
  };

  return (
    <>
      {/* Floating "tune" trigger — bottom-right so it clears the centered
          achievement toasts and the home-indicator safe area. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open controls"
        aria-expanded={open}
        className={`fab-glow fixed z-30 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-2 rounded-full border border-accent-500/30 bg-ink-900/75 pl-3.5 pr-4 py-3 text-accent-300 backdrop-blur-md transition-all duration-300 active:scale-95 ${
          open ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <SlidersIcon />
        <span className="text-xs font-mono uppercase tracking-[0.18em] text-ink-50">
          tune
        </span>
      </button>

      {/* Scrim */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Controls"
        className="glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl"
        style={{
          transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: dragging
            ? 'none'
            : 'transform 360ms cubic-bezier(.22,.7,.24,1)',
        }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="shrink-0 cursor-grab touch-none select-none px-5 pt-3 pb-1 active:cursor-grabbing"
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
          <div className="mt-3 flex items-center justify-between">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.22em] text-ink-300">
              controls
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close controls"
              className="hairline flex h-7 w-7 items-center justify-center rounded-full text-ink-300 transition hover:bg-white/5 hover:text-ink-50"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </>
  );
}

function SlidersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="8" x2="20" y2="8" />
      <circle cx="9" cy="8" r="2.6" fill="currentColor" stroke="none" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="15" cy="16" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
