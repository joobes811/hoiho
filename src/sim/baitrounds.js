// The bait-station rounds' rules: at each station open the lid, check the
// pellets, bin any mouldy bait, and tip in the right number of scoops of the
// right bait.
//
// How much was taken comes from the rodent level, the same thresholds the
// plain job used (rates.rodents baitHeavy / baitSome). A full station holds
// `capacity` scoops. Too few leaves a gap; too many spills and is wasted.
// The share of wells left full sets the bait level; all full is 100, as the
// plain job gave.
//
// Each visit varies: the teeth marks and droppings say whether a rat or a
// mouse has been eating (refill with that bait), the station may have been
// knocked over by a possum, hold a weta or slug, have a wasp nest beside it
// in late summer, or have a live mouse in or by it that you can whack with
// your boot. None of the extras change how much bait there is, so the
// careful caretaker's results are as before; they only decide great or not.
import { weighted } from './round-util.js';

function makeStops(sim) {
  const R = sim.R;
  const W = R.baitRounds;
  const level = rodentLevel(sim);
  const wet = sim.D.calendar.muddyMonths.includes(sim.S.mi);
  return Array.from({ length: W.stations }, () => {
    let take = weighted(sim, W.takeOdds[level]);
    let fill = W.capacity - Math.round(W.capacity * W.missing[take]);
    const tipped = sim.chance(W.tippedChance);
    if (tipped) { take = 'none'; fill = 0; }                 // the bait is scattered over the ground
    const mouldy = !tipped && fill > 0 && sim.chance(W.mouldChance * (wet ? W.mouldWetFactor : 1));
    const eater = take === 'none' ? null : sim.chance(W.ratShare) ? 'rat' : 'mouse';
    const stop = {
      take, text: sim.int(sim.D.baitrounds.take[take].length),
      droppings: eater, eater,
      mouse: null,
      tipped,
      guest: !tipped && sim.chance(W.guestChance) ? weighted(sim, W.guestOdds) : null,
      nest: W.waspMonths.includes(sim.S.mi) && sim.chance(W.waspChance),
      mouldy, wasMouldy: mouldy,         // wasMouldy stays for the recap after the bait is binned
      fill, added: [], spilled: 0, opened: false, checked: false,
    };
    if (sim.chance(W.mouseOdds[take])) {
      stop.mouse = { where: weighted(sim, W.mouseWhere), need: Number(weighted(sim, W.mouseNeed)), swings: 0, fate: null };
    }
    return stop;
  });
}

export function rodentLevel(sim) {
  const r = sim.S.rodent;
  const R = sim.R.rodents;
  return r > R.baitHeavy ? 'heavy' : r > R.baitSome ? 'some' : 'little';
}

// Scoops of the wrong bait for what has been eating here (rats turn up their noses at mouse pellets).
export const wrongCount = stop => (stop.eater ? (stop.added ?? []).filter(t => t !== stop.eater).length : 0);

// How much usable bait is in a station (mouldy bait and the wrong sort are no use).
export const usable = stop => (stop.mouldy ? 0 : stop.fill - wrongCount(stop));

// A live mouse still waiting to be dealt with.
export const mouseLeft = stop => Boolean(stop.mouse && !stop.mouse.fate);

// Everything at a station still to do, in the order to do it. Keys match
// the steps (and data baitrounds.ui.goal).
export function todo(sim, stop) {
  const W = sim.R.baitRounds;
  const out = [];
  if (stop.tipped) out.push('right');
  if (!stop.opened) out.push('open');
  if (mouseLeft(stop) && (stop.mouse.where === 'by' || stop.opened)) out.push('swing');
  if (stop.opened) {
    if (stop.guest) out.push('shoo');
    if (stop.fill > 0 && !stop.checked) out.push('check');
    else if (stop.checked && (stop.mouldy || wrongCount(stop) > 0)) out.push('bin');
    else if (stop.checked && usable(stop) < W.capacity) out.push('add');
  }
  if (stop.nest) out.push('mark');
  return out;
}

export const baitRounds = {
  job: 'bait',
  data: 'baitrounds',
  rates: 'baitRounds',
  makeStops,

  can(sim, stop, step, arg) {
    const W = sim.R.baitRounds;
    if (step === 'right') return Boolean(stop.tipped);
    if (step === 'mark') return Boolean(stop.nest);
    if (step === 'swing') return mouseLeft(stop) && (stop.mouse.where === 'by' || stop.opened);
    if (step === 'open') return !stop.opened;
    if (!stop.opened) return false;
    if (step === 'shoo') return Boolean(stop.guest);
    if (step === 'check') return !stop.checked && stop.fill > 0;
    if (step === 'bin') return stop.checked && (stop.mouldy || wrongCount(stop) > 0);
    if (step === 'add') {
      return stop.checked && !stop.mouldy && stop.fill + stop.spilled < W.capacity + W.overflow
        && (arg === undefined || arg === 'rat' || arg === 'mouse');
    }
    return false;
  },

  apply(sim, stop, step, arg) {
    if (step === 'right') { stop.tipped = false; sim.spot('possum', sim.S.loc); }    // a possum knocked it over: noted on the map
    else if (step === 'mark') stop.nest = false;
    else if (step === 'shoo') stop.guest = null;
    else if (step === 'swing') {
      const m = stop.mouse;
      m.swings++;
      if (m.swings >= m.need) m.fate = weighted(sim, sim.R.baitRounds.mouseFate);
    } else if (step === 'open') { stop.opened = true; if (stop.fill === 0) stop.checked = true; }   // nothing left to check
    else if (step === 'check') stop.checked = true;
    else if (step === 'bin') {
      if (stop.mouldy) { stop.mouldy = false; stop.fill = 0; stop.added = []; }
      else {                                              // only the wrong sort comes out
        const wrong = wrongCount(stop);
        stop.added = stop.added.filter(t => t === stop.eater);
        stop.fill -= wrong;
      }
    } else if (step === 'add') {
      if (stop.fill < sim.R.baitRounds.capacity) { stop.fill++; stop.added.push(arg ?? stop.eater ?? 'mouse'); }
      else stop.spilled++;
    }
  },

  needed(sim, stop) {
    const W = sim.R.baitRounds;
    const steps = [];
    if (stop.tipped) steps.push(['right']);
    steps.push(['open']);
    if (mouseLeft(stop)) for (let i = stop.mouse.swings; i < stop.mouse.need; i++) steps.push(['swing']);
    if (stop.guest) steps.push(['shoo']);
    if (stop.fill > 0) steps.push(['check']);
    if (stop.mouldy) steps.push(['bin']);
    else if (wrongCount(stop)) steps.push(['bin']);
    const have = stop.mouldy ? 0 : usable(stop);
    for (let i = have; i < W.capacity; i++) steps.push(['add', stop.eater ?? 'mouse']);
    if (stop.nest) steps.push(['mark']);
    return steps;
  },

  finish(sim, r) {
    const S = sim.S;
    const W = sim.R.baitRounds;
    const wells = r.stops.reduce((s, t) => s + usable(t), 0);
    const share = wells / (r.stops.length * W.capacity);
    const waste = r.stops.reduce((s, t) => s + t.spilled, 0);
    const z = sim.z(r.zone);
    z.bait = Math.round(100 * share);
    const level = rodentLevel(sim);
    z.k.bait = { v: S.v, level };
    sim.say('bait', { zone: r.zone, level });
    const loose = r.stops.filter(t => t.tipped || t.guest || t.nest || mouseLeft(t)).length;   // extras left undone
    const mice = r.stops.filter(t => t.mouse?.fate).length;
    // pest notes for the map: what was eating the bait, and any mouse you met
    for (const t of r.stops) {
      if (t.eater) sim.spot(t.eater, r.zone);
      if (t.mouse) sim.spot('mouse', r.zone, !t.mouse.fate || t.mouse.fate === 'scarper' ? 'seen' : 'caught');
    }
    const grade = share === 1 && waste === 0 && loose === 0 ? 'great' : share >= W.good ? 'good' : 'rough';
    const taken = r.stops.some(t => t.take === 'all') ? 'all' : r.stops.some(t => t.take === 'some') ? 'some' : 'none';
    return { grade, share, wells, waste, level, taken, mouldy: r.stops.filter(t => t.mouldy).length, loose, mice,
      wrong: r.stops.reduce((s, t) => s + wrongCount(t), 0) };
  },
};
