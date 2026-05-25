import { useSim } from '../state/useSim';

export function FavoritePicker() {
  const { topLive, hasFavorite, setFavorite, clearFavorite } = useSim();

  return (
    <div>
      <p className="text-[11px] text-ink-500 leading-relaxed mb-2">
        Pin a car as your "pet" — its genome is cloned into every next generation
        and gets boosted weight in selection. Lets you nudge evolution toward
        designs you like.
      </p>
      <ol className="flex flex-col gap-1.5">
        {topLive.map((entry, i) => (
          <li
            key={`${entry.carIndex}-${i}`}
            className="hairline rounded-md px-2.5 py-1.5 flex items-center gap-2"
          >
            <span className="text-[10px] font-mono text-ink-500 w-4">
              #{i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-ink-50">
                car {entry.carIndex}
              </div>
              <div className="text-[10px] font-mono text-ink-500">
                {entry.score.toFixed(1)}m
              </div>
            </div>
            <button
              onClick={() => setFavorite(entry.carIndex)}
              className="hairline rounded px-2 py-1 text-[10px] font-mono text-amber-400 hover:bg-amber-400/10 transition"
              title="Pin this genome as the breeding favorite"
            >
              pin
            </button>
          </li>
        ))}
      </ol>
      {hasFavorite && (
        <button
          onClick={clearFavorite}
          className="mt-2 w-full hairline rounded-md px-2.5 py-1.5 text-[11px] font-mono text-ink-300 hover:bg-white/5 transition"
        >
          clear favorite
        </button>
      )}
    </div>
  );
}
