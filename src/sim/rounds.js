// The "rounds" mini-games, built the same way as the trap line: a route of
// stops, a hands-on close-up at each, and a graded result at the end.
//
//   fence   Walk and mend the fence, and read any sign (fencewalk.js)
//   bait    The bait-station round (baitrounds.js)
//   browse  Possum and rabbit round by torchlight (torchrounds.js)
//
// Each kind has the same shape (see the three files): job, makeStops, can,
// apply, needed, finish. This file is the shared plumbing:
//
//   startRounds(sim, kind)        set up the round where you are (S.rounds; phase 'rounds')
//   canRoundStep(sim, step, arg)  can this step be done at the current stop?
//   roundStep(sim, step, arg)     do it ('close' walks on to the next stop)
//   finishRounds(sim)             apply the results to the reserve; S.rounds.result
//   closeRounds(sim)              back to the day (phase 'day')
//   playRounds(sim, kind, choose) play a whole round without a screen (the plain job,
//                                 the automatic caretaker and the tests use this)
import { fenceWalk } from './fencewalk.js';
import { baitRounds } from './baitrounds.js';
import { torchRounds } from './torchrounds.js';

export const KINDS = { fence: fenceWalk, bait: baitRounds, browse: torchRounds };

// The jobs that are rounds, so the map knows to open a scene instead of just doing them.
export const ROUND_JOBS = Object.keys(KINDS);

export function startRounds(sim, kind) {
  const S = sim.S;
  const mod = KINDS[kind];
  const job = sim.jobsHere().find(j => j.id === mod.job);
  if (!job || job.blocked) return false;
  const zone = S.loc;
  S.rounds = { kind, zone, at: 0, minutes: 0, stops: mod.makeStops(sim, zone), result: null };
  S.phase = 'rounds';
  return true;
}

// Time passes as you go, so the day's clock stays honest even mid-round.
export function spend(sim, minutes) {
  sim.S.time += minutes;
  sim.S.rounds.minutes += minutes;
}

export function currentStop(sim) {
  const r = sim.S.rounds;
  return r && r.at < r.stops.length ? r.stops[r.at] : null;
}

export function canRoundStep(sim, step, arg) {
  const stop = currentStop(sim);
  if (!stop) return false;
  if (step === 'close') return true;
  return KINDS[sim.S.rounds.kind].can(sim, stop, step, arg);
}

export function roundStep(sim, step, arg) {
  if (!canRoundStep(sim, step, arg)) return false;
  const r = sim.S.rounds;
  const mod = KINDS[r.kind];
  const D = sim.D[mod.data];
  if (step !== 'close') mod.apply(sim, currentStop(sim), step, arg);
  spend(sim, D.steps[step].min);
  if (step === 'close') {
    if (r.at < r.stops.length - 1) spend(sim, sim.R[mod.rates].walkMinutes);
    r.at++;
  }
  return true;
}

export function finishRounds(sim) {
  const r = sim.S.rounds;
  if (!r || r.result || r.at < r.stops.length) return false;
  const mod = KINDS[r.kind];
  r.result = { ...mod.finish(sim, r), minutes: r.minutes };
  sim.S.done[mod.job + ':' + r.zone] = true;
  return true;
}

export function closeRounds(sim) {
  const S = sim.S;
  if (!S.rounds?.result) return false;
  S.rounds = null;
  S.phase = 'day';
  return true;
}

// The steps a careful caretaker takes at this stop: a list of [step, arg].
export function neededSteps(sim, stop) {
  return KINDS[sim.S.rounds.kind].needed(sim, stop);
}

// Play a whole round with a chooser (stop => list of [step, arg]). Steps that
// don't apply are skipped. Returns the result, or false if it couldn't start.
export function playRounds(sim, kind, choose = stop => neededSteps(sim, stop)) {
  if (!startRounds(sim, kind)) return false;
  const r = sim.S.rounds;
  while (r.at < r.stops.length) {
    const at = r.at;
    for (const [step, arg] of choose(r.stops[at])) if (r.at === at) roundStep(sim, step, arg);
    if (r.at === at) roundStep(sim, 'close');
  }
  finishRounds(sim);
  const result = r.result;
  closeRounds(sim);
  return result;
}

// Whole rounds played with the careful chooser, one per kind.
export const playFenceWalk = (sim, choose) => playRounds(sim, 'fence', choose);
export const playBaitRounds = (sim, choose) => playRounds(sim, 'bait', choose);
export const playTorchRounds = (sim, choose) => playRounds(sim, 'browse', choose);
