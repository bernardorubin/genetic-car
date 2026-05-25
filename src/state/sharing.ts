// Seed sharing + daily challenge utilities. No backend; the URL is the contract.

/** Pull the ?seed= query param at module load. Returns null if absent. */
export function seedFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const s = url.searchParams.get('seed');
    if (s && s.length > 0 && s.length <= 40) return s;
  } catch {
    // ignore malformed URLs
  }
  return null;
}

/** Compute today's deterministic daily seed from UTC date. */
export function dailySeed(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}

/** Build a shareable URL pointing at this seed on the current origin. */
export function shareUrlForSeed(seed: string): string {
  if (typeof window === 'undefined') return `?seed=${encodeURIComponent(seed)}`;
  const url = new URL(window.location.href);
  url.searchParams.set('seed', seed);
  return url.toString();
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
