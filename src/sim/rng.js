// Seeded random numbers. All randomness in the simulation comes from here,
// never Math.random(), so the same seed always plays out the same way.
//
// The generator's whole state is one number kept in a plain object
// ({ s: 12345 }), stored inside the game state, so a saved game carries on
// with exactly the same luck after loading.
//
// The generator is mulberry32: small, fast, and good enough for a game.

export function makeRng(seed) {
  return { s: hashSeed(seed) };
}

// Turn any seed (number or text) into a 32-bit whole number.
export function hashSeed(seed) {
  const text = String(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// A number from 0 (included) to 1 (not included).
export function random(r) {
  r.s = (r.s + 0x6D2B79F5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const chance = (r, p) => random(r) < p;
export const int = (r, n) => Math.floor(random(r) * n);             // 0 to n-1
export const pick = (r, list) => list[int(r, list.length)];

export function shuffle(r, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(r, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
