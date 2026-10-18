export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (min: number, max: number, r = Math.random) => min + Math.floor(r() * (max - min + 1));

export const pick = <T>(arr: readonly T[], r = Math.random): T => arr[Math.floor(r() * arr.length)];

export function pickWeighted<T>(entries: readonly [T, number][], r = Math.random): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = r() * total;
  for (const [v, w] of entries) {
    roll -= w;
    if (roll <= 0) return v;
  }
  return entries[entries.length - 1][0];
}
