import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Population } from '../sim/population';
import {
  autosavePopulation,
  getTopScore,
  hasSavedPopulation,
  loadAutosave,
  loadPopulation,
  savePopulation,
  updateTopScore,
} from '../sim/storage';
import { checkUnlocks, getUnlocked } from '../sim/achievements';
import {
  loadHallOfFame,
  submitToHall,
  type HallOfFameEntry,
} from '../sim/hallOfFame';
import { worldName } from './worldName';
import { SimContext, type AchievementToast, type SimContextValue } from './SimContext';
import {
  DEFAULT_SETTINGS,
  EMPTY_STATS,
  GRAVITY_VALUES,
  POP_SIZE,
  gravityKeyFromValue,
  type LiveStats,
  type SimSettings,
} from './types';

function makeSeed(): string {
  return Math.floor(Math.random() * 1e9).toString(36);
}

/**
 * Build the initial settings + (optional) autosave to hydrate from. Resolved
 * once at module load — there's only one SimProvider in the app and we want a
 * stable value that doesn't get re-derived during render.
 */
function bootstrapInitialState(): {
  settings: SimSettings;
  hydrate: ReturnType<typeof loadAutosave>;
} {
  const auto = typeof window === 'undefined' ? null : loadAutosave();
  if (auto) {
    return {
      settings: {
        ...DEFAULT_SETTINGS,
        seed: auto.seed,
        gravity: gravityKeyFromValue(auto.gravity),
        floor: auto.mutableFloor ? 'mutable' : 'fixed',
        roughness: auto.roughness,
        maxSlope: auto.maxSlope,
        maxGenSeconds: auto.maxGenSeconds,
      },
      hydrate: auto,
    };
  }
  return {
    settings: { ...DEFAULT_SETTINGS, seed: makeSeed() },
    hydrate: null,
  };
}

const BOOTSTRAP = bootstrapInitialState();

export function SimProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SimSettings>(BOOTSTRAP.settings);
  const [stats, setStats] = useState<LiveStats>(() => ({
    ...EMPTY_STATS,
    topScore: getTopScore(),
  }));

  const populationRef = useRef<Population | null>(null);
  const settingsRef = useRef(settings);
  const pendingRestoreRef = useRef<ReturnType<typeof loadPopulation>>(null);
  // First-mount hydration is one-shot; the first population-create effect consumes this.
  const initialHydrateRef = useRef(BOOTSTRAP.hydrate);

  const [toasts, setToasts] = useState<AchievementToast[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(() => getUnlocked());
  const unlockedRef = useRef(unlockedAchievements);
  useEffect(() => {
    unlockedRef.current = unlockedAchievements;
  }, [unlockedAchievements]);
  const toastKeyRef = useRef(0);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>(() => loadHallOfFame());
  const [recordCelebrations, setRecordCelebrations] = useState<{ key: number; score: number }[]>([]);
  const recordKeyRef = useRef(0);

  // Mirror settings into a ref for the RAF loop (which doesn't re-bind on every render).
  useEffect(() => {
    settingsRef.current = settings;
  });

  // Rebuild the Population when seed / gravity / floor / terrain shape changes.
  // Mutation params come from the ref so live-tuning them doesn't trigger a reset.
  useEffect(() => {
    const cur = settingsRef.current;
    const pop = new Population({
      size: POP_SIZE,
      seed: settings.seed,
      gravity: GRAVITY_VALUES[settings.gravity],
      mutableFloor: settings.floor === 'mutable',
      roughness: settings.roughness,
      maxSlope: settings.maxSlope,
      maxGenSeconds: cur.maxGenSeconds,
      ga: {
        mutationRate: cur.mutationRate,
        mutationSize: cur.mutationSize,
        eliteCount: cur.eliteCount,
      },
    });
    populationRef.current = pop;

    // Hydrate from autosave on first mount. We don't clear the ref after use —
    // StrictMode runs this effect twice in dev, and clearing would mean the second
    // run starts from gen 0. The seed-match check is what guards against
    // re-hydrating onto a population the user has since reseeded.
    const auto = initialHydrateRef.current;
    if (auto && auto.seed === settings.seed) {
      pop.loadGenomes(
        auto.genomes,
        auto.generation,
        auto.history,
        auto.bestScore,
        auto.bestGenome,
      );
    } else if (pendingRestoreRef.current) {
      const saved = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      pop.loadGenomes(
        saved.genomes,
        saved.generation,
        saved.history,
        saved.bestScore,
        saved.bestGenome,
      );
    }
    // The RAF loop publishes fresh stats on its next tick.
  }, [settings.seed, settings.gravity, settings.floor, settings.roughness, settings.maxSlope]);

  // Push live GA params into the running population without resetting it.
  useEffect(() => {
    populationRef.current?.updateGAParams({
      mutationRate: settings.mutationRate,
      mutationSize: settings.mutationSize,
      eliteCount: settings.eliteCount,
    });
  }, [settings.mutationRate, settings.mutationSize, settings.eliteCount]);

  // Live-update gen time limit (also no rebuild — just affects when step() force-ends).
  useEffect(() => {
    const pop = populationRef.current;
    if (pop) pop.opts.maxGenSeconds = settings.maxGenSeconds;
  }, [settings.maxGenSeconds]);

  // Sim loop. Runs whether or not the canvas is rendering, so generations
  // keep ticking in "fast" mode where the canvas is blank.
  useEffect(() => {
    let raf = 0;
    let framesSinceUpdate = 0;
    let topScoreCache = getTopScore();
    const loop = () => {
      const pop = populationRef.current;
      if (pop) {
        const steps = settingsRef.current.render ? 2 : 12;
        for (let i = 0; i < steps; i++) {
          const newGen = pop.step();
          if (newGen) {
            // A generation just finished + a new one started.
            // Autosave the current state and bump the all-time top score if needed.
            autosavePopulation(pop.snapshot());
            const prevTop = topScoreCache;
            topScoreCache = updateTopScore(pop.bestScore);
            if (topScoreCache > prevTop && prevTop > 0) {
              // Brand-new all-time record — fire a celebration event for the UI.
              const key = ++recordKeyRef.current;
              const scoreAtRecord = topScoreCache;
              setRecordCelebrations((prev) => [...prev, { key, score: scoreAtRecord }]);
            }

            // Submit to the Hall of Fame if this beats any existing entry.
            if (pop.bestGenome && Number.isFinite(pop.bestScore) && pop.bestScore > 0) {
              const newHall = submitToHall({
                score: pop.bestScore,
                generation: pop.generation,
                seed: pop.opts.seed,
                worldName: worldName(pop.opts.seed),
                genome: pop.bestGenome,
              });
              setHallOfFame(newHall);
            }

            // Check achievements with the latest gen's best (which is the last
            // entry pushed onto history before generation++).
            const lastGen = pop.history[pop.history.length - 1];
            const genBest = lastGen?.best ?? 0;
            const { newlyUnlocked, updated } = checkUnlocks(
              {
                population: pop,
                genBest,
                topScore: topScoreCache,
                generation: pop.generation,
              },
              unlockedRef.current,
            );
            if (newlyUnlocked.length > 0) {
              unlockedRef.current = updated;
              setUnlockedAchievements(updated);
              setToasts((prev) => [
                ...prev,
                ...newlyUnlocked.map((a) => ({
                  key: ++toastKeyRef.current,
                  achievement: a,
                })),
              ]);
            }
          }
        }
        framesSinceUpdate++;
        if (framesSinceUpdate >= 6) {
          framesSinceUpdate = 0;
          const live = pop.liveStats();
          setStats({
            ...live,
            topScore: topScoreCache,
            history: pop.history.slice(-100),
            replay: pop.replayMode,
            hasBestGenome: pop.bestGenome !== null,
            hasSaved: hasSavedPopulation(),
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const setSetting = useCallback(
    <K extends keyof SimSettings>(k: K, v: SimSettings[K]) => {
      setSettings((s) => ({ ...s, [k]: v }));
    },
    [],
  );

  const newPopulation = useCallback(() => {
    populationRef.current?.resetPopulation();
  }, []);

  const regenWorld = useCallback(() => {
    setSettings((s) => ({ ...s, seed: makeSeed() }));
  }, []);

  const resetAll = useCallback(() => {
    setSettings((s) => ({ ...DEFAULT_SETTINGS, seed: s.seed }));
  }, []);

  const save = useCallback(() => {
    const pop = populationRef.current;
    if (!pop) return;
    savePopulation(pop.snapshot());
  }, []);

  const restore = useCallback(() => {
    const pop = populationRef.current;
    const saved = loadPopulation();
    if (!pop || !saved) return;
    if (saved.seed !== settingsRef.current.seed) {
      pendingRestoreRef.current = saved;
      setSettings((s) => ({ ...s, seed: saved.seed }));
    } else {
      pop.loadGenomes(
        saved.genomes,
        saved.generation,
        saved.history,
        saved.bestScore,
        saved.bestGenome,
      );
    }
  }, []);

  const toggleReplay = useCallback(() => {
    const pop = populationRef.current;
    if (!pop) return;
    if (pop.replayMode) pop.exitReplay();
    else pop.enterReplay();
  }, []);

  const getPopulation = useCallback(() => populationRef.current, []);

  const dismissToast = useCallback((key: number) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }, []);

  const dismissRecordCelebration = useCallback((key: number) => {
    setRecordCelebrations((prev) => prev.filter((c) => c.key !== key));
  }, []);

  const replayGenome = useCallback((genome: HallOfFameEntry['genome']) => {
    const pop = populationRef.current;
    if (!pop) return;
    pop.enterReplayWith(genome);
  }, []);

  const value = useMemo<SimContextValue>(
    () => ({
      settings,
      stats,
      getPopulation,
      setSetting,
      newPopulation,
      regenWorld,
      resetAll,
      save,
      restore,
      toggleReplay,
      toasts,
      dismissToast,
      unlockedAchievements,
      hallOfFame,
      replayGenome,
      recordCelebrations,
      dismissRecordCelebration,
    }),
    [
      settings,
      stats,
      getPopulation,
      setSetting,
      newPopulation,
      regenWorld,
      resetAll,
      save,
      restore,
      toggleReplay,
      toasts,
      dismissToast,
      unlockedAchievements,
      hallOfFame,
      replayGenome,
      recordCelebrations,
      dismissRecordCelebration,
    ],
  );

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
