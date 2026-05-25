import { listAchievements } from '../sim/achievements';
import { useSim } from '../state/useSim';

export function AchievementsList() {
  const { unlockedAchievements } = useSim();
  const all = listAchievements();
  const unlockedCount = unlockedAchievements.size;

  return (
    <div>
      <div className="text-[10px] font-mono text-ink-500 mb-2">
        {unlockedCount} / {all.length} unlocked
      </div>
      <ul className="flex flex-col gap-1">
        {all.map((a) => {
          const unlocked = unlockedAchievements.has(a.id);
          return (
            <li
              key={a.id}
              className={`hairline rounded-md px-2.5 py-1.5 flex items-start gap-2 ${
                unlocked ? '' : 'opacity-50'
              }`}
            >
              <span className={`text-base leading-none ${unlocked ? 'text-amber-400' : 'text-ink-500'}`}>
                {unlocked ? '★' : '☆'}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-mono text-ink-50 truncate">
                  {a.title}
                </div>
                <div className="text-[10px] text-ink-500 leading-snug">
                  {a.description}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
