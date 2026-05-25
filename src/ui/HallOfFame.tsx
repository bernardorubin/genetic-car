import { useSim } from '../state/useSim';

export function HallOfFame() {
  const { hallOfFame, replayGenome, stats } = useSim();

  if (hallOfFame.length === 0) {
    return (
      <p className="text-[11px] text-ink-500 leading-relaxed">
        no hall-of-fame entries yet. a car breaking your current best gets a
        spot here — across all worlds, all seeds.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {hallOfFame.map((e, i) => (
        <li key={e.seed + e.achievedAt} className="hairline rounded-md px-2.5 py-1.5 flex items-center gap-2">
          <span className="text-[10px] font-mono text-ink-500 w-4">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-ink-50 truncate">
              {e.worldName}
            </div>
            <div className="text-[10px] font-mono text-ink-500 truncate">
              {e.score.toFixed(1)}m · gen {e.generation}
            </div>
          </div>
          <button
            onClick={() => replayGenome(e.genome)}
            disabled={stats.replay}
            className={`hairline rounded px-2 py-1 text-[10px] font-mono transition ${
              stats.replay
                ? 'text-ink-500 cursor-not-allowed opacity-60'
                : 'text-ink-100 hover:bg-white/5'
            }`}
            title="Replay this genome on the current terrain"
          >
            play
          </button>
        </li>
      ))}
    </ol>
  );
}
