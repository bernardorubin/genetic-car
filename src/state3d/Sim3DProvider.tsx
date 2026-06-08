import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import RAPIER from '@dimforge/rapier3d-compat';
import { Population3D } from '../sim3d/population3d';
import {
  autosavePopulation3d,
  getTopScore3d,
  hasSavedPopulation3d,
  loadAutosave3d,
  loadPopulation3d,
  savePopulation3d,
  updateTopScore3d,
} from '../sim3d/storage3d';
import { Sim3DContext, type Sim3DContextValue } from './Sim3DContext';
import {
  DEFAULT_SETTINGS_3D,
  EMPTY_STATS_3D,
  GRAVITY_VALUES,
  POP_SIZE_3D,
  gravityKeyFromValue,
  type LiveStats3D,
  type Sim3DSettings,
} from './types3d';

function makeSeed(): string {
  return Math.floor(Math.random() * 1e9).toString(36);
}

function bootstrapSettings(): { settings: Sim3DSettings; hydrate: ReturnType<typeof loadAutosave3d> } {
  const auto = typeof window === 'undefined' ? null : loadAutosave3d();
  if (auto) {
    return {
      settings: {
        ...DEFAULT_SETTINGS_3D,
        seed: auto.seed,
        gravity: gravityKeyFromValue(auto.gravity),
        floor: auto.mutableFloor ? 'mutable' : 'fixed',
        roughness: auto.roughness,
        maxSlope: auto.maxSlope,
        maxGenSeconds: auto.maxGenSeconds,
        varyTorque: auto.varyTorque,
      },
      hydrate: auto,
    };
  }
  return { settings: { ...DEFAULT_SETTINGS_3D, seed: makeSeed() }, hydrate: null };
}

const BOOTSTRAP = bootstrapSettings();

export function Sim3DProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Sim3DSettings>(BOOTSTRAP.settings);
  const [stats, setStats] = useState<LiveStats3D>(() => ({
    ...EMPTY_STATS_3D,
    topScore: getTopScore3d(),
  }));
  const [ready, setReady] = useState(false);

  const populationRef = useRef<Population3D | null>(null);
  const settingsRef = useRef(settings);
  const pendingRestoreRef = useRef<ReturnType<typeof loadPopulation3d>>(null);
  const initialHydrateRef = useRef(BOOTSTRAP.hydrate);

  useEffect(() => {
    settingsRef.current = settings;
  });

  // Initialize the Rapier WASM once. The population can't be built until this resolves.
  useEffect(() => {
    let mounted = true;
    RAPIER.init().then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Build / rebuild the population when the world params change (after Rapier is ready).
  useEffect(() => {
    if (!ready) return;
    const cur = settingsRef.current;
    const pop = new Population3D({
      size: POP_SIZE_3D,
      seed: settings.seed,
      gravity: GRAVITY_VALUES[settings.gravity],
      mutableFloor: settings.floor === 'mutable',
      roughness: settings.roughness,
      maxSlope: settings.maxSlope,
      maxGenSeconds: cur.maxGenSeconds,
      varyTorque: cur.varyTorque,
      ga: {
        mutationRate: cur.mutationRate,
        mutationSize: cur.mutationSize,
        eliteCount: cur.eliteCount,
      },
    });
    populationRef.current = pop;

    const auto = initialHydrateRef.current;
    if (auto && auto.seed === settings.seed) {
      pop.loadGenomes(auto.genomes, auto.generation, auto.history, auto.bestScore, auto.bestGenome);
    } else if (pendingRestoreRef.current) {
      const saved = pendingRestoreRef.current;
      pendingRestoreRef.current = null;
      pop.loadGenomes(saved.genomes, saved.generation, saved.history, saved.bestScore, saved.bestGenome);
    }
  }, [
    ready,
    settings.seed,
    settings.gravity,
    settings.floor,
    settings.roughness,
    settings.maxSlope,
  ]);

  // Live GA params — no rebuild.
  useEffect(() => {
    populationRef.current?.updateGAParams({
      mutationRate: settings.mutationRate,
      mutationSize: settings.mutationSize,
      eliteCount: settings.eliteCount,
    });
  }, [settings.mutationRate, settings.mutationSize, settings.eliteCount]);

  useEffect(() => {
    const pop = populationRef.current;
    if (pop) pop.opts.maxGenSeconds = settings.maxGenSeconds;
  }, [settings.maxGenSeconds]);

  const varyTorqueMountedRef = useRef(false);
  useEffect(() => {
    if (!varyTorqueMountedRef.current) {
      varyTorqueMountedRef.current = true;
      return;
    }
    populationRef.current?.applyVaryTorque(settings.varyTorque);
  }, [settings.varyTorque]);

  // Sim loop — steps whether or not the scene renders, so fast mode evolves headlessly.
  useEffect(() => {
    let raf = 0;
    let framesSinceUpdate = 0;
    let topScoreCache = getTopScore3d();
    const loop = () => {
      const pop = populationRef.current;
      if (pop) {
        const steps = settingsRef.current.render ? 2 : 12;
        for (let i = 0; i < steps; i++) {
          const newGen = pop.step();
          if (newGen) {
            autosavePopulation3d(pop.snapshot());
            topScoreCache = updateTopScore3d(pop.bestScore);
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
            hasSaved: hasSavedPopulation3d(),
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const setSetting = useCallback(
    <K extends keyof Sim3DSettings>(k: K, v: Sim3DSettings[K]) => {
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

  const save = useCallback(() => {
    const pop = populationRef.current;
    if (pop) savePopulation3d(pop.snapshot());
  }, []);

  const restore = useCallback(() => {
    const pop = populationRef.current;
    const saved = loadPopulation3d();
    if (!pop || !saved) return;
    if (saved.seed !== settingsRef.current.seed) {
      pendingRestoreRef.current = saved;
      setSettings((s) => ({ ...s, seed: saved.seed }));
    } else {
      pop.loadGenomes(saved.genomes, saved.generation, saved.history, saved.bestScore, saved.bestGenome);
    }
  }, []);

  const toggleReplay = useCallback(() => {
    const pop = populationRef.current;
    if (!pop) return;
    if (pop.replayMode) pop.exitReplay();
    else pop.enterReplay();
  }, []);

  const getPopulation = useCallback(() => populationRef.current, []);

  const value = useMemo<Sim3DContextValue>(
    () => ({
      settings,
      stats,
      ready,
      getPopulation,
      setSetting,
      newPopulation,
      regenWorld,
      save,
      restore,
      toggleReplay,
    }),
    [settings, stats, ready, getPopulation, setSetting, newPopulation, regenWorld, save, restore, toggleReplay],
  );

  return <Sim3DContext.Provider value={value}>{children}</Sim3DContext.Provider>;
}
