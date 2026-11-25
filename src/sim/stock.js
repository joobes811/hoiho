// The stock mini-games' rules: a cow bogged in the gully mud, cattle to ease
// back through the gate, and sheep to lift over the fence. Pure logic, no
// Phaser: the scene (StockScene.js) draws S.stockGame and passes on clicks.
//
//   startStock(sim)            set up the game for the stock here (S.stockGame; phase 'stock')
//   cancelStock(sim)           walk away before doing anything
//   closeStock(sim)            back to the day, after the result
//   playStock(sim)             the plain job, for the automatic caretaker: the stock is dealt with, no screen
//
//   cow:    moveTo, digLeg, takeRope, tieRope, pull(phase)
//   cattle: moveCattle, herderSpot (where a helpful person would stand)
//   sheep:  pickSheep, liftOver
//
// Every step spends a little daylight (S.time), so the clock stays honest.
// Positions are in grid squares. All numbers and words are in data/stock.js.
import { clamp } from './util.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const keyOf = (cx, cy) => cx + ',' + cy;

/* ---------- shared ---------- */

export function stockKind(sim) {
  const S = sim.S;
  if (!S.stock) return null;
  if (S.stock.kind === 'sheep') return 'sheep';
  return S.mud && sim.has(S.stock.zone, 'muddy') ? 'cow' : 'cattle';
}

function spend(sim, minutes) {
  sim.S.time += minutes;
  sim.S.stockGame.minutes += minutes;
}

// Say something wry (a line picked from a pool); the scene shows G.line.
function line(sim, pool) {
  sim.S.stockGame.line = sim.pick(pool);
  return sim.S.stockGame.line;
}

const gradeBy = (value, g) => (value <= g.great ? 'great' : value <= g.good ? 'good' : 'rough');

export function startStock(sim) {
  const S = sim.S;
  const job = sim.jobsHere().find(j => j.id === 'stock');
  if (!job || job.blocked) return false;
  const kind = stockKind(sim);
  const D = sim.D.stock;
  const G = { kind, zone: S.stock.zone, minutes: 0, line: null, result: null };
  S.stockGame = G;
  if (kind === 'cow') setupCow(sim, G);
  if (kind === 'cattle') setupCattle(sim, G);
  if (kind === 'sheep') setupSheep(sim, G);
  G.started = false;
  G.minutes = 0;
  S.time += D.common.startMinutes;
  G.minutes += D.common.startMinutes;
  S.phase = 'stock';
  return true;
}

// Walk away before you've touched anything: nothing is used up except the walk in.
export function cancelStock(sim) {
  const S = sim.S;
  if (!S.stockGame || S.stockGame.started || S.stockGame.result) return false;
  S.time -= S.stockGame.minutes;
  S.stockGame = null;
  S.phase = 'day';
  return true;
}

export function closeStock(sim) {
  const S = sim.S;
  if (!S.stockGame?.result) return false;
  S.stockGame = null;
  S.phase = 'day';
  return true;
}

// The stock is dealt with: stock gone (so no more trampling), job done, words said.
function finish(sim, grade, extra = {}) {
  const S = sim.S;
  const G = S.stockGame;
  const zone = G.zone;
  S.stock = null;
  S.done['stock:' + zone] = true;
  if (G.kind === 'cow') { sim.note('cow'); sim.say('cowFreed', { zone, grade }); }
  if (G.kind === 'cattle') sim.say('cattleShifted', { zone, grade });
  if (G.kind === 'sheep') {
    const D = sim.D.stock.sheep;
    S.soreBack = clamp(G.lifted / D.soreRef, D.soreMin, D.soreMax);
    sim.note('soreback');
    sim.say('sheepOver', { zone, grade, n: G.lifted });
  }
  G.result = { grade, minutes: Math.round(G.minutes), ...extra };
}

// The plain job, for the automatic caretaker and old saves: it just gets done
// (cattle herded, a cow dug out, sheep lifted) and takes the job's usual time.
export function playStock(sim) {
  const S = sim.S;
  const id = S.stock.zone;
  const say = (key, vars = {}) => sim.say(key, { zone: id, ...vars });
  if (S.stock.kind === 'sheep') {
    S.soreBack = true;                  // the usual sore back (rates.day.soreBack)
    sim.note('soreback');
    say('sheepLifted');
  } else if (S.mud && sim.has(id, 'muddy')) {
    sim.note('cow');
    say('cowDug');
  } else {
    say('cattleHerded');
  }
  S.stock = null;
}

/* ---------- the cow in the mud ---------- */

function setupCow(sim, G) {
  const C = sim.D.stock.cow;
  const centre = { x: (C.body.x0 + C.body.x1) / 2, y: (C.body.y0 + C.body.y1) / 2 };
  const blobs = [];
  const n = C.softBlobs[0] + sim.int(C.softBlobs[1] - C.softBlobs[0] + 1);
  for (let i = 0; i < n; i++) {
    // a patch of soft mud somewhere out on the grass, away from where you start and from the pull spot
    for (let tries = 0; tries < 20; tries++) {
      const b = { x: 1.5 + sim.rand() * (C.grid.w - 3), y: 1 + sim.rand() * (C.grid.h - 2) };
      if (dist(b, centre) > C.softRing + 1 && dist(b, C.start) > 2.5 && dist(b, C.pullSpot) > 2.5) { blobs.push(b); break; }
    }
  }
  const tussock = new Set(C.tussocks.map(([x, y]) => keyOf(x, y)));
  const soft = [];
  for (let cy = 0; cy < C.grid.h; cy++) {
    for (let cx = 0; cx < C.grid.w; cx++) {
      const p = { x: cx + 0.5, y: cy + 0.5 };
      if (tussock.has(keyOf(cx, cy))) continue;
      if (dist(p, centre) <= C.softRing || blobs.some(b => dist(p, b) <= C.blobRadius)) soft.push(keyOf(cx, cy));
    }
  }
  Object.assign(G, {
    pos: { ...C.start }, soft, tussocks: C.tussocks.map(([x, y]) => ({ x, y })),
    legs: C.legs.map(() => 0),            // digs done round each leg
    rope: 'coil',                         // 'coil' (still on the bank), 'held', 'horns' or 'neck'
    coat: sim.chance(0.5) ? 'black' : 'hereford', pulls: 0, misses: 0, at: 'start', moved: 0, mudMinutes: 0,
  });
}

export const isSoft = (G, x, y) => G.soft.includes(keyOf(Math.floor(x), Math.floor(y)));

const inBody = (C, x, y) => x > C.body.x0 && x < C.body.x1 && y > C.body.y0 && y < C.body.y1;

// What walking in a straight line costs, in minutes, and how much of it was extra for soft mud.
export function pathCost(sim, G, from, to) {
  const C = sim.D.stock.cow;
  const d = dist(from, to);
  const steps = Math.max(1, Math.ceil(d * 2));
  const len = d / steps;
  let minutes = 0;
  let extra = 0;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const base = len * C.walkMinutes;
    const soft = isSoft(G, p.x, p.y);
    minutes += soft ? base * C.softSlow : base;
    if (soft) extra += base * (C.softSlow - 1);
  }
  return { minutes, extra };
}

function walk(sim, to) {
  const G = sim.S.stockGame;
  const { minutes, extra } = pathCost(sim, G, G.pos, to);
  spend(sim, minutes);
  G.mudMinutes += extra;
  G.moved += dist(G.pos, to);
  G.pos = { x: to.x, y: to.y };
  G.started = true;
  return minutes;
}

// The cheapest spot to stand within reach of a target (null if you're already there).
export function approachSpot(sim, target, reach) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cow;
  reach ??= C.reach;
  if (dist(G.pos, target) <= reach) return null;
  let best = null;
  for (let cy = 0; cy < C.grid.h; cy++) {
    for (let cx = 0; cx < C.grid.w; cx++) {
      const p = { x: cx + 0.5, y: cy + 0.5 };
      if (dist(p, target) > reach || inBody(C, p.x, p.y)) continue;
      const cost = pathCost(sim, G, G.pos, p).minutes;
      if (!best || cost < best.cost) best = { p, cost };
    }
  }
  return best ? best.p : null;
}

function goNear(sim, target, reach) {
  const p = approachSpot(sim, target, reach);
  if (p) walk(sim, p);
}

// Walk to a square. (You can't stand inside the cow.)
export function moveTo(sim, x, y) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cow;
  if (G?.kind !== 'cow' || G.result) return false;
  const to = { x: clamp(Math.floor(x) + 0.5, 0.5, C.grid.w - 0.5), y: clamp(Math.floor(y) + 0.5, 0.5, C.grid.h - 0.5) };
  if (inBody(C, to.x, to.y)) return false;
  walk(sim, to);
  G.line = null;
  return true;
}

export const legsLeft = (sim, G) => G.legs.filter(n => n < sim.D.stock.cow.digsPerLeg).length;
export function cowReady(sim) {
  const G = sim.S.stockGame;
  return G.legs.every(n => n >= sim.D.stock.cow.digsPerLeg) && (G.rope === 'horns' || G.rope === 'neck');
}
export const pullsNeeded = (sim, G) => sim.D.stock.cow.pullsNeeded[G.rope === 'neck' ? 'neck' : 'horns'];

// One dig round a leg. Three clears it.
export function digLeg(sim, i) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cow;
  const U = sim.D.stock.ui.cow;
  if (G?.kind !== 'cow' || G.result || G.legs[i] >= C.digsPerLeg) return false;
  goNear(sim, C.legs[i]);
  spend(sim, C.digMinutes);
  G.legs[i]++;
  line(sim, G.legs[i] >= C.digsPerLeg ? U.legFree : U.dug);
  G.started = true;
  return true;
}

// Fetch the coil of rope from the bank.
export function takeRope(sim) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cow;
  if (G?.kind !== 'cow' || G.result || G.rope !== 'coil') return false;
  goNear(sim, C.coil, 1.2);
  spend(sim, C.ropeMinutes);
  G.rope = 'held';
  G.line = null;
  return true;
}

// Tie the rope on: to the horns (a firm hold) or round the neck (kinder, but it slips).
export function tieRope(sim, where) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cow;
  if (G?.kind !== 'cow' || G.result || G.rope !== 'held' || !C.pullsNeeded[where]) return false;
  goNear(sim, C[where]);
  spend(sim, C.ropeMinutes);
  G.rope = where;
  G.line = sim.D.stock.ui.cow.roped[where];
  return true;
}

// Is this moment in the cow's heave? `phase` is where she is in her rhythm, 0 up to 1.
export function inHeave(sim, phase) {
  const H = sim.D.stock.cow.heave;
  return phase >= H.from && phase <= H.to;
}

// Pull on the rope. Every pull counts, so there's no timing test: pulling with
// her heave is quick, and pulling while she rests means waiting for her next
// heave, which costs a few more minutes (missMinutes).
export function pull(sim, phase) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cow;
  const U = sim.D.stock.ui.cow;
  if (G?.kind !== 'cow' || G.result || !cowReady(sim)) return false;
  // pulls come from the firm bank, so the first one walks you across
  if (dist(G.pos, C.pullSpot) > 1.2) walk(sim, C.pullSpot);
  const withHer = inHeave(sim, phase);
  spend(sim, C.pullMinutes + (withHer ? 0 : C.missMinutes));
  G.pulls++;
  if (!withHer) G.misses++;
  G.lastPull = withHer ? 'good' : 'miss';
  line(sim, withHer ? U.good : U.miss);
  if (G.pulls >= pullsNeeded(sim, G)) {
    G.line = U.freed;
    finish(sim, gradeBy(G.minutes, C.grade), { pulls: G.pulls, misses: G.misses });
  }
  return true;
}

/* ---------- shifting cattle ---------- */

function setupCattle(sim, G) {
  const C = sim.D.stock.cattle;
  const cows = [];
  for (let i = 0; i < C.count; i++) {
    cows.push({ x: C.cluster.x0 + sim.rand() * (C.cluster.x1 - C.cluster.x0),
      y: C.cluster.y0 + sim.rand() * (C.cluster.y1 - C.cluster.y0), out: false, kind: sim.chance(0.5) ? 'black' : 'hereford' });
  }
  Object.assign(G, { pos: { ...C.start }, cows, moves: 0, last: null, tired: false });
}

const gateMid = C => ({ x: C.grid.w, y: (C.gate.y0 + C.gate.y1) / 2 });

export const cattleLeft = G => G.cows.filter(c => !c.out).length;

// Where a helpful person would stand: behind the herd, on the far side from the gate.
export function herderSpot(sim) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cattle;
  const left = G.cows.filter(c => !c.out);
  const mid = { x: left.reduce((a, c) => a + c.x, 0) / left.length, y: left.reduce((a, c) => a + c.y, 0) / left.length };
  const g = gateMid(C);
  const d = Math.hypot(mid.x - g.x, mid.y - g.y) || 1;
  return { x: clamp(mid.x + (mid.x - g.x) / d * C.herderStand, 0.5, C.grid.w - 0.5), y: clamp(mid.y + (mid.y - g.y) / d * C.herderStand, 0.5, C.grid.h - 0.5) };
}

// One tick of the herd, with you standing at G.pos.
function cattleTick(sim, G) {
  const C = sim.D.stock.cattle;
  const left = G.cows.filter(c => !c.out);
  const mid = { x: left.reduce((a, c) => a + c.x, 0) / left.length, y: left.reduce((a, c) => a + c.y, 0) / left.length };
  const g = gateMid(C);
  const through = [];
  for (const c of left) {
    let vx = (sim.rand() - 0.5) * 2 * C.drift + (mid.x - c.x) * C.cohesion;
    let vy = (sim.rand() - 0.5) * 2 * C.drift + (mid.y - c.y) * C.cohesion;
    const d = dist(c, G.pos);
    if (d < C.alert) {
      const s = C.push * (1 - 0.5 * d / C.alert);
      const ax = d < 0.05 ? sim.rand() - 0.5 : (c.x - G.pos.x) / d;
      const ay = d < 0.05 ? sim.rand() - 0.5 : (c.y - G.pos.y) / d;
      vx += ax * s;
      vy += ay * s;
    }
    if (dist(c, g) < C.gateReach) { vx += (g.x - c.x) * C.gatePull; vy += (g.y - c.y) * C.gatePull; }
    c.x += vx;
    c.y += vy;
    const inGap = c.y > C.gate.y0 + 0.3 && c.y < C.gate.y1 - 0.3;
    if (c.x >= C.grid.w - 0.4 && inGap) { c.out = true; through.push(c); continue; }
    c.x = clamp(c.x, C.margin, C.grid.w - C.margin);
    c.y = clamp(c.y, C.margin, C.grid.h - C.margin);
  }
  return through.length;
}

// Stand somewhere new. The cattle step away from you, a few ticks' worth.
export function moveCattle(sim, x, y) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.cattle;
  const U = sim.D.stock.ui.cattle;
  if (G?.kind !== 'cattle' || G.result) return false;
  const to = { x: clamp(x, 0.5, C.grid.w - 0.5), y: clamp(y, 0.5, C.grid.h - 0.5) };
  spend(sim, C.moveMinutes + C.perSquare * dist(G.pos, to));
  G.pos = to;
  G.moves++;
  G.started = true;
  const before = G.cows.map(c => ({ x: c.x, y: c.y, out: c.out }));
  let out = 0;
  for (let t = 0; t < C.ticks && cattleLeft(G) > 0; t++) out += cattleTick(sim, G);
  G.last = { before, out };
  if (cattleLeft(G) === 0) {
    G.line = U.all;
    finish(sim, gradeBy(G.moves, C.grade), { moves: G.moves });
  } else if (G.moves >= C.maxMoves) {
    for (const c of G.cows) c.out = true;
    G.tired = true;
    G.line = U.tired;
    finish(sim, 'rough', { moves: G.moves });
  } else {
    G.line = out ? sim.pick(U.through) : sim.pick(U.steps);
  }
  return true;
}

// Play the cattle game helpfully (for tests): returns the moves it took.
export function autoCattle(sim) {
  const G = sim.S.stockGame;
  let guard = 0;
  while (!G.result && guard++ < 60) { const p = herderSpot(sim); moveCattle(sim, p.x, p.y); }
  return G.moves;
}

/* ---------- lifting sheep ---------- */

function setupSheep(sim, G) {
  const C = sim.D.stock.sheep;
  const n = C.count.min + sim.int(C.count.max - C.count.min + 1);
  const sheep = [];
  for (let i = 0; i < n; i++) {
    let p;
    for (let tries = 0; tries < 40; tries++) {
      p = { x: C.spread.x0 + sim.rand() * (C.spread.x1 - C.spread.x0), y: C.spread.y0 + sim.rand() * (C.spread.y1 - C.spread.y0) };
      if (sheep.every(s => dist(s, p) >= C.apart)) break;
    }
    sheep.push({ ...p, state: 'field', face: sim.chance(0.5) ? 1 : -1 });
  }
  Object.assign(G, { pos: { ...C.start }, sheep, carrying: null, lifted: 0 });
}

export const sheepLeft = G => G.sheep.filter(s => s.state !== 'over').length;

// Walk to a sheep and pick it up.
export function pickSheep(sim, i) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.sheep;
  const U = sim.D.stock.ui.sheep;
  const s = G?.sheep?.[i];
  if (G?.kind !== 'sheep' || G.result || G.carrying !== null || !s || s.state !== 'field') return false;
  spend(sim, dist(G.pos, s) * sim.D.stock.common.walkMinutes + C.pickMinutes);
  G.pos = { x: s.x, y: s.y };
  s.state = 'carried';
  G.carrying = i;
  G.started = true;
  line(sim, U.pick);
  return true;
}

// Carry the sheep to the fence at this spot and heave it over. Every lift is a bit more strain.
export function liftOver(sim, x) {
  const G = sim.S.stockGame;
  const C = sim.D.stock.sheep;
  const U = sim.D.stock.ui.sheep;
  if (G?.kind !== 'sheep' || G.result || G.carrying === null) return false;
  const to = { x: clamp(x, 0.5, C.grid.w - 0.5), y: C.fenceRow - 0.5 };
  spend(sim, dist(G.pos, to) * sim.D.stock.common.walkMinutes + C.liftMinutes);
  G.pos = to;
  const s = G.sheep[G.carrying];
  s.state = 'over';
  s.x = to.x;
  s.y = C.fenceRow + 0.9;
  G.carrying = null;
  G.lifted++;
  line(sim, U.over);
  if (sheepLeft(G) === 0) {
    G.line = U.all;
    finish(sim, gradeBy(G.minutes / G.sheep.length, C.grade));
  }
  return true;
}

// How sore the back is, as an index into ui.sheep.strainWords.
export function strainLevel(sim, G) {
  const C = sim.D.stock.sheep;
  return Math.min(3, Math.floor(G.lifted / C.soreRef * 3));
}

// Play the sheep game sensibly (for tests): nearest sheep first, straight to the fence.
export function autoSheep(sim) {
  const G = sim.S.stockGame;
  while (!G.result) {
    let best = -1;
    G.sheep.forEach((s, i) => { if (s.state === 'field' && (best < 0 || dist(G.pos, s) < dist(G.pos, G.sheep[best]))) best = i; });
    pickSheep(sim, best);
    liftOver(sim, G.sheep[best].x);
  }
  return G.lifted;
}
