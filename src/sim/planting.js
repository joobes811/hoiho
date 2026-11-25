// The planting mini-game's rules (build step E): a small plot at the place you
// are, where you decide which seedling goes where.
//
//   startPlanting(sim)           lay out the plot (S.planting; phase 'planting')
//   plantSeedling(sim, x, y, sp) put a seedling in a spot
//   toggleGuard(sim, x, y)       fit or remove a rabbit guard on a planted seedling
//   liftSeedling(sim, x, y)      take a seedling out again
//   cancelPlanting(sim)          change your mind before planting anything
//   evaluate(sim)                how the plot stands: each seedling, the rules, the grade
//   finishPlanting(sim)          plant the batch in the reserve (new cohorts); S.planting.result
//   closePlanting(sim)           back to the day
//   playPlanting(sim, mix)       plant a whole plot well, for the plain job and the caretaker
//
// The plot is a grid of spots. One edge is windward: wind-scorched, and only
// hardy plants cope there. Penguin tracks cross the plot and must stay clear.
// Earlier plantings at this place are drawn in from the sim's plant cohorts.
// Rabbit burrows come from the browse pressure. Everything that is just a
// number, or a sentence, is in data/planting.js.
const WIND = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

const key = (x, y) => x + ',' + y;

function onEdge(P, x, y) {
  return P.wind === 'n' ? y === 0 : P.wind === 's' ? y === P.h - 1 : P.wind === 'w' ? x === 0 : x === P.w - 1;
}

// The three spots on the windward side of a spot (some may be off the plot).
function windward(P, x, y) {
  const [dx, dy] = WIND[P.wind];
  return dx === 0 ? [[x - 1, y + dy], [x, y + dy], [x + 1, y + dy]] : [[x + dx, y - 1], [x + dx, y], [x + dx, y + 1]];
}

const inside = (P, x, y) => x >= 0 && y >= 0 && x < P.w && y < P.h;

// What is on each spot: 'path', 'cover' (older plants), 'warren', and the seedlings.
function lookup(P) {
  const m = new Map();
  for (const [x, y] of P.paths) m.set(key(x, y), { kind: 'path' });
  for (const h of P.hist) m.set(key(h.x, h.y), { kind: 'cover', hist: h });
  for (const [x, y] of P.warrens) m.set(key(x, y), { kind: 'warren' });
  for (const s of P.seedlings) {
    const o = m.get(key(s.x, s.y));
    m.set(key(s.x, s.y), { kind: 'seedling', seedling: s, path: o?.kind === 'path' });
  }
  return m;
}

function speciesOf(sim, k) { return sim.D.planting.species.find(s => s.k === k); }

const rabbitArea = (P, x, y) => P.warrens.some(([wx, wy]) => Math.abs(wx - x) <= 1 && Math.abs(wy - y) <= 1);

/* ---------- laying out the plot ---------- */

function makePaths(sim, P) {
  const D = sim.D.planting.plot;
  const paths = new Set();
  const addPath = () => {
    const vertical = sim.chance(0.5);
    const len = vertical ? P.h : P.w;
    const across = vertical ? P.w : P.h;
    let at = sim.int(across);
    const cells = [];
    for (let i = 0; i < len; i++) {
      cells.push(vertical ? [at, i] : [i, at]);
      if (i < len - 1 && sim.chance(D.wobbleChance)) {
        const next = Math.max(0, Math.min(across - 1, at + (sim.chance(0.5) ? 1 : -1)));
        if (next !== at) { at = next; cells.push(vertical ? [at, i] : [i, at]); }
      }
    }
    return cells;
  };
  for (let n = 0; n < 2; n++) {
    if (n === 1 && !sim.chance(D.secondPathChance)) break;
    const cells = addPath();
    const merged = new Set([...paths, ...cells.map(([x, y]) => key(x, y))]);
    if (n === 1 && merged.size > D.pathMaxShare * P.w * P.h) break;
    for (const k of merged) paths.add(k);
  }
  return [...paths].map(k => k.split(',').map(Number));
}

// Earlier plantings here, as drawn plants: { kind, stage, n } with n spots' worth.
function historyPlants(sim, id) {
  const D = sim.D.planting.plot;
  const z = sim.z(id);
  const bins = {};
  const add = (kind, stage, n) => { if (n > 0) { const k = kind + stage; bins[k] = bins[k] ?? { kind, stage, plants: 0 }; bins[k].plants += n; } };
  add('flax', 'grown', z.flax);
  add('shrub', 'grown', z.shrub);
  for (const c of z.cohorts) add(c.type, c.age < D.youngBelow ? 'young' : 'mid', c.n);
  return Object.values(bins).map(b => ({ ...b, n: Math.max(1, Math.round(b.plants / D.plantsPerCell)) }))
    .filter(b => b.plants >= D.plantsPerCell / 4);
}

export function startPlanting(sim) {
  const S = sim.S;
  const id = S.loc;
  const job = sim.jobsHere().find(j => j.id === 'plant');
  if (!job || job.blocked) return false;
  const PD = sim.D.planting;
  const D = PD.plot;
  const [w, h] = sim.pick(D.sizes);
  const P = { zone: id, w, h, wind: sim.pick(['n', 's', 'e', 'w']), paths: [], hist: [], warrens: [],
    seedlings: [], total: PD.batch.seedlings, guardsLeft: PD.batch.guards, guards: PD.batch.guards,
    started: false, minutes: 0, rabbits: false, result: null };
  P.paths = makePaths(sim, P);
  const taken = new Set(P.paths.map(([x, y]) => key(x, y)));
  const free = () => sim.shuffle(Array.from({ length: w * h }, (_, i) => [i % w, Math.floor(i / w)])
    .filter(([x, y]) => !taken.has(key(x, y))));

  // Rabbit burrows: more when the browsing pressure is high.
  const bp = sim.browsePressure(id);
  const burrows = bp < D.warrenFrom ? 0 : Math.min(D.warrenMax, 1 + Math.floor((bp - D.warrenFrom) / D.warrenPer));
  P.rabbits = burrows > 0;
  for (const c of free().filter(([x, y]) => !onEdge(P, x, y)).slice(0, burrows)) {
    P.warrens.push(c);
    taken.add(key(c[0], c[1]));
  }

  // Older plantings: kept to what leaves room for a batch. Flax toward the windward edge, shrubs inland.
  let room = free().length - P.total - D.spareSpots;
  const old = historyPlants(sim, id);
  while (old.reduce((t, o) => t + o.n, 0) > Math.max(0, room)) {
    const biggest = old.reduce((m, o) => (o.n > m.n ? o : m), old[0]);
    if (biggest.n > 1) biggest.n--;
    else old.pop();                               // out of room: the youngest plantings are left off
    if (!old.length) break;
  }
  const edgeLen = P.wind === 'n' || P.wind === 's' ? w : h;
  let edgeLeft = Math.floor(D.historyEdgeShare * edgeLen);
  for (const o of old) {
    for (let i = 0; i < o.n; i++) {
      const spare = free();
      const edge = spare.filter(([x, y]) => onEdge(P, x, y));
      const pool = o.kind === 'flax' && edgeLeft > 0 && edge.length ? edge : spare.filter(([x, y]) => !onEdge(P, x, y));
      const c = (pool.length ? pool : spare)[0];
      if (!c) break;
      if (onEdge(P, c[0], c[1])) edgeLeft--;
      P.hist.push({ x: c[0], y: c[1], kind: o.kind, stage: o.stage });
      taken.add(key(c[0], c[1]));
    }
  }
  P.total = Math.min(P.total, w * h - P.hist.length - P.warrens.length);
  S.planting = P;
  S.phase = 'planting';
  return true;
}

/* ---------- placing things ---------- */

function spend(sim, minutes) {
  sim.S.time += minutes;
  sim.S.planting.minutes += minutes;
}

export function canPlant(sim, x, y) {
  const P = sim.S.planting;
  if (!P || P.result || P.seedlings.length >= P.total || !inside(P, x, y)) return false;
  const here = lookup(P).get(key(x, y));
  return !here || here.kind === 'path';
}

export function plantSeedling(sim, x, y, sp) {
  const P = sim.S.planting;
  if (!speciesOf(sim, sp) || !canPlant(sim, x, y)) return false;
  if (!P.started) {
    P.started = true;
    spend(sim, sim.D.planting.minutes.start + (sim.D.weather.windyWeather.includes(sim.S.weather) ? sim.R.day.windPlanting : 0));
  }
  P.seedlings.push({ x, y, sp, guard: false });
  spend(sim, sim.D.planting.minutes.place);
  return true;
}

function seedlingAt(P, x, y) { return P?.seedlings.find(s => s.x === x && s.y === y); }

export function canGuard(sim, x, y) {
  const P = sim.S.planting;
  const s = seedlingAt(P, x, y);
  return Boolean(s && !P.result && (s.guard || P.guardsLeft > 0));
}

export function toggleGuard(sim, x, y) {
  const P = sim.S.planting;
  if (!canGuard(sim, x, y)) return false;
  const s = seedlingAt(P, x, y);
  s.guard = !s.guard;
  P.guardsLeft += s.guard ? -1 : 1;
  spend(sim, sim.D.planting.minutes.guard);
  return true;
}

export function liftSeedling(sim, x, y) {
  const P = sim.S.planting;
  const s = seedlingAt(P, x, y);
  if (!s || P.result) return false;
  if (s.guard) P.guardsLeft++;
  P.seedlings.splice(P.seedlings.indexOf(s), 1);
  spend(sim, sim.D.planting.minutes.lift);
  return true;
}

// Nothing planted yet? Then you can walk away and nothing has been used up.
export function cancelPlanting(sim) {
  const S = sim.S;
  if (!S.planting || S.planting.seedlings.length || S.planting.started || S.planting.result) return false;
  S.planting = null;
  S.phase = 'day';
  return true;
}

/* ---------- how it's going ---------- */

// Everything the rules say about the seedlings placed so far.
export function evaluate(sim) {
  const P = sim.S.planting;
  const PD = sim.D.planting;
  const V = PD.survival;
  const map = lookup(P);
  const plant = (x, y) => { const o = map.get(key(x, y)); return o && (o.kind === 'cover' || o.kind === 'seedling'); };
  const shelters = (x, y) => {
    const o = map.get(key(x, y));
    return Boolean(o && (o.kind === 'cover' || (o.kind === 'seedling' && speciesOf(sim, o.seedling.sp).shelters)));
  };
  const rules = { path: 0, edge: 0, shelter: 0, rabbits: 0, wasted: 0, crowd: 0 };
  let flax = 0;
  let flaxOnEdge = 0;
  const per = P.seedlings.map(s => {
    const sp = speciesOf(sim, s.sp);
    const f = { onPath: map.get(key(s.x, s.y))?.path === true, edge: onEdge(P, s.x, s.y), tenderEdge: false, tenderBare: false,
      crowded: false, rabbit: rabbitArea(P, s.x, s.y), unguarded: false, wasted: false, s: 1 };
    if (f.onPath) { f.s *= V.onPath; rules.path++; }
    if (!sp.hardy) {
      if (f.edge) { f.tenderEdge = true; f.s *= V.tenderOnEdge; rules.shelter++; }
      else if (!windward(P, s.x, s.y).some(([x, y]) => shelters(x, y))) { f.tenderBare = true; f.s *= V.tenderNoShelter; rules.shelter++; }
    }
    let near = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && plant(s.x + dx, s.y + dy)) near++;
    if (near >= PD.crowdedAt) { f.crowded = true; f.s *= V.crowded; rules.crowd++; }
    if (f.rabbit && !s.guard) { f.unguarded = true; f.s *= V.rabbits; rules.rabbits++; }
    if (s.guard && !f.rabbit) { f.wasted = true; rules.wasted++; }
    if (sp.shelters) { flax++; if (f.edge) flaxOnEdge++; }
    return f;
  });
  // The windward edge wants its flax, as far as there is bare edge to put it on.
  let edgeBare = 0;
  for (let x = 0; x < P.w; x++) for (let y = 0; y < P.h; y++) {
    if (onEdge(P, x, y) && !map.get(key(x, y))) edgeBare++;
  }
  if (flax) rules.edge = Math.max(0, Math.min(flax, edgeBare + flaxOnEdge) - flaxOnEdge);
  const placed = P.seedlings.length;
  const sum = per.reduce((t, f) => t + f.s, 0);
  const average = placed ? sum / placed : 1;
  const broken = Object.values(rules).reduce((t, n) => t + n, 0);
  const grade = !placed ? null : broken === 0 ? 'great' : average >= PD.goodAverage ? 'good' : 'rough';
  return { per, rules, edgeBare, sum, average, broken, grade };
}

// What hovering over a spot should say: the facts that apply, and how a seedling of species `sp` would do.
export function spotInfo(sim, x, y, sp = null) {
  const P = sim.S.planting;
  const map = lookup(P);
  const here = map.get(key(x, y));
  const facts = [];
  const edge = onEdge(P, x, y);
  const rabbit = rabbitArea(P, x, y);
  let verdict = null;
  if (here?.kind === 'cover') facts.push('cover');
  else if (here?.kind === 'warren') facts.push('warren');
  else {
    if (here?.kind === 'path' || here?.path) facts.push('path');
    if (edge) facts.push('edge');
    if (rabbit) facts.push(here?.seedling?.guard ? 'rabbitsOk' : 'rabbits');
    const sh = windward(P, x, y).some(([wx, wy]) => {
      const o = map.get(key(wx, wy));
      return o && (o.kind === 'cover' || (o.kind === 'seedling' && speciesOf(sim, o.seedling.sp).shelters));
    });
    facts.push(edge ? null : sh ? 'sheltered' : 'bare');
    // Crowding: plants round this spot, and neighbours a new seedling here would hem in.
    const PD = sim.D.planting;
    const isPlant = (px, py) => { const o = map.get(key(px, py)); return Boolean(o && (o.kind === 'cover' || o.kind === 'seedling')); };
    const around = (cx, cy) => {
      let n = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && isPlant(cx + dx, cy + dy)) n++;
      return n;
    };
    const near = around(x, y);
    if (near >= PD.crowdedAt) facts.push('crowded');
    let squeezes = false;
    if (!here?.seedling) {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const o = map.get(key(x + dx, y + dy));
        if ((dx || dy) && o?.kind === 'seedling' && around(x + dx, y + dy) + 1 === PD.crowdedAt) squeezes = true;
      }
      if (squeezes) facts.push('squeezes');
    }
    if (!here?.seedling && sp) {
      const s = speciesOf(sim, sp);
      verdict = here?.kind === 'path' ? 'path' : !s.hardy && edge ? 'tenderEdge' : !s.hardy && !sh ? 'tenderBare'
        : near >= PD.crowdedAt || squeezes ? 'crowded' : 'good';
    }
  }
  return { facts: facts.filter(Boolean), verdict, seedling: here?.seedling ?? null };
}

/* ---------- finishing ---------- */

export function finishPlanting(sim) {
  const S = sim.S;
  const P = S.planting;
  if (!P || P.result || P.seedlings.length < P.total) return false;
  const PD = sim.D.planting;
  const ev = evaluate(sim);
  const z = sim.z(P.zone);
  const out = { flax: 0, shrub: 0 };
  const fitted = { flax: 0, shrub: 0 };
  const count = { flax: 0, shrub: 0 };
  P.seedlings.forEach((s, i) => {
    const g = speciesOf(sim, s.sp).group;
    out[g] += ev.per[i].s * PD.batch.plantsPerSeedling;
    count[g]++;
    if (s.guard && ev.per[i].rabbit) fitted[g]++;
  });
  for (const g of ['flax', 'shrub']) {
    const n = Math.round(out[g]);
    out[g] = n;
    if (n > 0) z.cohorts.push({ type: g, n, age: 0, guard: Math.round(100 * fitted[g] / count[g]) / 100 });
  }
  z.k.planted = { v: S.v };
  S.done['plant:' + P.zone] = true;
  sim.say('planted', { zone: P.zone, grade: ev.grade, flax: out.flax, shrub: out.shrub });
  P.result = { grade: ev.grade, flax: out.flax, shrub: out.shrub, survive: Math.round(ev.sum * 10) / 10,
    total: P.total, rules: ev.rules, average: ev.average, minutes: P.minutes };
  return true;
}

export function closePlanting(sim) {
  const S = sim.S;
  if (!S.planting?.result) return false;
  S.planting = null;
  S.phase = 'day';
  return true;
}

/* ---------- planting well, without a screen ---------- */

// What a sensible caretaker plants here: flax where it's exposed and short of
// shelter, shrubs everywhere else.
export function planterMix(sim) {
  const n = sim.D.planting.batch.seedlings;
  const exposed = sim.zd(sim.S.loc).exposed && sim.shelterIn(sim.S.loc) < sim.R.plants.shelterNeeded;
  return exposed ? { flax: n, shrub: 0 } : { flax: 0, shrub: n };
}

// Plant a whole plot carefully: each seedling goes where the rules like it
// best, with a guard if it is beside a burrow.
export function playPlanting(sim, mix = planterMix(sim)) {
  if (!startPlanting(sim)) return false;
  const P = sim.S.planting;
  planSeedlings(sim, mix);
  finishPlanting(sim);
  const result = P.result;
  closePlanting(sim);
  return result;
}

// Fill the plot that's open (the part of playPlanting before finishing; handy for dev checks too).
export function planSeedlings(sim, mix = planterMix(sim), limit = Infinity) {
  const P = sim.S.planting;
  const PD = sim.D.planting;
  const order = [...Array(mix.flax).fill('flax'), ...Array(mix.shrub).fill('shrub')];
  const used = {};
  while (P.seedlings.length < Math.min(P.total, limit)) {
    const group = order[P.seedlings.length] ?? 'shrub';
    const species = PD.species.filter(s => s.group === group);
    let best = null;
    for (const sp of species) {
      for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
        if (!canPlant(sim, x, y)) continue;
        const guard = rabbitArea(P, x, y) && P.guardsLeft > 0;
        P.seedlings.push({ x, y, sp: sp.k, guard });
        if (guard) P.guardsLeft--;
        const ev = evaluate(sim);
        if (guard) P.guardsLeft++;
        P.seedlings.pop();
        const score = ev.broken * 10 - ev.sum + (guard ? 0.01 : 0) + (used[sp.k] ?? 0) * 0.001;
        if (!best || score < best.score) best = { score, x, y, sp: sp.k, guard };
      }
    }
    if (!best) break;
    plantSeedling(sim, best.x, best.y, best.sp);
    if (best.guard) toggleGuard(sim, best.x, best.y);
    used[best.sp] = (used[best.sp] ?? 0) + 1;
  }
}

// Plant in a hurry (the "Quick" button): most seedlings go in carefully, the
// rest wherever there's room, and no guards for those.
export function quickPlanting(sim, mix = planterMix(sim)) {
  if (!startPlanting(sim)) return false;
  const P = sim.S.planting;
  hastyPlanting(sim, mix);
  finishPlanting(sim);
  const result = P.result;
  closePlanting(sim);
  return result;
}

// Fill the rest of the open plot in a hurry (the Quick button, or "Finish quickly"
// part-way through): each seedling still to go has rates.quick.skipShare odds of
// going wherever there's room; the others are placed carefully.
export function hastyPlanting(sim, mix = planterMix(sim)) {
  const P = sim.S.planting;
  const placed = P.seedlings.length;
  let careful = 0;
  for (let i = placed; i < P.total; i++) if (!sim.chance(sim.R.quick.skipShare)) careful++;
  planSeedlings(sim, mix, placed + careful);
  const order = [...Array(mix.flax).fill('flax'), ...Array(mix.shrub).fill('shrub')];
  while (P.seedlings.length < P.total) {
    const spots = [];
    for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) if (canPlant(sim, x, y)) spots.push([x, y]);
    if (!spots.length) break;
    const group = order[P.seedlings.length] ?? 'shrub';
    const sp = sim.pick(sim.D.planting.species.filter(s => s.group === group)).k;
    const [x, y] = sim.pick(spots);
    plantSeedling(sim, x, y, sp);
  }
}
