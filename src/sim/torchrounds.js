// The possum and rabbit round's rules, by torchlight: at each stop, find the
// eyes and sign in the dark, then deal with the trap (bag any catch, reset
// the spring, add fresh lure).
//
// How busy the dark is comes from the browsing pressure here, which falls as
// your control rises. A trap is working when it is empty, set and lured; the
// share of working traps sets the browse control, and all working is 100, as
// the plain job gave.
import { weighted } from './round-util.js';

function makeStops(sim, zone) {
  const R = sim.R;
  const W = R.torchRounds;
  const D = sim.D.torchrounds;
  const pressure = sim.browsePressure(zone) / R.browse.pressure;     // 0 (none) to 1 (no control)
  const animal = () => (sim.chance(W.rabbitShare) ? 'rabbit' : 'possum');
  return Array.from({ length: W.stops }, () => {
    const finds = [];
    if (sim.chance(W.eyesChance * pressure)) finds.push({ kind: animal() });
    if (sim.chance(W.moreporkChance)) finds.push({ kind: 'morepork' });
    if (sim.chance(W.signChance * (0.4 + 0.6 * pressure))) {
      const first = weighted(sim, W.signOdds);
      finds.push({ kind: first });
      if (sim.chance(W.moreSignChance)) {
        const { [first]: _, ...rest } = W.signOdds;
        finds.push({ kind: weighted(sim, rest) });
      }
    }
    const spots = sim.shuffle(D.spots);
    finds.forEach((f, i) => { [f.x, f.y] = spots[i]; f.spotted = false; });

    const catchAnimal = sim.chance(W.catchChance * pressure) ? animal() : null;
    let state = 'working';
    if (catchAnimal) state = 'catch';
    else if (sim.chance(W.sprungChance)) state = 'sprung';
    else if (sim.chance(W.lureGoneChance)) state = 'nolure';
    const texts = state === 'catch' ? D.states.catch.text[catchAnimal] : D.states[state].text;
    const setting = sim.pick(Object.keys(D.settings));
    return { setting, finds, state, animal: catchAnimal, text: sim.int(texts.length), has: { animal: catchAnimal, ...D.states[state].has } };
  });
}

export const isWorking = stop => !stop.has.animal && stop.has.set && stop.has.lure;

export const torchRounds = {
  job: 'browse',
  data: 'torchrounds',
  rates: 'torchRounds',
  makeStops,

  can(sim, stop, step, arg) {
    const h = stop.has;
    if (step === 'spot') return Boolean(stop.finds[arg]) && !stop.finds[arg].spotted;
    if (step === 'clear') return Boolean(h.animal);
    if (step === 'set') return !h.animal && !h.set;
    if (step === 'lure') return !h.animal && !h.lure;
    return false;
  },

  apply(sim, stop, step, arg) {
    if (step === 'spot') stop.finds[arg].spotted = true;
    else if (step === 'clear') stop.has.animal = null;
    else if (step === 'set') stop.has.set = true;
    else if (step === 'lure') stop.has.lure = true;
  },

  needed(sim, stop) {
    const h = stop.has;
    return [...stop.finds.map((f, i) => ['spot', i]), ...(h.animal ? [['clear']] : []),
      ...(h.set ? [] : [['set']]), ...(h.lure ? [] : [['lure']])];
  },

  finish(sim, r) {
    const S = sim.S;
    const D = sim.D.torchrounds;
    const working = r.stops.filter(isWorking).length;
    const total = r.stops.length;
    const finds = r.stops.reduce((s, t) => s + t.finds.length, 0);
    const found = r.stops.reduce((s, t) => s + t.finds.filter(f => f.spotted).length, 0);
    const share = working / total;
    const possums = r.stops.filter(t => t.animal === 'possum').length;
    const rabbits = r.stops.filter(t => t.animal === 'rabbit').length;
    const z = sim.z(r.zone);
    z.browse = Math.round(100 * share);
    z.k.browse = { v: S.v, possums, rabbits };
    sim.say('browse', { zone: r.zone, possums, rabbits });
    S.today ??= { caught: 0, greatLines: 0 };        // for today's goal (goals.js)
    S.today.caught += possums + rabbits;
    const possumSigns = r.stops.reduce((s, t) => s + t.finds.filter(f => f.spotted && D.finds[f.kind].animal === 'possum').length, 0);
    // pest notes for the map: animals caught, and sign you spotted
    if (possums) sim.spot('possum', r.zone, 'caught');
    if (rabbits) sim.spot('rabbit', r.zone, 'caught');
    for (const t of r.stops) for (const f of t.finds) if (f.spotted && D.finds[f.kind].animal) sim.spot(D.finds[f.kind].animal, r.zone, D.finds[f.kind].kind === 'eyes' ? 'seen' : 'sign');
    const grade = working === total && found === finds ? 'great' : share >= sim.R.torchRounds.good ? 'good' : 'rough';
    return { grade, working, total, finds, found, possums, rabbits, possumSigns };
  },
};
