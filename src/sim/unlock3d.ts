// 3D-mode unlock gate. The 3D lab starts locked and unlocks the first time a 2D run
// reaches gen 20 OR a car travels 500m — whichever comes first. The flag is persisted,
// so once earned it stays unlocked. Detection lives in the 2D SimProvider's per-generation
// hook; the app shell listens for UNLOCK_EVENT to flip the header switch + celebrate.

const STORAGE_KEY = 'genetic-cars:unlock-3d:v1';
export const UNLOCK_EVENT = 'genetic-cars:unlock-3d';
export const UNLOCK_GENERATION = 20;
export const UNLOCK_DISTANCE = 500;

export function isUnlocked3d(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUnlocked3d(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore — private mode / quota
  }
}

export function shouldUnlock3d(generation: number, bestScore: number): boolean {
  return generation >= UNLOCK_GENERATION || bestScore >= UNLOCK_DISTANCE;
}
