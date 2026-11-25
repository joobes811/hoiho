// An automatic caretaker, for tools/simulate.js and the tests. It plays a
// visit the way a sensible person might: walk to the nearest area not yet
// visited, do whatever upkeep is due there, and head to the count at dusk.
//
// Policies:
//   busy  does the upkeep described below (a reasonable player)
//   idle  goes straight to the count every visit (the colony with no help)
//
// The thresholds below are the caretaker's habits, not game balance, so they
// live here rather than in data/.
const HABITS = {
  trapsBelow: 75,     // rebait traps when freshness is at or below this
  baitBelow: 50,      // top up bait at or below this
  fenceBelow: 80,     // mend fences at or below this
  browseBelow: 40,    // reset possum and rabbit traps at or below this
};

function wanted(sim, id) {
  const S = sim.S;
  const z = sim.z(id);
  const list = ['stock', 'hunter'];
  if (z.tf <= HABITS.trapsBelow) list.push('traps');
  if (z.bait <= HABITS.baitBelow) list.push('bait');
  if (z.fence !== null && z.fence <= HABITS.fenceBelow) list.push('fence');
  if (z.browse <= HABITS.browseBelow) list.push('browse');
  list.push('plant');          // the plain job plants flax where it's exposed and short of shelter, shrubs elsewhere
  if (S.mi === sim.D.calendar.fledgeMonth) list.push('nests');   // weigh chicks; light ones go to rehab
  return list;
}

function workHere(sim) {
  const offered = new Map(sim.jobsHere().map(j => [j.id, j]));
  for (const job of wanted(sim, sim.S.loc)) {
    const j = offered.get(job);
    if (j && !j.blocked) sim.doJob(job);
  }
}

export function playVisit(sim, policy = 'busy') {
  if (policy === 'busy') {
    const visited = new Set();
    for (;;) {
      visited.add(sim.S.loc);
      workHere(sim);
      const next = sim.zones.map(z => z.id).filter(id => !visited.has(id))
        .sort((a, b) => sim.steps(sim.S.loc, a) - sim.steps(sim.S.loc, b))[0];
      if (!next || !sim.goTo(next)) break;
    }
  }
  sim.toHillside();
  sim.endCount();
  if (sim.S.phase === 'report') sim.continueReport();
}

// Play until `years` years have finished. Returns the yearly history.
export function playYears(sim, years, policy = 'busy', onVisit = null) {
  const end = sim.S.year + years;
  while (sim.S.year < end) {
    const before = { year: sim.S.year, mi: sim.S.mi, log: sim.S.log, found: sim.S.found };
    playVisit(sim, policy);
    onVisit?.(before, sim);
  }
  return sim.S.history;
}
