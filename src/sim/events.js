// Something different every visit (data/events.js): one event when you arrive,
// drawn from a shuffled pile so nothing repeats until the rest have turned up.
//
// S.deck  = event ids still in the pile
// S.event = { k, zone, seen }   today's event; `seen` once you've read it (the map shows it until then)
import { clamp } from './util.js';

// Areas an event can happen in.
function places(sim, where) {
  const ids = sim.zones.map(d => d.id);
  switch (where) {
    case 'fence': return ids.filter(id => sim.z(id).fence !== null);
    case 'work': return ids.filter(id => !sim.has(id, 'base'));
    case 'plant': return ids.filter(id => sim.zd(id).plant);
    case 'landing': return ids.filter(id => sim.has(id, 'landing'));
    case 'base': return ids.filter(id => sim.has(id, 'base'));
    default: return [null];
  }
}

function fits(sim, ev) {
  const S = sim.S;
  if (ev.months && !ev.months.includes(S.mi)) return false;
  if (ev.needs === 'noStock' && (S.stock || S.log.some(e => e.k === 'stockCollected'))) return false;   // not the day the farmer took his back
  if (ev.needs === 'noPig' && S.pig) return false;
  if (ev.needs && !['noStock', 'noPig'].includes(ev.needs) && !S.species.includes(ev.needs)) return false;
  return places(sim, ev.where).length > 0;
}

// A fresh pile: every event, as many times as it's listed, shuffled, with the
// last few you saw put to the bottom so they don't come straight round again.
function newDeck(sim) {
  const recent = sim.S.recentEvents ?? [];
  const all = sim.shuffle(sim.D.events.list.flatMap(ev => Array(ev.copies ?? 1).fill(ev.k)));
  return [...all.filter(k => !recent.includes(k)), ...all.filter(k => recent.includes(k))];
}

// Draw today's event and make it happen. Called as a visit starts, before you arrive at the tent.
// The very first visit has none: there's enough to take in on your first day.
export function drawEvent(sim) {
  const S = sim.S;
  const list = sim.D.events.list;
  S.event = null;
  if (S.v <= 1) return;
  if (!S.deck?.length) S.deck = newDeck(sim);
  let at = S.deck.findIndex(k => fits(sim, list.find(e => e.k === k)));
  if (at < 0) {                     // nothing left in the pile suits this month: start a new pile
    S.deck = newDeck(sim);
    at = S.deck.findIndex(k => fits(sim, list.find(e => e.k === k)));
  }
  if (at < 0) { S.event = null; return; }
  const k = S.deck.splice(at, 1)[0];
  const ev = list.find(e => e.k === k);
  const zone = sim.pick(places(sim, ev.where));
  S.event = { k, zone, seen: false };
  S.recentEvents = [...(S.recentEvents ?? []), k].slice(-sim.D.events.keepApart);
  apply(sim, ev, zone);
  sim.say('event', { event: k, zone });
  if (sim.D.notebook.some(n => n.k === k)) sim.note(k);       // the first time, it goes in the field notebook
}

function apply(sim, ev, zone) {
  const S = sim.S;
  const e = ev.effect;
  if (!e) return;
  if (e.fence) sim.z(zone).fence = clamp(sim.z(zone).fence - e.fence);
  if (e.stock) S.stock = { zone, kind: e.stock, age: 0, seen: false };
  if (e.stoat) { S.hot = zone; sim.spot('stoat', zone, 'seen'); }
  if (e.pig) S.pig = zone;
  if (e.minutes) S.time = Math.min(S.workEnd, S.time + e.minutes);
  if (e.seedlings) sim.z(zone).cohorts.push({ type: 'shrub', n: e.seedlings, age: 0 });
}

// Today's event, once read on the map.
export function seenEvent(sim) {
  if (sim.S.event) sim.S.event.seen = true;
}
