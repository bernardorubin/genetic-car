import { BetaBadge } from './BetaBadge';

export type LabMode = '2d' | '3d';

/** Header segmented control to flip between the 2D and 3D labs. The 3D side stays
 * locked (padlock + hint) until the unlock milestone is earned in the 2D lab. */
export function ModeSwitch({
  mode,
  unlocked3d,
  onChange,
}: {
  mode: LabMode;
  unlocked3d: boolean;
  onChange: (m: LabMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 hairline rounded-md p-0.5 bg-black/20">
      <Seg active={mode === '2d'} onClick={() => onChange('2d')}>
        2D
      </Seg>
      <Seg
        active={mode === '3d'}
        locked={!unlocked3d}
        onClick={() => unlocked3d && onChange('3d')}
        title={
          unlocked3d
            ? 'Switch to the 3D lab (beta)'
            : 'Reach gen 20 or 500m in the 2D lab to unlock'
        }
      >
        {unlocked3d ? (
          <span className="flex items-center gap-1">
            3D
            <BetaBadge />
          </span>
        ) : (
          '🔒 3D'
        )}
      </Seg>
    </div>
  );
}

function Seg({
  active,
  locked,
  onClick,
  title,
  children,
}: {
  active: boolean;
  locked?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      title={title}
      aria-pressed={active}
      className={`rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] transition ${
        active
          ? 'bg-accent-500/15 text-accent-400'
          : locked
            ? 'text-ink-500 cursor-not-allowed'
            : 'text-ink-300 hover:text-ink-50 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
