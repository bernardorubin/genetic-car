import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Lab2D } from './Lab2D';
import { ModeSwitch, type LabMode } from './ui/ModeSwitch';
import { Unlock3DCelebration } from './ui/Unlock3DCelebration';
import { UNLOCK_EVENT, isUnlocked3d } from './sim/unlock3d';

// The 3D lab pulls in Three.js + Rapier (a few MB), so it's loaded on demand —
// 2D-only sessions never download it.
const Lab3D = lazy(() => import('./Lab3D').then((m) => ({ default: m.Lab3D })));

export default function App() {
  const [mode, setMode] = useState<LabMode>('2d');
  const [unlocked3d, setUnlocked3d] = useState(isUnlocked3d);
  const [celebrate, setCelebrate] = useState(false);

  // The 2D SimProvider dispatches this event the first time a run hits the unlock
  // milestone. The shell owns the unlocked state so the header switch + celebration
  // stay decoupled from the 2D sim internals.
  useEffect(() => {
    const onUnlock = () => {
      setUnlocked3d(true);
      setCelebrate(true);
    };
    window.addEventListener(UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(UNLOCK_EVENT, onUnlock);
  }, []);

  const enter3d = useCallback(() => {
    setMode('3d');
    setCelebrate(false);
  }, []);

  const modeSwitch = (
    <ModeSwitch mode={mode} unlocked3d={unlocked3d} onChange={setMode} />
  );

  return (
    <>
      {mode === '2d' ? (
        <Lab2D modeSwitch={modeSwitch} />
      ) : (
        <Suspense fallback={<Lab3DLoading />}>
          <Lab3D modeSwitch={modeSwitch} />
        </Suspense>
      )}
      {celebrate && (
        <Unlock3DCelebration onEnter={enter3d} onDismiss={() => setCelebrate(false)} />
      )}
    </>
  );
}

function Lab3DLoading() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent-400">
          3D lab
        </div>
        <div className="mt-2 text-ink-300 text-sm font-mono">loading…</div>
      </div>
    </div>
  );
}
