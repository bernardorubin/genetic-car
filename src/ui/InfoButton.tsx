import { useRef, useState } from 'react';
import { InfoModal } from './InfoModal';
import type { LabMode } from './ModeSwitch';

/** Header "?" affordance that opens the field-guide explainer. Owns its own open
 * state so each lab shell just drops in <InfoButton mode={...} />. */
export function InfoButton({ mode }: { mode: LabMode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="How it works"
        className="hairline flex items-center gap-1.5 rounded-md px-2 py-1 text-ink-300 transition hover:bg-white/5 hover:text-ink-50"
      >
        <span
          aria-hidden
          className="grid h-4 w-4 place-items-center rounded-full border border-current text-[9px] leading-none"
        >
          ?
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.18em] md:inline">
          how it works
        </span>
      </button>
      {open && <InfoModal mode={mode} onClose={close} />}
    </>
  );
}
