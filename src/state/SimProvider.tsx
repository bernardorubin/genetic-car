import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Population } from '../sim/population';
import { hasSavedPopulation, loadPopulation, savePopulation } from '../sim/storage';
import { SimContext, type SimContextValue } from './SimContext';
import {
  DEFAULT_SETTINGS,
  EMPTY_STATS,
  GRAVITY_VALUES,
  POP_SIZE,
  type LiveStats,
  type SimSettings,
} from './types';

function makeSeed(): string {
  return Math.floor(Math.random() * 1e9).toString(36);
}

export function SimProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SimSettings>(() => ({
    ...DEFAULT_SETTINGS,
    seed: makeSeed(),
  }));
  const [stats, setStats] = useState<LiveStats>(EMPTY_STATS);

  const populationRef = useRef<Population | null>(null);
  const settingsRef = useRef(settings);
  const pendingRestoreRef = useRef<ReturnType<typeof loadPopulation>>(null);

  // Mirror settings into a ref for the RAF loop (which doesn't re-bind on every render).
  useEffect(() => {
    settingsRef.current = settings;
  });

  // Rebuild the Population when seed / gravity / floor changes.
  // Mutation params come from the ref so live-tuning them doesn't trigger a reset.
  useEffect(() => {
    const cur = settingsRef.current;
    const pop = new Population({
      size: POP_SIZE,
      seed: settings.seed,
      gravity: GRAVITY_VALUES[settings.gravity],
      mutableFloor: settings.floor === 'mutable',
      ga: {
        mutationRate: cur.mutationRate,
        mutationSize: cur.mutationSize,
        eliteCount: cur.eliteCount,
      },
    });
    populationRef.current = pop;
    if (pendingRestoreRef.current) {
      const saved = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      pop.loadGenomes(saved.genomes, saved.generation, saved.history);
    }
    // The RAF loop publishes fresh stats on its next tick.
  }, [settings.seed, settings.gravity, settings.floor]);

  // Push live GA params into the running population without resetting it.
  useEffect(() => {
    populationRef.current?.updateGAParams({
      mutationRate: settings.mutationRate,
      mutationSize: settings.mutationSize,
      eliteCount: settings.eliteCount,
    });
  }, [settings.mutationRate, settings.mutationSize, settings.eliteCount]);

  // Sim loop. Runs whether or not the canvas is rendering, so generations
  // keep ticking in "fast" mode where the canvas is blank.
  useEffect(() => {
    let raf = 0;
    let framesSinceUpdate = 0;
    const loop = () => {
      const pop = populationRef.current;
      if (pop) {
        const steps = settingsRef.current.render ? 2 : 12;
        for (let i = 0; i < steps; i++) {
          pop.step();
        }
        framesSinceUpdate++;
        if (framesSinceUpdate >= 6) {
          framesSinceUpdate = 0;
          const live = pop.liveStats();
          setStats({
            ...live,
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
      pop.loadGenomes(saved.genomes, saved.generation, saved.history);
    }
  }, []);

  const toggleReplay = useCallback(() => {
    const pop = populationRef.current;
    if (!pop) return;
    if (pop.replayMode) pop.exitReplay();
    else pop.enterReplay();
  }, []);

  const getPopulation = useCallback(() => populationRef.current, []);

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
    }),
    [settings, stats, getPopulation, setSetting, newPopulation, regenWorld, resetAll, save, restore, toggleReplay],
  );

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
