// Jobs at a place: which are offered, how long they take, and what they do.
// Names, minutes and descriptions are in data/jobs.js; numbers in data/rates.js.
import { clamp } from './util.js';
import { playTrapLine, neededSteps as trapSteps, readTunnel, trapStep, finishTrapLine } from './trapline.js';
import { playPlanting, quickPlanting, hastyPlanting, finishPlanting } from './planting.js';
import { ROUND_JOBS, playRounds, neededSteps as roundSteps, roundStep, finishRounds } from './rounds.js';
import { autoNestCheck } from './nests.js';
import { playStock } from './stock.js';

// Is this job offered here right now?
function offered(sim, job, id) {
  const S = sim.S;
  const z = sim.z(id);
  const C = sim.D.calendar;
  switch (job) {
    case 'traps': return z.traps > 0;
    case 'bait': return !sim.has(id, 'base');
    case 'browse': return sim.has(id, 'browse');
    case 'fence': return z.fence !== null;
    case 'plant': return Boolean(sim.zd(id).plant) && C.plantingMonths.includes(S.mi);
    case 'nests': return sim.nestsIn(id).length > 0 && C.nestCheckMonths.includes(S.mi);
    case 'lift': return z.traps >= 3;
    case 'set': return S.carry > 0 && !sim.has(id, 'base');
    case 'hunter': return sim.has(id, 'base') && Boolean(S.know.pig || S.know.deer);
    case 'stock': return Boolean(S.stock && S.stock.seen && S.stock.zone === id);
    default: return false;
  }
}

export function jobMinutes(sim, job, id) {
  const D = sim.D;
  let m = D.jobs.find(j => j.id === job).min;
  if (sim.has(id, 'muddy') && sim.S.mud) m += sim.R.day.mudMinutes;
  if (job === 'plant' && D.weather.windyWeather.includes(sim.S.weather)) m += sim.R.day.windPlanting;
  return m;
}

// Why a job can't be done right now, or null if it can.
function blocked(sim, job, id) {
  const def = sim.D.jobs.find(j => j.id === job);
  if (!def.repeat && sim.S.done[job + ':' + id]) return 'done';
  if (sim.S.time + jobMinutes(sim, job, id) > sim.S.workEnd) return 'daylight';
  return null;
}

// The jobs offered at a place: { id, minutes, blocked } plus what the UI needs to describe them.
export function jobsAt(sim, id) {
  if (sim.S.phase !== 'day') return [];
  const S = sim.S;
  return sim.D.jobs.filter(j => offered(sim, j.id, id)).map(j => ({
    id: j.id,
    minutes: jobMinutes(sim, j.id, id),
    blocked: blocked(sim, j.id, id),
    vars: {
      traps: sim.z(id).traps, carry: S.carry, stock: S.stock?.kind,
      bogged: Boolean(S.stock && S.mud && sim.has(id, 'muddy')),
      exposed: Boolean(sim.zd(id).exposed && sim.shelterIn(id) < sim.R.plants.shelterNeeded),
      early: S.mi <= 2, weigh: S.mi === sim.D.calendar.fledgeMonth,
    },
  }));
}

// Do a job where you are. Returns false if it isn't offered or can't be done.
export function doJob(sim, job) {
  const S = sim.S;
  const R = sim.R;
  const id = S.loc;
  if (S.phase !== 'day' || !offered(sim, job, id) || blocked(sim, job, id)) return false;
  // The trap line is a mini-game (trapline.js); as a plain job it's played perfectly.
  if (job === 'traps') return Boolean(playTrapLine(sim));
  // Planting is a mini-game too (planting.js); as a plain job it's planted carefully.
  if (job === 'plant') return Boolean(playPlanting(sim));
  // The fence walk, bait round and torch round are mini-games too (rounds.js); played perfectly here.
  if (ROUND_JOBS.includes(job)) return Boolean(playRounds(sim, job));
  S.time += jobMinutes(sim, job, id);
  S.done[job + ':' + id] = true;
  const z = sim.z(id);
  const k = z.k;
  const say = (key, vars = {}) => sim.say(key, { zone: id, ...vars });

  if (job === 'bait') {
    z.bait = 100;
    const r = S.rodent;
    const level = r > R.rodents.baitHeavy ? 'heavy' : r > R.rodents.baitSome ? 'some' : 'little';
    k.bait = { v: S.v, level };
    say('bait', { level });
  }
  if (job === 'browse') {
    z.browse = 100;
    k.browse = { v: S.v };
    say('browse', { possums: 1 + sim.int(R.browse.possumsMax), rabbits: 1 + sim.int(R.browse.rabbitsMax) });
  }
  if (job === 'fence') {
    const breaks = Math.max(0, Math.round((100 - z.fence) / R.fence.perBreak));
    z.fence = 100;
    k.fence = { v: S.v, val: 100 };
    sim.refreshFenceFind(id);
    say('fence', { breaks });
    if (sim.D.calendar.fenceBounceMonths.includes(S.mi) && sim.lucky('fence', R.fence.bounceChance)) {
      say('fenceBounce');
      sim.note('fence');
    }
  }
  if (job === 'nests') autoNestCheck(sim);   // the hands-on check is NestScene (nests.js); the plain job is how the caretaker plays it
  if (job === 'lift') {
    z.traps -= 2;
    S.carry += 2;
    say('lift');
  }
  if (job === 'set') {
    z.traps += S.carry;
    say('set', { n: S.carry, total: z.traps });
    S.carry = 0;
  }
  if (job === 'hunter') {
    const got = [];
    if (S.know.pig) { S.pig = null; S.know.pig = null; got.push('pig'); }
    if (S.know.deer) { S.deer = null; S.know.deer = null; got.push('deer'); }
    sim.note('hunter');
    say('hunter', { got });
  }
  if (job === 'stock') playStock(sim);    // the plain job; the real game is in stock.js (startStock)
  return true;
}

// Jobs that open a mini-game, and so can also be done quickly in one click.
export const MINI_JOBS = ['traps', 'bait', 'browse', 'fence', 'plant', 'nests', 'stock'];

// The "Quick" button: do a mini-game job in one click, a bit less carefully than
// you would by hand: with rates.quick.missChance, one trap or stop gets no care
// (planting: rates.quick.skipShare of the seedlings go anywhere). Returns the
// result, or false. The nest check and stock are done as their plain jobs.
export function quickJob(sim, job) {
  const S = sim.S;
  const id = S.loc;
  if (!MINI_JOBS.includes(job)) return false;
  if (S.phase !== 'day' || !offered(sim, job, id) || blocked(sim, job, id)) return false;
  // Which item gets missed: one at random among the first few, or none.
  const miss = sim.chance(sim.R.quick.missChance) ? sim.int(3) : -1;
  let i = 0;
  const hasty = needed => item => (i++ === miss ? [] : needed(item));
  if (job === 'traps') return playTrapLine(sim, hasty(t => trapSteps(sim, t)));
  if (ROUND_JOBS.includes(job)) return playRounds(sim, job, hasty(st => roundSteps(sim, st)));
  if (job === 'plant') return quickPlanting(sim);
  return doJob(sim, job) && { grade: null };
}

// "Finish quickly", part-way through a trap line, round or planting: the rest is
// done the way the Quick button does it (one of the next few traps or stops may
// get missed; some seedlings go anywhere). What you've already done by hand
// stays. Leaves the mini-game on its results, so the scene can show them.
// Returns the result, or false if there's nothing to finish.
export function finishQuick(sim) {
  const S = sim.S;
  const miss = () => (sim.chance(sim.R.quick.missChance) ? sim.int(3) : -1);
  if (S.phase === 'trapline' && !S.trapLine.result) {
    const line = S.trapLine;
    readTunnel(sim);
    const skip = miss();
    for (let i = 0; line.at < line.traps.length; i++) {
      const at = line.at;
      const t = line.traps[at];
      const h = t.has;
      // the steps this trap still needs, from how it is now
      const steps = i === skip ? [] : [...(h.animal ? ['clear'] : []), ...(h.set ? [] : ['set']),
        ...(h.bait === 'stale' ? ['bin', 'bait'] : h.bait === 'none' ? ['bait'] : [])];
      for (const step of ['open', ...steps, 'close']) if (line.at === at) trapStep(sim, step);
    }
    finishTrapLine(sim);
    return line.result;
  }
  if (S.phase === 'rounds' && !S.rounds.result) {
    const r = S.rounds;
    const skip = miss();
    for (let i = 0; r.at < r.stops.length; i++) {
      const at = r.at;
      if (i !== skip) for (const [step, arg] of roundSteps(sim, r.stops[at])) if (r.at === at) roundStep(sim, step, arg);
      if (r.at === at) roundStep(sim, 'close');
    }
    finishRounds(sim);
    return r.result;
  }
  if (S.phase === 'planting' && !S.planting.result) {
    hastyPlanting(sim);
    finishPlanting(sim);
    return S.planting.result;
  }
  return false;
}
