// Small helpers shared by the rounds mini-games (kept apart so the games and
// rounds.js can all import them without going round in circles).

// Pick a key from a { key: share } object using the seeded random numbers.
export function weighted(sim, odds) {
  let x = sim.rand() * Object.values(odds).reduce((s, v) => s + v, 0);
  for (const [k, v] of Object.entries(odds)) if ((x -= v) < 0) return k;
  return Object.keys(odds)[0];
}
