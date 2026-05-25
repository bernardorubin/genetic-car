// Cosmetic unlocks driven by achievements. Each cosmetic is a renderer-side
// decoration: a soft glow color the leader car gets, ordered by tier so the
// most prestigious unlocked cosmetic wins.

export interface Cosmetic {
  id: string;
  /** Achievement id that unlocks this cosmetic. */
  unlockedBy: string;
  /** Display label. */
  label: string;
  /** rgba color used for the leader glow/trail when this is active. */
  glow: string;
  /** Higher tier overrides lower-tier glows. */
  tier: number;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'lime',     unlockedBy: 'first-100m',  label: 'Lime Halo',     glow: 'rgba(163,230,53,0.55)',  tier: 1 },
  { id: 'amber',    unlockedBy: 'first-300m',  label: 'Amber Halo',    glow: 'rgba(251,191,36,0.55)',  tier: 2 },
  { id: 'rose',     unlockedBy: 'first-500m',  label: 'Rose Halo',     glow: 'rgba(244,63,94,0.55)',   tier: 3 },
  { id: 'fuchsia',  unlockedBy: 'first-1km',   label: 'Fuchsia Halo',  glow: 'rgba(217,70,239,0.55)',  tier: 4 },
  { id: 'gold',     unlockedBy: 'gen-50',      label: 'Patience Gold', glow: 'rgba(250,204,21,0.65)',  tier: 5 },
  { id: 'platinum', unlockedBy: 'gen-200',     label: 'Platinum Aura', glow: 'rgba(229,231,235,0.7)',  tier: 6 },
];

/** Find the highest-tier glow available given the set of unlocked achievements. */
export function activeCosmeticGlow(unlocked: Set<string>): string | null {
  let best: Cosmetic | null = null;
  for (const c of COSMETICS) {
    if (!unlocked.has(c.unlockedBy)) continue;
    if (!best || c.tier > best.tier) best = c;
  }
  return best?.glow ?? null;
}
