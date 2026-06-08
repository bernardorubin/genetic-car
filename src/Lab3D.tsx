import type { ReactNode } from 'react';
import { Sim3DProvider } from './state3d/Sim3DProvider';
import { useSim3d } from './state3d/useSim3d';
import { Scene3D } from './ui3d/Scene3D';
import { Hud3D } from './ui3d/Hud3D';
import { Sidebar3D } from './ui3d/Sidebar3D';
import { MobileControls } from './ui/MobileControls';
import { useMediaQuery } from './ui/useMediaQuery';

export function Lab3D({ modeSwitch }: { modeSwitch?: ReactNode }) {
  return (
    <Sim3DProvider>
      <Lab3DInner modeSwitch={modeSwitch} />
    </Sim3DProvider>
  );
}

function Lab3DInner({ modeSwitch }: { modeSwitch?: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { ready, settings } = useSim3d();

  return (
    <div className="h-full w-full flex flex-col">
      <header
        className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 lg:py-4"
        style={isDesktop ? undefined : { paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-ink-50 text-lg font-semibold tracking-tight whitespace-nowrap">
            genetic<span className="text-accent-400">.cars</span>
          </span>
          <span className="hidden md:inline text-ink-500 text-xs font-mono uppercase tracking-[0.18em]">
            evolutionary 3D vehicle lab
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-ink-300">
          {modeSwitch}
          <a
            href="https://github.com/bernardorubin/genetic-car"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink-50 transition whitespace-nowrap"
          >
            github ↗
          </a>
        </div>
      </header>

      <main
        className={
          isDesktop
            ? 'flex-1 min-h-0 grid grid-cols-[1fr_340px] gap-4 px-6 pb-6'
            : 'flex-1 min-h-0 px-3 pb-3'
        }
      >
        <section className="relative glass rounded-2xl overflow-hidden h-full min-h-0">
          {!ready ? (
            <CenteredNote primary="booting physics…" secondary="initializing the 3D engine" />
          ) : settings.render ? (
            <>
              <Scene3D />
              <Hud3D />
            </>
          ) : (
            <>
              <CenteredNote primary="fast mode" secondary="evolving in the background · no render" />
              <Hud3D />
            </>
          )}
        </section>
        {isDesktop && ready && (
          <aside className="glass rounded-2xl overflow-y-auto">
            <Sidebar3D />
          </aside>
        )}
      </main>

      {!isDesktop && ready && (
        <MobileControls>
          <Sidebar3D />
        </MobileControls>
      )}
    </div>
  );
}

function CenteredNote({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-center">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent-400">
          3D lab
        </div>
        <div className="mt-2 text-ink-100 text-sm font-mono">{primary}</div>
        <div className="mt-1 text-ink-500 text-[11px] font-mono">{secondary}</div>
      </div>
    </div>
  );
}
