import { useEffect } from 'react';
import { BetaBadge } from './BetaBadge';
import type { LabMode } from './ModeSwitch';

/**
 * "Field guide" explainer. Answers the first-timer question — "what am I even
 * looking at?" — then explains the controls and the GA underneath. Mode-aware:
 * the 2D and 3D labs share the concept but differ in body plan and controls.
 */
export function InfoModal({ mode, onClose }: { mode: LabMode; onClose: () => void }) {
  const is3d = mode === '3d';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-950/70 backdrop-blur-sm"
      />

      <div
        className="relative glass-strong flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl"
        style={{ animation: 'achievement-slide 320ms cubic-bezier(.2,.7,.3,1)' }}
      >
        {/* Header — sits above the scroll area so the title + close stay pinned. */}
        <div className="relative px-6 pt-5 pb-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent-400">
            field guide
          </div>
          <h2
            id="info-modal-title"
            className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-ink-50"
          >
            How genetic<span className="-ml-2 text-accent-400">.cars</span> works
            {is3d && <BetaBadge className="translate-y-px" />}
          </h2>
          <GeneStrip />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-md text-ink-300 transition hover:bg-white/5 hover:text-ink-50"
          >
            <span aria-hidden className="text-base leading-none">×</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <Section title="what am i watching?">
            <p>
              Every car is a little machine spelled out by a string of <Em>genes</Em>
              {is3d ? (
                <>
                  {' '}— a box chassis plus up to three mirrored axles (so 2, 4, or 6
                  wheels), each with its own size, position, and power.
                </>
              ) : (
                <>
                  {' '}— its body shape, how many wheels it has (up to four), where they
                  mount, how big they are, and how much power each one gets.
                </>
              )}{' '}
              A fresh population of random cars all attempt the terrain at once.
            </p>
            <p>
              When the round ends, the cars that traveled <Em>furthest</Em> are the most
              likely to become parents. Two parents' genes get shuffled together — each
              gene taken from one or the other — then nudged by a bit of random{' '}
              <Em>mutation</Em>. The very best designs are also copied across{' '}
              <Em>untouched</Em>, so progress is never thrown away.
            </p>
            <p>
              Do that generation after generation and the population creeps further down
              the track. It's natural selection, sped way up — nobody designs the cars,
              they get <Em>discovered</Em>.
            </p>
          </Section>

          <Section title="the controls">
            <DefList items={controlsFor(is3d)} />
          </Section>

          <Section title="under the hood">
            <DefList items={mechanicsFor(is3d)} />
            <p className="mt-3">
              Every random draw flows through a single <Em>seed</Em>, so the same seed and
              the same dials replay byte-for-byte. That's why a run is shareable — paste
              someone's seed and you get their exact world and evolution.
            </p>
            {is3d && (
              <p className="mt-3 rounded-md border border-lime-400/20 bg-lime-400/[0.04] px-3 py-2 text-lime-200/80">
                The 3D lab is <Em>beta</Em>. Physics run on Rapier and determinism holds
                per machine — expect the occasional rough edge while it matures.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/** Decorative "gene sequence" strip — a fixed pattern so it never reflows on render. */
function GeneStrip() {
  // height (0..1) + color slot per bar; hand-tuned to look like a gene readout.
  const bars = [
    [0.5, 0], [0.8, 0], [0.35, 2], [1, 1], [0.6, 0], [0.45, 0], [0.9, 0], [0.3, 2],
    [0.7, 1], [0.55, 0], [0.85, 0], [0.4, 0], [1, 1], [0.5, 2], [0.65, 0], [0.95, 0],
    [0.45, 0], [0.75, 1], [0.35, 0], [0.6, 0], [0.5, 2], [0.85, 0], [0.4, 1], [0.7, 0],
    [0.55, 0], [0.9, 0], [0.45, 2], [0.65, 0],
  ] as const;
  const tone = ['bg-accent-500/45', 'bg-lime-400/60', 'bg-ink-500/50'];
  return (
    <div aria-hidden className="mt-3 flex h-3 items-end gap-[2px] overflow-hidden">
      {bars.map(([h, c], i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full ${tone[c]}`}
          style={{ height: `${Math.round(h * 100)}%` }}
        />
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-4">
      <h3 className="mb-2 text-[10px] font-mono uppercase tracking-[0.22em] text-ink-500">
        {title}
      </h3>
      <div className="space-y-2.5 text-[13px] leading-relaxed text-ink-100">{children}</div>
    </section>
  );
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-50 font-medium">{children}</span>;
}

function DefList({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <dl className="space-y-2">
      {items.map(([term, desc]) => (
        <div key={term} className="flex flex-col gap-0.5">
          <dt className="text-xs font-mono uppercase tracking-[0.14em] text-accent-400">
            {term}
          </dt>
          <dd className="text-[13px] leading-snug text-ink-300">{desc}</dd>
        </div>
      ))}
    </dl>
  );
}

function controlsFor(is3d: boolean): readonly (readonly [string, string])[] {
  const wheelWord = is3d ? 'axle' : 'wheel';
  return [
    ['mutation rate', 'How often each gene changes in a child. Higher = faster but noisier evolution.'],
    ['mutation size', 'How far a gene jumps when it does mutate. Small = fine-tuning, large = bold leaps.'],
    ['elite clones', `Top N cars copied forward unchanged each generation — protects your best designs.`],
    ['evolve wheel power', `Let each ${wheelWord} find its own motor torque. Off = everyone gets the same power.`],
    ['gravity', 'Moon through Jupiter. Changes climbing grip and how much air a car catches.'],
    ...(is3d
      ? []
      : ([['floor', 'Fixed reuses one track every gen; mutates rolls a fresh track each gen.']] as const)),
    ['roughness · max slope', 'How jagged the terrain is step-to-step, and a ceiling on how steep it can get.'],
    ...(is3d
      ? []
      : ([['obstacles', 'Density of spike pits and ramps sprinkled in past 60m.']] as const)),
    ['world seed', 'Same seed = same track and same run, every time. Shareable.'],
    ['save · restore · view top', 'Checkpoint a run, bring it back later, or watch the best car so far replay solo.'],
    ['draw simulation', 'Turn rendering off to let the population evolve in the background much faster.'],
    ...(is3d
      ? []
      : ([['favorite', "Pin a car you like — it's preserved and gets extra weight when picking parents."]] as const)),
  ];
}

function mechanicsFor(is3d: boolean): readonly (readonly [string, string])[] {
  return [
    ['selection · tournament', 'To pick each parent, three cars are drawn at random and the fittest wins. Strong cars get chosen often, but the weakest are never fully shut out.'],
    ['crossover · uniform', 'Every gene is inherited independently from one parent or the other — a coin flip per gene, not a single split point.'],
    ['mutation', 'Each gene rolls against the rate; when it hits, it shifts by the size. Body genes mutate a little harder so dramatic shapes survive longer.'],
    ['elitism', is3d
      ? 'The top genomes carry over verbatim so a great design is never lost to a bad roll.'
      : 'The top genomes (and your favorite, if set) carry over verbatim so a great design is never lost to a bad roll.'],
    ['the genome', is3d
      ? 'Each car is a box chassis sized in 3D plus up to three mirrored axles — wheel size, track width, and power per axle.'
      : '41 genes per car: 8 chassis radii plus a radius, mount point, density, power, and on/off switch for each wheel slot.'],
  ];
}
