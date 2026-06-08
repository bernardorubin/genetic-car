import type { ReactNode } from 'react';
import { Sidebar } from './ui/Sidebar';
import { Hud } from './ui/Hud';
import { SimCanvas } from './ui/SimCanvas';
import { SimProvider } from './state/SimProvider';
import { WorldBadge } from './ui/WorldBadge';
import { AchievementToasts } from './ui/AchievementToasts';
import { RecordCelebration } from './ui/RecordCelebration';
import { MobileControls } from './ui/MobileControls';
import { InfoButton } from './ui/InfoButton';
import { useMediaQuery } from './ui/useMediaQuery';

export function Lab2D({ modeSwitch }: { modeSwitch?: ReactNode }) {
  // Below this width the 340px sidebar would starve the canvas, so we switch to
  // a full-bleed canvas + bottom-sheet controls. Rendered conditionally (not
  // just CSS-hidden) so the heavy Sidebar tree mounts in exactly one place.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <SimProvider>
      <div className="h-full w-full flex flex-col">
        <header
          className="flex items-center justify-between gap-3 px-4 lg:px-6 py-3 lg:py-4"
          style={
            isDesktop
              ? undefined
              : { paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }
          }
        >
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-ink-50 text-lg font-semibold tracking-tight whitespace-nowrap">
              genetic<span className="text-accent-400">.cars</span>
            </span>
            <span className="hidden md:inline text-ink-500 text-xs font-mono uppercase tracking-[0.18em]">
              evolutionary 2D vehicle lab
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-ink-300">
            <InfoButton mode="2d" />
            <div className="hidden lg:flex">
              <WorldBadge />
            </div>
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
            <SimCanvas />
            <Hud />
            <RecordCelebration />
            <AchievementToasts />
          </section>
          {isDesktop && (
            <aside className="glass rounded-2xl overflow-y-auto">
              <Sidebar />
            </aside>
          )}
        </main>

        {!isDesktop && (
          <MobileControls>
            <Sidebar />
          </MobileControls>
        )}
      </div>
    </SimProvider>
  );
}
