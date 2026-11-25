// The simulation: the reserve, the penguins and the year, with no drawing.
// Ported from docs/hoiho-prototype.html; the numbers are in data/.
//
// How it's used (see tools/simulate.js for a full example):
//   const sim = Sim.newGame(DATA, seed);    // or Sim.load(DATA, savedState)
//   sim.jobsHere();  sim.doJob('traps');  sim.goTo('gully');
//   sim.toHillside();                       // the dusk count (sim.S.count)
//   sim.endCount(result);                   // the month passes; maybe a report
//   sim.continueReport();                   // after a report (sim.S.report)
//
// Everything that changes lives in `sim.S`, a plain object that can be saved
// as JSON. `sim.D` is the data from data/. Each visit the simulation writes
// what happened to S.log as events like { k: 'traps', zone: 'gully', stoats: 2 };
// src/text.js turns those into sentences using data/messages.js.
import { makeRng, random, shuffle } from './rng.js';
import { clamp } from './util.js';
import { jobsAt, doJob, quickJob, finishQuick } from './jobs.js';
import * as trapLine from './trapline.js';
import * as planting from './planting.js';
import * as rounds from './rounds.js';
import * as nests from './nests.js';
import * as stock from './stock.js';
import { buildCount, scoreCount, recordCount } from './count.js';
import { breedStep, breedingReport, yearEnd } from './breeding.js';
import { pickGoal, goalProgress, checkGoal } from './goals.js';
import { drawEvent, seenEvent } from './events.js';
import { health, pestControl } from './health.js';

export const SAVE_VERSION = 2;          // bump when the shape of S changes, and migrate old saves

export class Sim {
  constructor(D, S) {
    this.D = D;
    this.S = S;
    this.R = D.rates;
  }

  static newGame(D, seed = 1) {
    const sim = new Sim(D, null);
    sim.newGame(seed);
    return sim;
  }

  static load(D, S) {
    S = migrate(S);
    if (S?.version !== SAVE_VERSION) throw new Error(`Save is version ${S?.version}, expected ${SAVE_VERSION}`);
    return new Sim(D, S);
  }

  /* ---------- randomness (all through the seeded generator in S.rng) ---------- */
  rand() { return random(this.S.rng); }
  chance(p) { return this.rand() < p; }
  int(n) { return Math.floor(this.rand() * n); }
  pick(list) { return list[this.int(list.length)]; }
  shuffle(list) { return shuffle(this.S.rng, list); }

  /* ---------- looking things up ---------- */
  get zones() { return this.D.zones.zones; }
  zd(id) { return this.zones.find(z => z.id === id); }           // a zone's fixed data
  z(id) { return this.S.z[id]; }                                  // a zone's changing state
  has(id, flag) { return this.zd(id).flags.includes(flag); }
  zoneWith(flag) { return this.zones.find(z => z.flags.includes(flag)).id; }
  nestsIn(id) { return this.S.nests.filter(n => n.zone === id); }
  byId(id) { return this.S.adults.find(a => a.id === id); }
  when() { return { mi: this.S.mi, year: this.S.year }; }
  neighbours(id) {
    return this.D.zones.edges.filter(e => e.includes(id)).map(e => (e[0] === id ? e[1] : e[0]));
  }

  // Paths between two areas (breadth-first search over the edges).
  steps(a, b) {
    if (a === b) return 0;
    const seen = { [a]: 0 };
    const queue = [a];
    while (queue.length) {
      const c = queue.shift();
      for (const n of this.neighbours(c)) {
        if (seen[n] === undefined) {
          seen[n] = seen[c] + 1;
          if (n === b) return seen[n];
          queue.push(n);
        }
      }
    }
    return 9;
  }

  /* ---------- the model ---------- */
  localStoat(id) {
    const z = this.z(id);
    const st = this.R.stoats;
    const trapping = st.trapEffect * z.tf / 100 * Math.min(1, z.traps / st.fullLine);
    return clamp(this.S.stoat * this.zd(id).w * (this.S.hot === id ? st.hotspot : 1) * (1 - trapping));
  }
  localRodent(id) { return this.S.rodent * (1 - this.R.rodents.baitEffect * this.z(id).bait / 100); }
  browsePressure(id) { return this.R.browse.pressure * (1 - this.R.browse.controlEffect * this.z(id).browse / 100); }
  shelterIn(id) {
    const z = this.z(id);
    return z.flax + z.cohorts.filter(c => c.type === 'flax').reduce((s, c) => s + c.n * this.R.plants.youngFlaxShelter, 0);
  }
  capIn(id) {
    const z = this.z(id);
    const p = this.R.plants;
    return this.zd(id).cap + Math.floor((z.shrub + z.flax * p.flaxCover) / p.coverPerSite);
  }
  nestSites() { return this.zones.reduce((s, d) => s + this.capIn(d.id), 0); }
  habitatScore() {
    const p = this.R.plants;
    const cover = this.zones.reduce((s, d) => s + this.z(d.id).shrub + this.z(d.id).flax * p.flaxCover, 0);
    return clamp(p.habitatBase + cover / p.habitatScale);
  }

  say(k, vars = {}) { this.S.log.push({ k, ...vars }); }
  // Jot a pest (or stray stock) on the map's notes for an area. how: 'sign', 'seen' or 'caught'.
  // Once per kind, area and way per visit; only the newest notes are kept.
  spot(kind, zone, how = 'sign') {
    const S = this.S;
    const list = S.sightings ??= [];
    if (list.some(e => e.kind === kind && e.zone === zone && e.how === how && e.v === S.v)) return;
    list.push({ kind, zone, how, v: S.v, mi: S.mi, year: S.year });
    const keep = this.D.sightings?.keep ?? 120;
    if (list.length > keep) list.splice(0, list.length - keep);
  }

  note(k) {
    if (this.S.notebook[k]) return;
    this.S.notebook[k] = this.when();
    this.S.luck = 0;                  // luck is spent on a new entry
    this.say('notebook', { note: k });
  }

  // A roll for something that adds notebook entry k: the more visits since the last
  // new entry, the likelier (rates.finds.luckStep). Entries already found roll as normal.
  lucky(k, p) {
    if (this.S.notebook[k]) return this.chance(p);
    const f = this.R.finds;
    return this.chance(p + Math.min(f.luckMax, (this.S.luck ?? 0) * f.luckStep));
  }

  // The next leg band. With a colour letter (a chick you banded), skip ahead to that colour.
  nextBand(letter) {
    const cs = this.D.penguins.bandColours;
    if (letter && cs.includes(letter)) while (cs[this.S.bandIdx % cs.length] !== letter) this.S.bandIdx++;
    const i = this.S.bandIdx++;
    const colours = this.D.penguins.bandColours;
    return colours[i % colours.length] + '-' + String(Math.floor(i / colours.length) + 1).padStart(2, '0');
  }

  newPenguin(o) {
    const S = this.S;
    // Names by sex, each list in order (S.nameIdx counts the males, S.nameIdxF the females).
    const female = o.sex === 'F';
    const names = female ? this.D.penguins.namesF : this.D.penguins.namesM;
    const i = female ? (S.nameIdxF = (S.nameIdxF ?? 0) + 1) - 1 : S.nameIdx++;
    const name = names[i % names.length] + (i >= names.length ? ' II' : '');
    return { id: 'p' + (S.uid++), name, band: o.band || this.nextBand(), sex: o.sex, age: o.age,
      quirk: this.int(this.D.penguins.quirks.length), mate: null, origin: o.origin || 'founder', home: null };
  }

  /* ---------- a new game ---------- */
  newGame(seed) {
    const st = this.R.start;
    this.S = {
      version: SAVE_VERSION, seed, rng: makeRng(seed),
      v: 0, year: 1, mi: 0, uid: 1, nameIdx: 0, bandIdx: 0,
      stoat: st.stoat, rodent: st.rodent, boom: false, hot: null,
      z: {}, pig: null, deer: null, stock: null, know: { pig: null, deer: null },
      adults: [], nests: [], juveniles: [], sea: this.D.weather.firstSea, notebook: {},
      species: this.D.species.filter(s => s.at <= st.reserve).map(s => s.k), reserve: st.reserve,
      history: [], log: [], phase: 'day', report: null, count: null, lastCount: null,
      soreBack: false, carry: 0, beeDone: null,
    };
    const zs = this.D.zones.start;
    for (const d of this.zones) {
      this.S.z[d.id] = { traps: d.traps, tf: zs.trapFreshness, bait: zs.bait, browse: zs.browseControl,
        fence: d.fence ? zs.fence : null, cohorts: [], flax: 0, shrub: 0, k: {} };
    }
    for (const [id, cover] of Object.entries(this.D.zones.startCover)) Object.assign(this.S.z[id], cover);
    for (let i = 0; i < st.adults; i++) {
      this.S.adults.push(this.newPenguin({ sex: i % 2 ? 'F' : 'M', age: st.ageMin + this.int(st.ageSpread) }));
    }
    const A = this.S.adults;
    for (let i = 0; i < st.pairedAdults; i += 2) { A[i].mate = A[i + 1].id; A[i + 1].mate = A[i].id; }
    this.startSeason(true);
    this.startVisit();
  }

  /* ---------- each August: sea, pests, pairs and nest sites ---------- */
  startSeason(first) {
    const S = this.S;
    const R = this.R;
    if (!first) {
      let x = this.rand();
      S.sea = Object.keys(this.D.weather.sea).find(k => (x -= this.D.weather.sea[k].odds) < 0) ?? 'avg';
      const avgRod = S.ys.n ? S.ys.rodentSum / S.ys.n : R.stoats.defaultRodent;
      S.boom = this.chance(R.rodents.boomChance);
      S.rodent = S.boom ? R.rodents.boomLevel : R.rodents.normalLevel;
      const jitter = R.stoats.jitterMin + this.rand() * (R.stoats.jitterMax - R.stoats.jitterMin);
      S.stoat = clamp(Math.round(R.stoats.base + R.stoats.fromRodents * avgRod + jitter), R.stoats.min, R.stoats.max);
    }
    S.hot = this.pick(this.zones.filter(d => !d.flags.includes('base'))).id;
    S.ys = { rodentSum: 0, n: 0, controlSum: 0, eggs: 0, hatched: 0, fledged: 0, infertile: 0, disturb: 0, rehab: 0,
      lost: { stoat: 0, rat: 0, pig: 0, deer: 0, stock: 0, starve: 0, light: 0 }, noSite: 0, matured: [],
      caught: { stoat: 0, rat: 0, ferret: 0 } };

    // Pairs: widowed birds lose their mate; single adults pair up at random.
    for (const a of S.adults) if (a.mate && !this.byId(a.mate)) a.mate = null;
    const single = sex => this.shuffle(S.adults.filter(a => !a.mate && a.age >= R.nests.pairAge && a.sex === sex));
    const M = single('M');
    const F = single('F');
    while (M.length && F.length) { const m = M.pop(); const f = F.pop(); m.mate = f.id; f.mate = m.id; }
    // Family stories: a bird that hatched here pairs up for the first time.
    S.ys.family = [];
    for (const a of S.adults) {
      if (a.origin !== 'returned' || !a.mate || a.pairedOnce) continue;
      a.pairedOnce = S.year;
      const mate = this.byId(a.mate);
      S.ys.family.push({ k: 'paired', name: a.name, mate: mate.name, parents: a.from, bornYear: a.bornYear,
        byYou: Boolean(a.byYou), mateHomegrown: mate.origin === 'returned' });
    }
    const pairs = [];
    const seen = new Set();
    for (const a of S.adults) {
      if (a.mate && !seen.has(a.id)) {
        seen.add(a.id); seen.add(a.mate);
        pairs.push(a.sex === 'M' ? [a.id, a.mate] : [a.mate, a.id]);
      }
    }
    // Nest sites: males return to last year's area if there's room.
    const left = {};
    for (const d of this.zones) left[d.id] = this.capIn(d.id);
    S.nests = [];
    let noSite = 0;
    for (const [m, f] of pairs) {
      const male = this.byId(m);
      const zone = male.home && left[male.home] > 0 ? male.home
        : this.shuffle(this.zones.map(d => d.id).filter(id => left[id] > 0))[0];
      if (!zone) { noSite++; continue; }
      left[zone]--;
      male.home = zone;
      S.nests.push({ m, f, zone, eggs: 0, chicks: 0, light: 0, rehab: false, fledged: 0, log: [] });
    }
    S.ys.noSite = noSite;
    for (const d of this.zones) this.z(d.id).k.nests = { v: S.v + 1, n: this.nestsIn(d.id).length };
  }

  weatherRoll() {
    let x = this.rand() * 100;
    for (const w of this.D.weather.weather) if ((x -= w.w) < 0) return w.k;
    return this.D.weather.weather[0].k;
  }

  /* ---------- each month's visit ---------- */
  startVisit() {
    const S = this.S;
    const R = this.R;
    const C = this.D.calendar;
    S.v++; S.phase = 'day'; S.log = []; S.done = {}; S.visited = {}; S.found = {};
    S.sealion = false; S.carry = 0; S.count = null;
    S.luck = (S.luck ?? 0) + 1;      // another visit: a little more notebook luck (see lucky)
    S.weather = this.weatherRoll();
    S.mud = this.D.weather.muddyWeather.includes(S.weather) && C.muddyMonths.includes(S.mi) && this.chance(R.day.mudChance);
    S.workEnd = C.sunset[S.mi] - R.day.workBeforeSunset;
    S.time = Math.max(R.day.earliestStart, S.workEnd - R.day.length);
    if (S.weather === 'fine') { S.time -= R.day.fineBonus; this.note('fine'); }
    // Answered last count's question (count.js): an early start, so more daylight today.
    S.early = S.earlyNext ?? 0;
    delete S.earlyNext;
    if (S.early) { S.time -= S.early; this.say('earlyStart', { min: S.early }); }
    if (S.weather === 'storm') {
      const f = this.pick(this.zones.filter(d => d.fence));
      this.z(f.id).fence = clamp(this.z(f.id).fence - R.fence.stormDamage);
    }
    S.slow = S.soreBack ? Math.round(R.day.soreBack * (S.soreBack === true ? 1 : S.soreBack)) : 0;   // lifting more sheep makes it sorer
    if (S.soreBack) { S.soreBack = false; this.say('soreBack'); }
    if (S.mi === 0) {
      this.say('seaHint', { sea: S.sea });
      const where = this.zones.filter(d => this.nestsIn(d.id).length).map(d => [d.id, this.nestsIn(d.id).length]);
      this.say('nestsTaken', { pairs: S.nests.length, where, noSite: S.ys.noSite });
      if (S.boom) this.say('rodentBoom');
    }
    if (S.stock && S.stock.age >= R.intruders.stockStays) {
      this.say('stockCollected', { kind: S.stock.kind });
      S.stock = null;
    }
    if (S.stock && S.stock.kind === 'cow' && S.mud && !S.stock.seen) S.stock.zone = R.intruders.boggedZone;   // in the wet a cow heads for the creek and bogs
    if (S.mi === C.workingBeeMonth && S.reserve >= R.reserve.beeFrom && !S.beeDone) {
      S.beeDone = S.year;
      const zone = this.zoneWith('bee');
      this.z(zone).cohorts.push({ type: 'shrub', n: R.reserve.beeShrubs, age: 0 });
      this.say('workingBee', { n: R.reserve.beeShrubs, zone });
      this.note('workingbee');
    }
    drawEvent(this);                 // something different every visit (events.js)
    this.arrive(this.zoneWith('base'));
    pickGoal(this);
    S.healthStart = Math.round(health(this).score);    // the reserve meter's "where you started today" marker
  }

  // Which fence line of text goes with a fence condition (0-100).
  fenceFindKey(value) {
    const f = this.R.fence;
    return value > f.sound ? 'fenceSound' : value > f.sagging ? 'fenceSagging' : value > f.gaps ? 'fenceGaps' : 'fenceFlat';
  }

  // After mending, what you found on arrival should describe the fence as it is now.
  refreshFenceFind(id) {
    const F = this.S.found[id];
    const z = this.z(id);
    const at = F ? F.findIndex(e => /^fence(Sound|Sagging|Gaps|Flat)$/.test(e.k)) : -1;
    if (at >= 0 && z.fence !== null) F[at] = { k: this.fenceFindKey(z.fence) };
  }

  // Arriving somewhere shows what's there (S.found[id], a list of events).
  arrive(id) {
    const S = this.S;
    const R = this.R;
    S.loc = id;
    if (S.visited[id]) return;
    S.visited[id] = true;
    const z = this.z(id);
    const k = z.k;
    const F = [];
    if (z.fence !== null) {
      k.fence = { v: S.v, val: z.fence };
      const f = R.fence;
      F.push({ k: this.fenceFindKey(z.fence) });
    }
    if (S.pig === id) { S.know.pig = { zone: id, v: S.v }; F.push({ k: 'pigSign' }); this.spot('pig', id); }
    if (S.deer === id) { S.know.deer = { zone: id, v: S.v }; F.push({ k: 'deerSign' }); this.spot('deer', id); }
    if (S.stock && S.stock.zone === id) {
      S.stock.seen = true;
      this.spot(S.stock.kind === 'sheep' ? 'sheep' : 'cow', id, 'seen');
      F.push({ k: S.stock.kind === 'sheep' ? 'stockSheep' : (S.mud && this.has(id, 'muddy') ? 'stockCowBogged' : 'stockCattle') });
    }
    const ls = this.localStoat(id);
    if (!this.has(id, 'base') && ls > R.stoats.signFrom && this.chance(R.stoats.signChance + ls / R.stoats.signScale)) {
      k.sign = { v: S.v, level: ls };
      this.spot('stoat', id);
      F.push({ k: ls > R.stoats.heavySign ? 'stoatSignHeavy' : 'stoatSignLight' });
    }
    if (this.has(id, 'muddy') && S.mud) F.push({ k: 'mud' });
    const fd = R.finds;
    if (this.has(id, 'oldBush') && this.lucky('velvet', fd.velvetChance + (S.reserve > fd.velvetFrom ? fd.velvetBonus : 0))) {
      F.push({ k: 'velvetWorm' });
      this.note('velvet');
    }
    if (this.has(id, 'scrub') && S.species.includes('matata') && this.chance(fd.fernbirdChance)) F.push({ k: 'fernbird' });
    if (this.has(id, 'landing') && this.D.calendar.summerMonths.includes(S.mi) && this.lucky('sealion', fd.sealionChance)) {
      S.sealion = true;
      F.push({ k: 'sealion' });
      this.note('sealion');
    }
    if (this.has(id, 'base') && this.lucky('reception', fd.receptionChance)) this.note('reception');
    S.found[id] = F;
  }

  walkCost(from, to) { return this.steps(from, to) * (this.R.day.walkMinutes + this.S.slow); }

  // Walk somewhere. Returns false if it can't be done (wrong phase, or not enough daylight).
  goTo(id) {
    const S = this.S;
    if (S.phase !== 'day' || id === S.loc) return false;
    const c = this.walkCost(S.loc, id);
    if (S.time + c > S.workEnd) return false;
    S.time += c;
    this.arrive(id);
    return true;
  }

  jobsHere() { return jobsAt(this, this.S.loc); }
  // Today's goal (see goals.js): how far along, and whether it's just been met.
  goalProgress() { return goalProgress(this); }
  checkGoal() { return checkGoal(this); }
  seenEvent() { return seenEvent(this); }       // today's event has been read
  doJob(jobId) { return doJob(this, jobId); }
  quickJob(jobId) { return quickJob(this, jobId); }   // a mini-game job in one click, a bit less carefully
  health() { return health(this); }                   // reserve health now (health.js)
  finishQuick() { return finishQuick(this); }         // the rest of an open trap line, round or planting, done quickly

  // The trap line mini-game (see trapline.js).
  startTrapLine() { return trapLine.startTrapLine(this); }
  readTunnel() { return trapLine.readTunnel(this); }
  trapStep(step) { return trapLine.trapStep(this, step); }
  canStep(step) { return trapLine.canStep(this, step); }
  finishTrapLine() { return trapLine.finishTrapLine(this); }
  closeTrapLine() { return trapLine.closeTrapLine(this); }
  neededSteps(trap) { return trapLine.neededSteps(this, trap); }

  // The planting mini-game (see planting.js).
  startPlanting() { return planting.startPlanting(this); }
  plantSeedling(x, y, sp) { return planting.plantSeedling(this, x, y, sp); }
  toggleGuard(x, y) { return planting.toggleGuard(this, x, y); }
  liftSeedling(x, y) { return planting.liftSeedling(this, x, y); }
  cancelPlanting() { return planting.cancelPlanting(this); }
  finishPlanting() { return planting.finishPlanting(this); }
  closePlanting() { return planting.closePlanting(this); }
  // The rounds mini-games: fence walk, bait round, torch round (see rounds.js).
  startRounds(kind) { return rounds.startRounds(this, kind); }
  canRoundStep(step, arg) { return rounds.canRoundStep(this, step, arg); }
  roundStep(step, arg) { return rounds.roundStep(this, step, arg); }
  finishRounds() { return rounds.finishRounds(this); }
  closeRounds() { return rounds.closeRounds(this); }

  // The nest check mini-game (see nests.js).
  startNestCheck() { return nests.startNestCheck(this); }
  lookAtNest(i, how) { return nests.lookAtNest(this, i, how); }
  openCamera(i) { return nests.openCamera(this, i); }
  flagFrame(i, f) { return nests.flagFrame(this, i, f); }
  pickChick(i, c) { return nests.pickChick(this, i, c); }
  steadyChick(speed, dt) { return nests.steady(this, speed, dt); }
  chickReading() { return nests.reading(this); }
  putChickBack() { return nests.putBack(this); }
  dropChickInBag() { return nests.dropInBag(this); }
  recordChick(o) { return nests.recordChick(this, o); }
  finishNestCheck() { return nests.finishNestCheck(this); }

  // The stock mini-games (see stock.js): cow in the mud, cattle through the gate, sheep over the fence.
  startStock() { return stock.startStock(this); }
  cancelStock() { return stock.cancelStock(this); }
  closeStock() { return stock.closeStock(this); }
  moveTo(x, y) { return stock.moveTo(this, x, y); }
  digLeg(i) { return stock.digLeg(this, i); }
  takeRope() { return stock.takeRope(this); }
  tieRope(where) { return stock.tieRope(this, where); }
  pullRope(phase) { return stock.pull(this, phase); }
  moveCattle(x, y) { return stock.moveCattle(this, x, y); }
  pickSheep(i) { return stock.pickSheep(this, i); }
  liftOver(x) { return stock.liftOver(this, x); }

  /* ---------- dusk ---------- */
  toHillside() {
    const S = this.S;
    if (S.phase !== 'day') return false;
    const landing = this.zoneWith('landing');
    S.time += this.walkCost(S.loc, landing);
    if (S.loc !== landing) this.arrive(landing);
    buildCount(this, Math.max(0, S.time - S.workEnd));
    S.phase = 'count';
    return true;
  }

  // result (optional): what you tallied in the count scene (see count.js).
  endCount(result) {
    if (this.S.phase !== 'count') return false;
    if (result) recordCount(this, result);
    this.endVisit();
    return true;
  }

  scoreCount(result) { return scoreCount(this, result); }

  /* ---------- the month passes ---------- */
  endVisit() {
    const S = this.S;
    checkGoal(this);
    const R = this.R;
    S.ys.rodentSum += this.zones.reduce((s, d) => s + this.localRodent(d.id), 0) / this.zones.length;
    S.ys.n++;
    S.ys.controlSum += pestControl(this);
    if (S.carry) {   // traps still being carried get set where you are (or on the first fence line)
      const z = this.z(this.has(S.loc, 'base') ? this.zones.find(d => d.fence).id : S.loc);
      z.traps += S.carry;
      S.carry = 0;
    }
    breedStep(this);
    const P = R.plants;
    const I = R.intruders;
    for (const d of this.zones) {
      const z = this.z(d.id);
      const shelter = this.shelterIn(d.id);
      const bp = this.browsePressure(d.id);
      z.cohorts = z.cohorts.filter(c => {
        const loss = bp / 100 * P.browseLoss * (1 - (c.guard ?? 0) * this.D.planting.guardEffect) + (c.type === 'shrub' && d.exposed && shelter < P.shelterNeeded ? P.exposedLoss : 0);
        c.n = Math.round(c.n * (1 - loss));
        c.age++;
        if (c.age >= P.monthsToMature) {
          z[c.type] += c.n;
          S.ys.matured.push({ type: c.type, n: c.n, zone: d.id });
          return false;
        }
        return c.n > 0;
      });
      z.tf = clamp(z.tf - R.decay.traps);
      z.bait = clamp(z.bait - R.decay.bait);
      z.browse = clamp(z.browse - R.decay.browse);
      if (z.fence !== null) {
        z.fence = clamp(z.fence - R.decay.fence);
        const open = (100 - z.fence) / 100;
        if (!S.pig && this.chance(open * I.pigChance)) S.pig = d.id;
        if (!S.deer && this.chance(open * I.deerChance)) S.deer = d.id;
        if (!S.stock && z.fence < I.stockBelow && this.chance(I.stockChance)) {
          S.stock = { zone: d.id, kind: this.chance(I.sheepShare) ? 'sheep' : 'cow', age: 0, seen: false };
        }
      }
    }
    const roam = cur => (this.chance(I.roamChance)
      ? this.pick(this.neighbours(cur).filter(x => !this.has(x, 'base'))) : cur);
    if (S.pig) S.pig = roam(S.pig);
    if (S.deer) S.deer = roam(S.deer);
    if (S.stock) S.stock.age++;
    if (S.boom && S.mi >= this.D.calendar.boomFromMonth) S.rodent = clamp(S.rodent + R.rodents.boomRise);
    if (S.mi === this.D.calendar.fledgeMonth) {
      S.mi++;
      S.report = breedingReport(this);
      S.phase = 'report';
      return;
    }
    if (S.mi === this.D.calendar.months.length - 1) {
      S.report = yearEnd(this);
      S.phase = 'report';
      return;
    }
    S.mi++;
    this.startVisit();
  }

  continueReport() {
    const S = this.S;
    if (S.phase !== 'report') return false;
    const r = S.report;
    S.report = null;
    if (r.type === 'breeding') { this.startVisit(); return true; }
    S.year++;
    S.mi = 0;
    this.startSeason(false);
    this.startVisit();
    return true;
  }
}

// Bring an older save up to date.
//   1 -> 2: trap lines became hands-on; a line saved half-walked is dropped
//           (back to the day, the line not done).
//   (planting) a save from before the planting game has no S.planting; one
//           claiming to be mid-planting without it goes back to the day.
function migrate(S) {
  if (S && !('goal' in S)) { S.goal = null; S.today = { caught: 0, greatLines: 0 }; }   // saves from before goals get one next visit
  if (S?.phase === 'planting' && !S.planting) S.phase = 'day';
  if (S?.phase === 'nests' && !S.nestCheck) S.phase = 'day';
  if (S?.phase === 'stock' && !S.stockGame) S.phase = 'day';
  if (S?.version === 1) {
    if (S.phase === 'trapline') S.phase = 'day';
    S.trapLine = null;
    S.version = 2;
  }
  return S;
}
