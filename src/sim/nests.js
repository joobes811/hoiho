// The hands-on nest check: peek at the nests, weigh and band the chicks, and
// review the trail camera. Pure logic; the scene is src/scenes/NestScene.js.
//
//   startNestCheck(sim)            open the nests at the place you're standing (S.nestCheck; phase 'nests')
//   lookAtNest(sim, i, how)        'far' (safe, shows less) or 'near' (shows all; early on it may disturb a bird)
//   openCamera(sim, i)             build the nest's camera frames (once)
//   flagFrame(sim, i, f)           flag or unflag a frame; a flagged stoat marks the place as a hot spot
//   pickChick / steady / reading   hold a chick: slow mouse movement keeps it calm, a fast one makes it fidget
//   recordChick(sim, o)            write down the weight, fit a band, decide about a light chick
//   finishNestCheck(sim)           write the diary line and go back to the day
//   autoNestCheck(sim)             the plain job: what the automatic caretaker does (same odds as before)
//
// Things that change the colony (eggs lost to a disturbed bird, chicks sent to
// rehab, bands fitted) are written to the nest itself (n.rehabN, n.leftN,
// n.bands), so breeding.js picks them up at fledging.
import { clamp } from './util.js';

function minutes(sim, what) { return sim.D.nests.minutes[what]; }

function canSpend(sim, m) { return sim.S.time + m <= sim.S.workEnd; }

function spend(sim, m) {
  sim.S.time += m;
  sim.S.nestCheck.minutes += m;
}

// A trail camera sits at every cameraEvery-th nest, once eggs are down.
export function hasCamera(sim, nestIndex) {
  const N = sim.D.nests;
  return nestIndex % N.cameraEvery === 0 && N.cameraMonths.includes(sim.S.mi);
}

// Is this the month chicks are weighed (the same month as the rehab decision)?
export function isWeighMonth(sim) {
  return sim.S.mi === sim.D.calendar.fledgeMonth;
}

export function isDisturbMonth(sim) {
  return sim.D.calendar.disturbMonths.includes(sim.S.mi);
}

export function startNestCheck(sim) {
  const S = sim.S;
  const job = sim.jobsHere().find(j => j.id === 'nests');
  if (!job || job.blocked) return false;
  const W = sim.D.nests.weight;
  const weigh = isWeighMonth(sim);
  const nests = [];
  S.nests.forEach((n, i) => {
    if (n.zone !== S.loc) return;
    const chicks = [];
    if (weigh) {
      for (let c = 0; c < n.chicks; c++) {
        const light = c < n.light;
        const g = light ? W.lightMin + sim.int(W.lightMax - W.lightMin) : W.normalMin + sim.int(W.normalMax - W.normalMin);
        chicks.push({ g, light, weighed: false, band: null, decision: null });
      }
    }
    nests.push({ i, m: sim.byId(n.m).name, f: sim.byId(n.f).name, look: null, eggs: null, chicks: null,
      disturbed: false, cam: hasCamera(sim, i), frames: null, kids: chicks, beforeLaying: S.mi === sim.D.calendar.layMonth });
  });
  S.nestCheck = { zone: S.loc, minutes: 0, nests, holding: null, weigh, early: isDisturbMonth(sim), camHits: 0, camMatters: 0 };
  S.phase = 'nests';
  return true;
}

// A quiet look from a distance, or creeping right up.
export function lookAtNest(sim, idx, how) {
  const C = sim.S.nestCheck;
  const v = C?.nests[idx];
  if (!v || !['far', 'near'].includes(how)) return false;
  if (v.look === 'near' || v.look === how) return false;
  if (!canSpend(sim, minutes(sim, how))) return false;
  const n = sim.S.nests[v.i];
  spend(sim, minutes(sim, how));
  v.look = how;
  v.status = n.eggs ? 'eggs' : n.chicks ? 'chicks' : 'empty';
  // A bird is on the nest while there are eggs; chicks are guarded until the post-guard month.
  v.sitting = n.eggs > 0 || (n.chicks > 0 && sim.S.mi < sim.D.calendar.weighMonth);
  const chance = how === 'near' ? sim.R.nests.nearDisturb : sim.R.nests.farDisturb;
  if (isDisturbMonth(sim) && n.eggs > 0 && chance > 0 && sim.chance(chance)) {
    n.eggs--;
    sim.S.ys.disturb++;
    n.log.push({ k: 'eggDisturbed', mi: sim.S.mi });
    v.disturbed = true;
  }
  if (how === 'near') {
    v.eggs = n.eggs;
    v.chicks = n.chicks;
    v.light = C.weigh ? n.light : 0;
  }
  return true;
}

/* ---------- the trail camera ---------- */

// What the camera saw last month, drawn from what the simulation did to the nest.
function cameraEvents(sim, n) {
  return n.log.filter(e => e.mi === sim.S.mi - 1 && (e.k === 'dugOut' || (e.k === 'lost' && e.cause !== 'starve')));
}

export function openCamera(sim, idx) {
  const C = sim.S.nestCheck;
  const v = C?.nests[idx];
  if (!v || !v.cam) return false;
  if (v.frames) return true;
  if (!canSpend(sim, minutes(sim, 'camera'))) return false;
  spend(sim, minutes(sim, 'camera'));
  const N = sim.D.nests;
  const n = sim.S.nests[v.i];
  const events = cameraEvents(sim, n).slice(0, 2);
  const lostEggs = cameraEvents(sim, n).filter(e => e.what === 'eggs').length;
  const lostChicks = cameraEvents(sim, n).filter(e => e.what === 'chicks').length;
  // The nest as it was before the trouble: put back what was lost this month.
  const before = { eggs: n.eggs + lostEggs, chicks: n.chicks + lostChicks };
  const routine = n.chicks + lostChicks > 0 ? ['feed', 'sit', 'change', 'empty', 'feed'] : n.eggs + lostEggs > 0 ? ['sit', 'sit', 'change', 'empty'] : ['empty'];
  const slots = Array.from({ length: N.frames }, () => null);
  const place = (frame, wanted) => {
    let s = wanted.find(x => !slots[x]);
    if (s === undefined) s = slots.findIndex(x => !x);
    if (s >= 0) slots[s] = frame;
    return s;
  };
  for (const e of events) {
    const kind = e.k === 'dugOut' ? 'intruder' : e.cause === 'rat' ? 'rat' : e.cause === 'stoat' ? 'stoat' : 'intruder';
    const wanted = kind === 'stoat' ? sim.shuffle(N.stoatSlots.slice()) : sim.shuffle(Array.from({ length: N.frames - 2 }, (_, i) => i + 1));
    const s = place({ kind, matters: true, what: e.what ?? 'eggs', eggs: before.eggs, chicks: before.chicks }, wanted);
    if (s >= 0 && s + 1 < N.frames && !slots[s + 1]) {
      slots[s + 1] = { kind: 'missing', matters: true, what: e.what ?? 'eggs', eggs: n.eggs, chicks: n.chicks };
    }
  }
  const filler = (k) => ({ kind: k, matters: false, eggs: n.eggs, chicks: n.chicks });
  // Frames before an event show the nest as it was; after, as it is.
  const firstEvent = slots.findIndex(x => x?.matters);
  for (let s = 0; s < slots.length; s++) {
    if (slots[s]) continue;
    const f = filler(sim.pick(routine));
    if (firstEvent >= 0 && s < firstEvent) { f.eggs = before.eggs; f.chicks = before.chicks; }
    slots[s] = f;
  }
  v.frames = slots.map((f, s) => ({ ...f, t: N.times[s] ?? '00:00', variant: sim.int(3), flagged: false }));
  C.camMatters += v.frames.filter(f => f.matters).length;
  return true;
}

// Flag (or unflag) a frame. Flagging a stoat marks the place as a hot spot:
// the map shows stoat sign there, with a note to move traps.
export function flagFrame(sim, idx, fi) {
  const C = sim.S.nestCheck;
  const f = C?.nests[idx]?.frames?.[fi];
  if (!f) return false;
  f.flagged = !f.flagged;
  if (f.flagged && f.matters) C.camHits++;
  if (!f.flagged && f.matters) C.camHits--;
  if (f.flagged && f.kind === 'stoat' && !C.stoatSeen) {
    C.stoatSeen = true;
    const z = sim.z(C.zone);
    z.k.sign = { v: sim.S.v, level: Math.max(sim.localStoat(C.zone), sim.R.stoats.heavySign) };
    sim.S.hotNote ??= {};
    sim.S.hotNote[C.zone] = { year: sim.S.year, mi: sim.S.mi };
  }
  return true;
}

/* ---------- weighing ---------- */

export function pickChick(sim, idx, ci) {
  const C = sim.S.nestCheck;
  const kid = C?.nests[idx]?.kids[ci];
  if (!kid || kid.weighed || C.holding) return false;
  C.holding = { idx, ci, calm: 0, t: 0 };
  return true;
}

// Called as the mouse moves: speed in px/s, dt in seconds since the last call.
// A fast hand startles the chick; a slow or still one lets it settle.
export function steady(sim, speed, dt) {
  const h = sim.S.nestCheck?.holding;
  if (!h) return 0;
  const K = sim.D.nests.calm;
  h.t += dt;
  if (h.locked) return 1;                       // once it has settled, the weight is read and stays read
  if (speed > K.fastPx) h.calm = clamp(h.calm - K.startle * Math.min(1, dt * 10), 0, 1);
  else h.calm = clamp(h.calm + K.settlePerSec * dt, 0, 1);
  if (h.inBag && h.calm >= K.settled) h.locked = true;   // only counts once it is in the bag
  return h.calm;
}

export function isSettled(sim) {
  const h = sim.S.nestCheck?.holding;
  return Boolean(h && h.inBag && h.locked);
}

// Lower the chick into the weigh bag.
export function dropInBag(sim) {
  const h = sim.S.nestCheck?.holding;
  if (!h || h.inBag) return false;
  h.inBag = true;
  h.calm = Math.min(h.calm, sim.D.nests.calm.dropStir);   // lowering it in stirs it up a little
  return true;
}

// What the scale shows: the true weight once the chick is still, a wobble around it until then.
export function reading(sim) {
  const C = sim.S.nestCheck;
  const h = C?.holding;
  if (!h) return null;
  const K = sim.D.nests.calm;
  const kid = C.nests[h.idx].kids[h.ci];
  if (h.locked) return kid.g;
  const swing = Math.sin(h.t * K.wobbleHz * Math.PI * 2) * 0.7 + Math.sin(h.t * K.wobbleHz * 4.1) * 0.3;
  return Math.round(kid.g + (1 - h.calm) * K.wobbleG * swing);
}

export function putBack(sim) {
  const C = sim.S.nestCheck;
  if (!C?.holding) return false;
  C.holding = null;
  return true;
}

// Record the weight and fit a band; a light chick also needs a decision.
// o: { band: 'R'|'B'|..., decision: 'rehab'|'stay' (light chicks only) }
export function recordChick(sim, o) {
  const C = sim.S.nestCheck;
  const h = C?.holding;
  if (!h || !isSettled(sim)) return false;
  const v = C.nests[h.idx];
  const kid = v.kids[h.ci];
  const n = sim.S.nests[v.i];
  if (!sim.D.nests.band.includes(o.band)) return false;
  if (kid.light && !['rehab', 'stay'].includes(o.decision)) return false;
  const cost = minutes(sim, 'weigh') + (kid.light && o.decision === 'rehab' ? minutes(sim, 'rehab') : 0);
  if (!canSpend(sim, cost)) return false;
  spend(sim, cost);
  kid.weighed = true;
  kid.band = o.band;
  kid.decision = kid.light ? o.decision : null;
  n.bands ??= [];
  n.bands.push(o.band);
  if (kid.light) {
    if (o.decision === 'rehab') { n.rehabN = (n.rehabN ?? 0) + 1; n.rehab = true; }
    else n.leftN = (n.leftN ?? 0) + 1;
  }
  C.holding = null;
  C.weighedCount = (C.weighedCount ?? 0) + 1;
  return true;
}

// Chicks the player could still weigh here, and light ones among them.
export function unweighed(sim) {
  const C = sim.S.nestCheck;
  let n = 0;
  for (const v of C.nests) if (v.look === 'near') for (const k of v.kids) if (!k.weighed) n++;
  return n;
}

export function finishNestCheck(sim) {
  const S = sim.S;
  const C = S.nestCheck;
  if (S.phase !== 'nests' || !C) return false;
  const id = C.zone;
  const say = (key, vars = {}) => sim.say(key, { zone: id, ...vars });
  const nests = C.nests.map(v => {
    const n = S.nests[v.i];
    const known = v.look === 'near';
    return { m: v.m, f: v.f, eggs: known ? n.eggs : 0, chicks: known ? n.chicks : 0,
      light: known && C.weigh ? n.light : 0, beforeLaying: v.beforeLaying, seen: v.look !== null };
  }).filter(n => n.seen);
  if (nests.length) sim.z(id).k.nests = { v: S.v, n: nests.length, nests };
  if (nests.length) say('nestCheck', { nests });
  else say('nestsDone');
  if (C.weighedCount) say('weighed', { n: C.weighedCount });
  const rehabbed = C.nests.reduce((s, v) => s + v.kids.filter(k => k.decision === 'rehab').length, 0);
  if (rehabbed) say('rehabbed', { n: rehabbed });
  if (C.stoatSeen) say('camStoat');
  S.done['nests:' + id] = true;
  S.nestCheck = null;
  S.phase = 'day';
  return true;
}

// Leave without writing anything up (nothing is lost: what was done stays done).
export function closeNestCheck(sim) {
  return finishNestCheck(sim);
}

/* ---------- the plain job ---------- */

// The plain "Check the nests here" job, as the automatic caretaker plays it:
// creep close to every nest (same odds as before), and in the weigh month send
// every light chick to rehab. Takes the job's flat 45 minutes.
export function autoNestCheck(sim) {
  const S = sim.S;
  const id = S.loc;
  const nests = [];
  for (const n of sim.nestsIn(id)) {
    if (isDisturbMonth(sim) && n.eggs > 0 && sim.chance(sim.R.nests.nearDisturb)) {
      n.eggs--;
      S.ys.disturb++;
      n.log.push({ k: 'eggDisturbed', mi: S.mi });
    }
    const weigh = isWeighMonth(sim);
    if (weigh && n.light) n.rehab = true;
    nests.push({ m: sim.byId(n.m).name, f: sim.byId(n.f).name, eggs: n.eggs, chicks: n.chicks,
      light: weigh ? n.light : 0, beforeLaying: S.mi === sim.D.calendar.layMonth });
  }
  sim.z(id).k.nests = { v: S.v, n: nests.length, nests };
  sim.say('nestCheck', { zone: id, nests });
}
