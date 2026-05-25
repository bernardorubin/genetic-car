// Deterministic two-word world name derived from the seed string.
// Same seed → same name forever; reseed → new identity. The lists are tuned
// for a slightly synthwave / nature-mythic vibe to match the dark UI.

const ADJECTIVES = [
  'Ember', 'Frost', 'Verdant', 'Crimson', 'Lunar', 'Solar', 'Static', 'Velvet',
  'Glacial', 'Obsidian', 'Cobalt', 'Saffron', 'Iron', 'Plasma', 'Quartz', 'Hollow',
  'Onyx', 'Ivory', 'Twilight', 'Aurora', 'Cinder', 'Mossy', 'Stormwrought', 'Pale',
  'Cascade', 'Driftwood', 'Voidlit', 'Goldspun', 'Tidal', 'Wildfire', 'Echo', 'Mirror',
];

const NOUNS = [
  'Drifter', 'Mirage', 'Phoenix', 'Nexus', 'Pulse', 'Vault', 'Spire', 'Reverie',
  'Gulch', 'Hollow', 'Sigil', 'Vagrant', 'Compass', 'Cinder', 'Comet', 'Wanderer',
  'Vortex', 'Lattice', 'Anthem', 'Sojourn', 'Beacon', 'Riftling', 'Tideline', 'Glyph',
  'Locus', 'Specter', 'Mirage', 'Halo', 'Carapace', 'Whisper', 'Mosaic', 'Echo',
];

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function worldName(seed: string): string {
  const h = hash32(seed);
  const adj = ADJECTIVES[h % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length];
  return `${adj} ${noun}`;
}
