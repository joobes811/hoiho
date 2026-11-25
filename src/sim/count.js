// The dusk count: who comes ashore, and when. Builds S.count, a list of lines
// sorted by time ({ kind, t, k, ... }, t in minutes after midnight). The count
// scene reveals them one by one; src/text.js words them.
// Ported from the prototype's buildCount.
//
// After the watch-and-spot scene, scoreCount() grades what you tallied and
// recordCount() remembers which birds you identified (a.idSeen = the visit; a.seen is when it last came ashore, for the roster).
// Accuracy only changes what you know about the colony, never the colony.
// Each count also has a question from your companion (pickAsk, data/count-asks.js);
// answering it gives an early start next visit (more daylight, not more penguins).
import { makeRng, random } from './rng.js';

export function buildCount(sim, late) {
  const S = sim.S;
  const C = sim.D.calendar;
  const N = sim.R.count;
  const L = sim.D.countLines;
  const summer = C.summerMonths.includes(S.mi);
  const start = S.workEnd;
  const span = summer ? N.spanSummer : N.spanOther;
  const arrived = start + late;
  const at = () => start + sim.rand() * span;
  const ashore = N.breedingMonths.includes(S.mi) ? N.ashoreBreeding
    : N.moultMonths.includes(S.mi) ? N.ashoreMoult : N.ashoreOther;
  const lines = [];
  let n = 0;
  let missed = 0;

  for (const a of S.adults) {
    if (sim.rand() >= ashore) continue;
    const q = sim.D.penguins.quirks[a.quirk];
    const showQuirk = q.always || sim.chance(N.quirkShown);
    const thin = S.sea === 'poor' && sim.chance(N.thinChance);
    const tent = Boolean(q.nosy) && sim.lucky('tent', N.tentChance);
    if (tent) sim.note('tent');
    const t = q.late ? start + span + N.lateMin + sim.rand() * N.lateSpread : at();
    if (t < arrived) { missed++; continue; }
    n++;
    a.seen = sim.when();            // the roster shows when each bird was last confirmed
    lines.push({ kind: 'penguin', t, k: 'ashore', id: a.id, name: a.name, band: a.band,
      quirk: showQuirk ? a.quirk : null, sealion: S.sealion, thin, tent });
  }
  for (const i of sim.shuffle(L.ambient.map((_, i) => i)).slice(0, N.ambientLines)) {
    lines.push({ kind: 'amb', t: Math.max(arrived, at()), k: 'ambient', i });
  }
  // The companion: a few lines spread through the evening, never the same one twice.
  for (const i of sim.shuffle(L.talk.map((_, i) => i)).slice(0, N.talkLines)) {
    if (sim.chance(N.talkChance)) lines.push({ kind: 'talk', t: Math.max(arrived, at()), k: 'talk', i });
  }
  if (summer && !sim.D.weather.windyWeather.includes(S.weather) && sim.lucky('sandflies', N.sandflyChance)) {
    lines.push({ kind: 'amb', t: arrived + N.sandflyDelay, k: 'sandflies' });
    sim.note('sandflies');
  }
  if (sim.lucky('korora', S.species.includes('korora') ? N.kororaChanceBack : N.kororaChance)) {
    lines.push({ kind: 'amb', t: Math.max(arrived, at()), k: 'korora' });
    sim.note('korora');
  }
  if (S.species.includes('titi') && sim.lucky('titi', N.titiChance)) {
    lines.push({ kind: 'amb', t: start + span - N.titiBeforeEnd, k: 'titi' });
    sim.note('titi');
  }
  if (sim.lucky('furseal', N.fursealChance)) {
    lines.push({ kind: 'amb', t: Math.max(arrived, at()), k: 'furseal' });
    sim.note('furseal');
  }
  lines.sort((a, b) => a.t - b.t);
  lines.unshift(late > 0
    ? { kind: 'amb', t: arrived, k: 'arriveLate', late }
    : { kind: 'amb', t: arrived, k: 'arrive', weather: S.weather });
  if (!lines.some(l => l.kind === 'penguin')) lines.push({ kind: 'amb', t: start + span, k: 'nobody' });
  // seed: for the count scene's own small luck (where birds land, who dips
  // back into the surf), so a count looks the same if the page is reloaded.
  S.count = { lines, shown: 1, n, missed, seed: sim.int(N.sceneSeeds) };
  S.count.ask = pickAsk(sim, S.count);
  S.lastCount = { n, missed, ...sim.when() };
}

// Tonight's question: { k, id, name, band, n } or null if nobody comes ashore.
// Drawn with the count's own seed, so the main dice (and the balance) don't change.
export function pickAsk(sim, c) {
  const S = sim.S;
  const A = sim.D.countAsks;
  const birds = c.lines.filter(l => l.kind === 'penguin');
  if (!birds.length) return null;
  const rng = makeRng(`${c.seed}:ask`);
  const kinds = A.kinds.filter(k => k.k !== S.lastAsk && (k.k !== 'bands' || birds.length >= 2));
  let x = random(rng) * kinds.reduce((s, k) => s + k.weight, 0);
  const kind = kinds.find(k => (x -= k.weight) < 0) ?? kinds[kinds.length - 1];
  S.lastAsk = kind.k;
  const ask = { k: kind.k };
  if (kind.k === 'bird' || kind.k === 'last') {
    // 'bird': whoever ashore tonight you've read least recently; 'last': the last one up
    const pick = kind.k === 'last' ? birds[birds.length - 1]
      : [...birds].sort((a, b) => (sim.byId(a.id)?.idSeen ?? -1) - (sim.byId(b.id)?.idSeen ?? -1))[0];
    Object.assign(ask, { id: pick.id, name: pick.name, band: pick.band });
  }
  if (kind.k === 'bands' || kind.k === 'clean') ask.n = Math.min(kind.need, birds.length);
  if (kind.k === 'all') ask.n = birds.length;
  return ask;
}

// Is tonight's question answered by this tally? 'met', 'open' (could still be) or 'missed'.
// final: the evening's over, so anything not met is missed.
export function askState(ask, { counted, identified, lookalikes }, final = false) {
  if (!ask) return 'missed';
  let met = false;
  if (ask.k === 'bird' || ask.k === 'last') met = identified.includes(ask.id);
  if (ask.k === 'bands') met = identified.length >= ask.n;
  if (ask.k === 'all') met = counted.length >= ask.n;
  if (ask.k === 'clean') {
    if (lookalikes > 0) return 'missed';
    met = counted.length >= ask.n;
  }
  return met ? 'met' : final ? 'missed' : 'open';
}

// How well you counted. `result` comes from the count scene:
//   { counted: [ids], identified: [ids], lookalikes: n }
// counted: hoiho you clicked; identified: those whose band you could read;
// lookalikes: clicks on kororā, shags, kelp and the rock.
// Returns the numbers for the summary, with a grade (great, good, rough) and
// `missing`: birds you've identified before but not for a while.
export function scoreCount(sim, result) {
  const S = sim.S;
  const N = sim.R.count;
  const c = S.count;
  const ashore = new Set(c.lines.filter(l => l.kind === 'penguin').map(l => l.id));
  const counted = [...new Set(result?.counted ?? [])].filter(id => ashore.has(id));
  const identified = [...new Set(result?.identified ?? [])].filter(id => counted.includes(id));
  const lookalikes = Math.max(0, result?.lookalikes ?? 0);
  const n = ashore.size;
  const share = n ? counted.length / n : 1;
  const accuracy = Math.max(0, Math.min(1, share - lookalikes * N.lookalikeCost));
  const grade = accuracy >= N.greatFrom ? 'great' : accuracy >= N.goodFrom ? 'good' : 'rough';
  const seenNow = new Set(identified);
  const missing = S.adults.filter(a => !seenNow.has(a.id) && a.idSeen != null && S.v - a.idSeen >= N.missingAfter)
    .map(a => a.id);
  const ask = askState(c.ask, { counted, identified, lookalikes }, true) === 'met';
  return { n, missed: c.missed, counted, identified, lookalikes, accuracy, grade,
    unread: counted.length - identified.length, uncounted: n - counted.length, missing, ask };
}

// Remember the count: identified birds are marked seen this visit, and the
// score goes into S.lastCount for the reports and notebook to use later.
export function recordCount(sim, result) {
  const S = sim.S;
  const score = scoreCount(sim, result);
  for (const id of score.identified) {
    const a = sim.byId(id);
    if (a) a.idSeen = S.v;
  }
  S.lastCount = { ...S.lastCount, counted: score.counted.length, identified: score.identified.length,
    lookalikes: score.lookalikes, grade: score.grade, ask: score.ask };
  if (score.ask) S.earlyNext = sim.R.count.earlyStart;      // tonight's question answered: up early next visit
  return score;
}

// ----- how you watch (the scene's viewing choices; none of this changes who comes ashore) -----

// How clearly a bird can be made out. `read`: the light's and weather's read (0 to 1);
// `near`: 0 at the waterline to 1 at the bush edge; `binos`: the binoculars are up.
// D is data/count-scene.js. Without binoculars you never make out a band or what a shape is.
export function lookClarity(D, { read, near, binos }) {
  if (!binos) return 0;
  return read * (D.nearFrom + (1 - D.nearFrom) * near) * D.binoBoost;
}
export const bandReadable = (D, look) => lookClarity(D, look) >= D.readNeed;

// The speed setting by key ('slow', 'normal', 'brisk'); anything unknown is normal.
// An older save's "long count" switch counts as slow.
export function speedOf(D, key, longCount = false) {
  const list = D.speeds;
  return list.find(s => s.key === key) ?? list.find(s => s.key === (longCount ? 'slow' : D.defaultSpeed));
}
