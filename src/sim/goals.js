// The goal for each visit (data/goals.js): one thing to aim for today, picked
// when the visit starts. Progress is worked out from what's been done
// (S.done) and today's tallies (S.today), so nothing has to remember to
// update it. checkGoal() notices when it's met, says so, and adds luck.
//
// S.goal = { k, need, zone?, jobs?, met }      (null on a save from before goals)
// S.today = { caught, greatLines }             (reset each visit)

// Kinds that make sense this month, each with its target picked.
function candidates(sim) {
  const S = sim.S;
  const C = sim.D.calendar;
  const G = sim.D.goals;
  const out = [];
  const work = sim.zones.filter(d => !d.flags.includes('base')).map(d => d.id);
  for (const kind of G.kinds) {
    if (kind.months === 'planting' && !C.plantingMonths.includes(S.mi)) continue;
    if (kind.months === 'nestCheck' && !C.nestCheckMonths.includes(S.mi)) continue;
    const goal = { k: kind.k, need: kind.need ?? 1 };
    if (kind.k === 'fences') goal.need = work.filter(id => sim.z(id).fence !== null).length;
    if (kind.k === 'plant') goal.zone = sim.pick(work.filter(id => sim.zd(id).plant));
    if (kind.k === 'nests') {
      const withNests = work.filter(id => sim.nestsIn(id).length > 0);
      if (!withNests.length) continue;
      goal.zone = sim.pick(withNests);
    }
    if (kind.k === 'area') {
      // An area with enough jobs that all of them, and the walk there and back, fit in the day.
      const fits = work.map(id => {
        const jobs = sim.D.jobs.filter(j => !j.minor && offeredAt(sim, j.id, id));
        const minutes = jobs.reduce((n, j) => n + j.min, 0) + 2 * sim.walkCost(S.loc, id);
        return { id, jobs: jobs.map(j => j.id), ok: jobs.length >= kind.minJobs && S.time + minutes <= S.workEnd };
      }).filter(a => a.ok);
      if (!fits.length) continue;
      const a = sim.pick(fits);
      goal.zone = a.id;
      goal.jobs = a.jobs;
    }
    out.push({ goal, weight: kind.weight });
  }
  return out;
}

// Is a job offered at an area (asked without walking there)?
function offeredAt(sim, job, id) {
  const here = sim.S.loc;
  sim.S.loc = id;
  const on = sim.jobsHere().some(j => j.id === job);
  sim.S.loc = here;
  return on;
}

// Pick today's goal (at the start of a visit). Never the same kind as last time.
export function pickGoal(sim) {
  const S = sim.S;
  const last = S.goal?.k;
  S.today = { caught: 0, greatLines: 0 };
  let list = candidates(sim).filter(c => c.goal.k !== last);
  if (!list.length) list = candidates(sim);
  const total = list.reduce((n, c) => n + c.weight, 0);
  let x = sim.rand() * total;
  const chosen = list.find(c => (x -= c.weight) < 0) ?? list[0];
  S.goal = chosen ? { ...chosen.goal, met: false } : null;
  if (S.goal) S.ys.goals = { set: (S.ys.goals?.set ?? 0) + 1, met: S.ys.goals?.met ?? 0 };
}

// How far along today's goal is: { have, need }, or null if there isn't one.
export function goalProgress(sim) {
  const S = sim.S;
  const g = S.goal;
  if (!g) return null;
  const done = prefix => Object.keys(S.done).filter(key => key.startsWith(prefix + ':')).length;
  const T = S.today ?? { caught: 0, greatLines: 0 };
  let have = 0;
  switch (g.k) {
    case 'pests': have = T.caught; break;
    case 'greatLines': have = T.greatLines; break;
    case 'fences': have = done('fence'); break;
    case 'bait': have = done('bait'); break;
    case 'plant': have = S.done['plant:' + g.zone] ? 1 : 0; break;
    case 'nests': have = S.done['nests:' + g.zone] ? 1 : 0; break;
    case 'area': have = g.jobs.filter(j => S.done[j + ':' + g.zone]).length; break;
    default: have = 0;
  }
  const need = g.k === 'area' ? g.jobs.length : g.need;
  return { have: Math.min(have, need), need };
}

// Has the goal just been met? If so, say so, count it and add notebook luck.
export function checkGoal(sim) {
  const S = sim.S;
  const g = S.goal;
  if (!g || g.met) return false;
  const p = goalProgress(sim);
  if (p.have < p.need) return false;
  g.met = true;
  S.ys.goals = { set: S.ys.goals?.set ?? 1, met: (S.ys.goals?.met ?? 0) + 1 };
  S.goalsMet = (S.goalsMet ?? 0) + 1;
  S.luck = (S.luck ?? 0) + sim.D.goals.luck;
  sim.say('goalMet', { goal: g.k, zone: g.zone, n: p.need });
  return true;
}
