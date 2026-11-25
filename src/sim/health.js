// Reserve health: a rough score (0-100) for how the reserve is going, from
// pest control, plant cover and fences (weights in data/health.js). Pure: it
// reads the state and changes nothing, so it can be shown any time.
import { clamp } from './util.js';

// Pest control now: trap lines (freshness, and whether the line is full), bait and
// possum control, averaged over the working areas. The same measure that reserve
// life is built from at the end of each visit (sim.endVisit).
export function pestControl(sim) {
  const R = sim.R;
  const work = sim.zones.filter(d => !d.flags.includes('base'));
  return work.reduce((s, d) => {
    const z = sim.z(d.id);
    return s + (z.tf * Math.min(1, z.traps / R.stoats.fullLine) + z.bait + z.browse) / 3;
  }, 0) / work.length;
}

export function fences(sim) {
  const fenced = sim.zones.filter(d => sim.z(d.id).fence !== null);
  return fenced.length ? fenced.reduce((s, d) => s + sim.z(d.id).fence, 0) / fenced.length : 100;
}

// { score, parts: { pests, cover, fences }, band: { word, colour } }
export function health(sim) {
  const H = sim.D.health;
  const parts = { pests: pestControl(sim), cover: sim.habitatScore(), fences: fences(sim) };
  const score = clamp(Object.keys(H.weights).reduce((s, k) => s + H.weights[k] * parts[k], 0));
  const band = H.bands.find(b => score < b.below) ?? H.bands[H.bands.length - 1];
  return { score, parts, band };
}
