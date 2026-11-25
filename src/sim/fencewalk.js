// The fence walk's rules: walk the fence in sections. Each section may be
// sound, sagging, have a broken strand or a rotten post, and may have sign
// that something got through. Mend what needs mending, and read the sign.
//
// How many sections are damaged comes from the fence's condition, the same
// sum the plain job used: (100 - condition) / rates.fence.perBreak. The sign
// comes from the pig, deer or stock the simulation says are in this area.
// Mending everything puts the fence back to 100, as the plain job did.
import { clamp } from './util.js';
import { weighted } from './round-util.js';

// What an intruder's sign looks like, by what the simulation has in the area.
function intruders(sim, zone) {
  const S = sim.S;
  const list = [];
  if (S.pig === zone) list.push('pig');
  if (S.deer === zone) list.push('deer');
  if (S.stock && S.stock.zone === zone) list.push(S.stock.kind === 'sheep' ? 'sheep' : 'cow');
  return list;
}

function makeStops(sim, zone) {
  const R = sim.R;
  const W = R.fenceWalk;
  const D = sim.D.fencewalk;
  const n = W.sections;
  const z = sim.z(zone);
  const breaks = clamp(Math.round((100 - z.fence) / R.fence.perBreak), 0, n);
  const stops = Array.from({ length: n }, () => ({ fix: null, todo: [], sign: null, text: 0 }));
  for (const i of sim.shuffle([...Array(n).keys()]).slice(0, breaks)) {
    const fix = weighted(sim, W.breakOdds);
    stops[i].fix = fix;
    stops[i].todo = [...D.fixes[fix].steps];
  }
  // Real sign goes where something would get through: broken sections first.
  const free = sim.shuffle(stops.map((s, i) => i));
  for (const kind of intruders(sim, zone)) {
    const pool = free.filter(i => !stops[i].sign);
    const i = pool.find(j => stops[j].fix) ?? pool[0];
    stops[i].sign = { kind, read: null, right: false };
  }
  // Now and then harmless possum prints, so reading the sign is a real question.
  for (const s of stops) if (!s.sign && sim.chance(W.decoyChance)) s.sign = { kind: 'possum', read: null, right: false };
  for (const s of stops) s.text = sim.int(D.sections[s.fix ?? 'sound'].length);
  return stops;
}

export const isMended = stop => !stop.fix || stop.todo.length === 0;

export const fenceWalk = {
  job: 'fence',
  data: 'fencewalk',
  rates: 'fenceWalk',
  makeStops,

  can(sim, stop, step, arg) {
    if (step === 'read') return Boolean(stop.sign) && !stop.sign.read && sim.D.fencewalk.signOrder.includes(arg);
    return stop.todo[0] === step;           // the steps go in order: strain, then staple, and so on
  },

  apply(sim, stop, step, arg) {
    if (step === 'read') {
      stop.sign.read = arg;
      stop.sign.right = arg === stop.sign.kind;
      return;
    }
    stop.todo.shift();
  },

  needed(sim, stop) {
    return [...stop.todo.map(s => [s]), ...(stop.sign && !stop.sign.read ? [['read', stop.sign.kind]] : [])];
  },

  finish(sim, r) {
    const S = sim.S;
    const R = sim.R;
    const z = sim.z(r.zone);
    const problems = r.stops.filter(s => s.fix);
    const fixed = problems.filter(isMended).length;
    const signs = r.stops.filter(s => s.sign);
    const right = signs.filter(s => s.sign.right).length;
    const left = problems.length - fixed;
    // All mended: back to 100. Otherwise the fence is only as good as the breaks you left (never worse than it was).
    z.fence = left === 0 ? 100 : Math.max(z.fence, clamp(100 - left * R.fence.perBreak));
    z.k.fence = { v: S.v, val: z.fence };
    sim.refreshFenceFind(r.zone);
    const grade = left === 0 && right === signs.length ? 'great'
      : (problems.length ? fixed / problems.length : 1) >= R.fenceWalk.good ? 'good' : 'rough';
    sim.say('fence', { zone: r.zone, breaks: fixed });
    if (left === 0 && fixed && sim.D.calendar.fenceBounceMonths.includes(S.mi) && sim.lucky('fence', R.fence.bounceChance)) {
      sim.say('fenceBounce', { zone: r.zone });
      sim.note('fence');
    }
    // Reading sign right marks the place: pig and deer sign means ringing the hunter is worth it.
    const marked = signs.filter(s => s.sign.right && ['pig', 'deer'].includes(s.sign.kind)).map(s => s.sign.kind);
    for (const kind of marked) {
      S.know[kind] ??= { zone: r.zone, v: S.v };
      sim.say('fenceMarked', { zone: r.zone, what: kind });
    }
    // Every sign read right goes in your pest notes on the map (possum prints too).
    for (const s of signs) if (s.sign.right) sim.spot(s.sign.kind, r.zone);
    const stock = signs.some(s => s.sign.right && ['cow', 'sheep'].includes(s.sign.kind));
    return { grade, fixed, problems: problems.length, left, signs: signs.length, right, marked, stock };
  },
};
