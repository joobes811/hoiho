// The trap line mini-game's rules (build step D). Walk and inspect: stop at
// the tracking tunnel, then each trap in turn, read it, and choose an action.
//
//   startTrapLine(sim)        set up the line where you are (S.trapLine; phase 'trapline')
//   readTunnel(sim)           look at the tunnel card (the first stop)
//   trapStep(sim, step)       a hands-on step at the current trap: open, clear,
//                             set, bin, bait, close (close walks on to the next)
//   finishTrapLine(sim)       apply the results to the reserve; S.trapLine.result
//   closeTrapLine(sim)        back to the day (phase 'day')
//
// Each trap's state comes from the reserve: catches from the local stoat and
// rodent levels (the same sums as the plain job had), stale bait from how
// long since the line was last rebaited. A trap left empty, set and freshly
// baited is working; the share of working traps sets the line's freshness,
// which is what protects the nests for the coming month.
import { clamp } from './util.js';

export function startTrapLine(sim) {
  const S = sim.S;
  const R = sim.R;
  const id = S.loc;
  const job = sim.jobsHere().find(j => j.id === 'traps');
  if (!job || job.blocked) return false;
  const z = sim.z(id);
  const L = R.trapLine;
  const T = z.traps;

  // Catches are uncommon: each trap has its own small chance of a stoat or a
  // rat, and once in a while a line has a ferret. Most checks are a rebait.
  const ls = sim.localStoat(id);
  const lr = sim.localRodent(id);
  const order = Array.from({ length: T }, () =>
    sim.chance(ls / 100 * L.stoatCatch) ? 'stoat' : sim.chance(lr / 100 * L.ratCatch) ? 'rat' : null);
  const empty = order.flatMap((a, i) => (a ? [] : [i]));
  if (empty.length && sim.lucky('ferret', R.stoats.ferretChance)) order[sim.pick(empty)] = 'ferret';

  const D = sim.D.trapline;
  const variant = list => sim.int(list.length);
  const traps = order.map(animal => {
    let state = 'fine';
    if (animal) state = 'catch';
    else if (sim.chance(L.sprungChance)) state = 'sprung';
    else if (sim.chance(Math.min(1, L.staleBase + (100 - z.tf) / 100 * L.staleScale))) state = 'stale';
    const texts = state === 'catch' ? D.states.catch.text[animal] : D.states[state].text;
    // has: what's in the box right now, changed by your steps.
    return { state, animal, text: variant(texts), has: { animal, ...D.states[state].has }, opened: false, overdone: false };
  });

  const level = (v, few, many) => (v >= many ? 'many' : v >= few ? 'some' : 'none');
  S.trapLine = {
    zone: id, at: 0, minutes: 0, traps,
    tunnel: { stoat: level(ls, L.tunnelFew, L.tunnelMany), rat: level(sim.localRodent(id), L.ratFew, L.ratMany), read: false },
    moveHint: ls < L.moveHintBelow && T >= 3,
    seed: sim.int(1e9),             // where the route runs in the close-up (src/ui/trap-route.js)
    result: null,
  };
  S.phase = 'trapline';
  return true;
}

// Time passes as you go, so the day's clock stays honest even mid-line.
function spend(sim, minutes) {
  sim.S.time += minutes;
  sim.S.trapLine.minutes += minutes;
}

export function readTunnel(sim) {
  const line = sim.S.trapLine;
  if (!line || line.tunnel.read) return false;
  line.tunnel.read = true;
  sim.z(line.zone).k.sign = { v: sim.S.v, level: sim.localStoat(line.zone) };
  spend(sim, sim.R.trapLine.tunnelMinutes);
  return true;
}

// Is this trap ready to catch? Empty, jaws set, fresh egg.
export function isWorking(trap) {
  return !trap.has.animal && trap.has.set && trap.has.bait === 'fresh';
}

// Can this step be done at the current trap right now?
export function canStep(sim, step) {
  const line = sim.S.trapLine;
  if (!line || !line.tunnel.read || line.at >= line.traps.length) return false;
  const t = line.traps[line.at];
  const h = t.has;
  if (step === 'open') return !t.opened;
  if (!t.opened) return false;
  if (step === 'clear') return Boolean(h.animal);
  if (step === 'set') return !h.animal && !h.set;
  if (step === 'bin') return h.bait !== 'none';
  if (step === 'bait') return h.bait === 'none';
  return step === 'close';
}

export function trapStep(sim, step) {
  if (!canStep(sim, step)) return false;
  const line = sim.S.trapLine;
  const t = line.traps[line.at];
  const h = t.has;
  if (step === 'open') t.opened = true;
  else if (step === 'clear') h.animal = null;
  else if (step === 'set') h.set = true;
  else if (step === 'bin') {
    if (h.bait === 'fresh') t.overdone = true;
    h.bait = 'none';
  } else if (step === 'bait') h.bait = 'fresh';
  spend(sim, sim.D.trapline.steps[step].min);
  if (step === 'close') {
    if (line.at < line.traps.length - 1) spend(sim, sim.R.trapLine.walkMinutes);
    line.at++;
  }
  return true;
}

// The steps a careful caretaker takes at this trap.
export function neededSteps(sim, trap) {
  const h = sim.D.trapline.states[trap.state].has;
  return ['open', ...(trap.animal ? ['clear'] : []), ...(h.set ? [] : ['set']),
    ...(h.bait === 'stale' ? ['bin', 'bait'] : h.bait === 'none' ? ['bait'] : []), 'close'];
}

// How a trap was left, for the recap: working, or what's wrong with it.
export function leftAs(trap) {
  if (isWorking(trap)) return 'working';
  if (trap.has.animal) return 'catch';
  if (!trap.has.set) return 'sprung';
  return trap.has.bait;          // 'stale' or 'none'
}

export function finishTrapLine(sim) {
  const S = sim.S;
  const line = S.trapLine;
  if (!line || line.result || line.at < line.traps.length) return false;
  const R = sim.R;
  const working = line.traps.filter(isWorking).length;
  const overdone = line.traps.filter(t => t.overdone).length;
  const total = line.traps.length;
  const share = total ? working / total : 1;
  const grade = working === total ? 'great' : share >= R.trapLine.good ? 'good' : 'rough';

  // The animals were caught whatever you did next; clearing them is what lets the trap work again.
  const stoats = line.traps.filter(t => t.animal === 'stoat').length;
  const rats = line.traps.filter(t => t.animal === 'rat').length;
  const ferret = line.traps.some(t => t.animal === 'ferret');
  const z = sim.z(line.zone);
  z.tf = Math.round(100 * share);
  S.stoat = clamp(S.stoat - stoats * R.stoats.perCatch, R.stoats.floor, 100);
  S.ys.caught.stoat += stoats;
  S.ys.caught.rat += rats;
  z.k.traps = { v: S.v, st: stoats, rat: rats, grade };
  S.done['traps:' + line.zone] = true;
  S.today ??= { caught: 0, greatLines: 0 };        // for today's goal (goals.js)
  S.today.caught += stoats + rats + (ferret ? 1 : 0);
  if (grade === 'great') S.today.greatLines++;
  sim.say('trapLine', { zone: line.zone, grade, working, total, stoats, rats });
  if (ferret) {
    S.ys.caught.ferret++;
    sim.say('ferret', { zone: line.zone });
    sim.note('ferret');
  }
  line.result = { grade, working, total, overdone, stoats, rats, ferret, minutes: line.minutes };
  return true;
}

export function closeTrapLine(sim) {
  const S = sim.S;
  if (!S.trapLine?.result) return false;
  S.trapLine = null;
  S.phase = 'day';
  return true;
}

// Play a whole line with a chooser (trap => list of steps). Used by the plain
// 'traps' job, the automatic caretaker and the tests. Steps that don't apply
// are skipped, and the lid is always shut at the end.
export function playTrapLine(sim, choose = trap => neededSteps(sim, trap)) {
  if (!startTrapLine(sim)) return false;
  readTunnel(sim);
  const line = sim.S.trapLine;
  while (line.at < line.traps.length) {
    const at = line.at;
    for (const step of choose(line.traps[at])) if (line.at === at) trapStep(sim, step);
    if (line.at === at) { trapStep(sim, 'open'); trapStep(sim, 'close'); }
  }
  finishTrapLine(sim);
  const result = line.result;
  closeTrapLine(sim);
  return result;
}
