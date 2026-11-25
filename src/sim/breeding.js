// The breeding season month by month, and the two reports: the breeding
// report (after fledging) and the end of the year (survival, returns, reserve
// life). Ported from the prototype's breedStep, breedingReport and yearEnd.
import { clamp } from './util.js';

function lose(sim, nest, what, cause) {
  if (nest[what] <= 0) return false;
  nest[what]--;
  sim.S.ys.lost[cause]++;
  nest.log.push({ k: 'lost', what, cause, mi: sim.S.mi });   // mi: which month, for the nest camera
  return true;
}

export function breedStep(sim) {
  const S = sim.S;
  const m = S.mi;
  const C = sim.D.calendar;
  const N = sim.R.nests;
  const sea = sim.D.weather.sea[S.sea];
  for (const n of S.nests) {
    const stoat = sim.localStoat(n.zone);
    const rodent = sim.localRodent(n.zone);
    if (m === C.layMonth) {
      n.eggs = sim.chance(N.twoEggChance) ? 2 : 1;
      S.ys.eggs += n.eggs;
      n.log.push({ k: 'laid', n: n.eggs });
    }
    if (C.eggMonths.includes(m)) {
      const ratE = rodent / 100 * N.eggRat;
      const stoE = stoat / 100 * N.eggStoat;
      for (let e = n.eggs; e > 0; e--) {
        if (sim.chance(ratE + stoE)) {
          const byRat = sim.chance(ratE / (ratE + stoE || 1));
          lose(sim, n, 'eggs', byRat ? 'rat' : 'stoat');
        }
      }
    }
    if (m === C.hatchMonth) {
      for (let e = n.eggs; e > 0; e--) {
        if (sim.chance(N.hatchChance)) { n.chicks++; S.ys.hatched++; }
        else { S.ys.infertile++; n.log.push({ k: 'infertile' }); }
      }
      n.eggs = 0;
      if (n.chicks) n.log.push({ k: 'hatched', n: n.chicks });
    }
    if (C.chickMonths.includes(m)) {
      const sp = stoat / 100 * N.chickStoat;
      const rp = m === C.chickRatMonth ? rodent / 100 * N.chickRat : 0;
      for (let c = n.chicks; c > 0; c--) {
        if (sim.chance(sp + rp)) {
          const byStoat = sim.chance(sp / (sp + rp || 1));
          lose(sim, n, 'chicks', byStoat ? 'stoat' : 'rat');
        }
      }
    }
    if (m === C.weighMonth) {
      for (let c = n.chicks; c > 0; c--) if (sim.chance(sea.starve)) lose(sim, n, 'chicks', 'starve');
      n.light = 0;
      for (let c = 0; c < n.chicks; c++) if (sim.chance(sea.uw)) n.light++;
    }
    if (m === C.fledgeMonth) {
      n.light = Math.min(n.light, n.chicks);
      if (n.light) {
        // Rehab is certain. A light chick you chose to leave with its parents may still make it.
        // Untouched nests (no choice made) lose their light chicks, as before.
        const rehabbed = n.rehab ? Math.min(n.light, n.rehabN ?? n.light) : 0;
        let lost = n.light - rehabbed;
        for (let k = Math.min(lost, n.leftN ?? 0); k > 0; k--) if (sim.chance(N.leaveSurvive)) lost--;
        if (rehabbed) {
          S.ys.rehab += rehabbed;
          n.log.push({ k: 'rehab', n: rehabbed });
        }
        if (lost) {
          n.chicks -= lost;
          S.ys.lost.light += lost;
          n.log.push({ k: 'tooLight', n: lost });
        }
      }
      n.fledged = n.chicks;
      S.ys.fledged += n.chicks;
      for (const id of [n.m, n.f]) { const b = sim.byId(id); b.fledged = (b.fledged ?? 0) + n.chicks; }   // lifetime chicks, for the roster
      // Family stories: a bird that hatched here raising its own first chicks.
      if (n.chicks) {
        for (const id of [n.m, n.f]) {
          const b = sim.byId(id);
          if (b.origin !== 'returned' || b.firstChicks) continue;
          b.firstChicks = S.year;
          (S.ys.family ??= []).push({ k: 'firstChicks', name: b.name, n: n.chicks, parents: b.from, bornYear: b.bornYear,
            byYou: Boolean(b.byYou), grandparentsHere: (b.parents ?? []).some(pid => sim.byId(pid)) });
          sim.note('family');
        }
      }
      const from = `${sim.byId(n.m).name} & ${sim.byId(n.f).name}`;
      for (let c = 0; c < n.chicks; c++) {
        S.juveniles.push({ band: sim.nextBand(n.bands?.[c]), from, sea: S.sea, ret: S.year + N.returnAfter,
          sex: sim.chance(0.5) ? 'M' : 'F', bornYear: S.year,
          parents: [n.m, n.f], byYou: Boolean(n.bands?.[c]) });     // byYou: you weighed and banded this chick
      }
      if (n.chicks) n.log.push({ k: 'fledged', n: n.chicks });
      n.chicks = 0;
    }
  }

  // Pigs, deer and stock trample young plants, and sometimes a nest.
  const I = sim.R.intruders;
  const breeding = C.breedingMonths.includes(m);
  const victim = zone => sim.shuffle(sim.nestsIn(zone).filter(n => n.eggs + n.chicks > 0))[0];
  const trample = (zone, f) => { for (const c of sim.z(zone).cohorts) c.n = Math.round(c.n * (1 - f)); };
  const hurt = (zone, chanceOf, cause) => {
    if (!breeding || !sim.chance(chanceOf)) return;
    const n = victim(zone);
    if (n) lose(sim, n, n.chicks ? 'chicks' : 'eggs', cause);
  };
  if (S.pig) {
    trample(S.pig, I.pigTrample);
    if (breeding && sim.chance(I.pigNestChance)) {
      const n = victim(S.pig);
      if (n) {
        S.ys.lost.pig += n.eggs + n.chicks;
        n.eggs = 0;
        n.chicks = 0;
        n.log.push({ k: 'dugOut', mi: S.mi });
      }
    }
  }
  if (S.deer) { trample(S.deer, I.deerTrample); hurt(S.deer, I.deerNestChance, 'deer'); }
  if (S.stock) { trample(S.stock.zone, I.stockTrample); hurt(S.stock.zone, I.stockNestChance, 'stock'); }
}

export function breedingReport(sim) {
  const S = sim.S;
  const y = S.ys;
  return {
    type: 'breeding', year: S.year, sea: S.sea, eggs: y.eggs, hatched: y.hatched, fledged: y.fledged,
    lost: { ...y.lost }, infertile: y.infertile, disturb: y.disturb, rehab: y.rehab, noSite: y.noSite,
    caught: { ...y.caught }, family: (y.family ?? []).slice(),
    nests: S.nests.map(n => ({ m: sim.byId(n.m).name, f: sim.byId(n.f).name, zone: n.zone,
      log: n.log.slice(), fledged: n.fledged })),
  };
}

export function yearEnd(sim) {
  const S = sim.S;
  const R = sim.R;
  const sea = sim.D.weather.sea[S.sea];
  const died = [];
  S.adults = S.adults.filter(a => {
    const p = sea.surv - (a.age > R.colony.oldAge ? R.colony.oldPenalty : 0);
    if (sim.chance(p)) return true;
    died.push({ name: a.name, band: a.band });
    return false;
  });
  for (const a of S.adults) a.age++;

  // Fledglings from two years ago may come home.
  const returned = [];
  S.juveniles = S.juveniles.filter(j => {
    if (j.ret !== S.year + 1) return j.ret > S.year + 1;
    if (sim.chance(sim.D.weather.sea[j.sea].ret)) {
      const p = sim.newPenguin({ sex: j.sex, age: R.nests.returnAfter, band: j.band, origin: 'returned' });
      p.from = j.from;
      p.bornYear = j.bornYear;
      p.parents = j.parents ?? [];
      p.byYou = Boolean(j.byYou);
      S.adults.push(p);
      returned.push({ name: p.name, band: p.band, from: p.from, bornYear: p.bornYear, byYou: p.byYou });
      sim.note('returned');
    }
    return false;
  });

  // The colony never dies out: birds arrive from along the coast.
  let immigrants = 0;
  while (S.adults.length < R.colony.minimum) {
    const males = S.adults.filter(a => a.sex === 'M').length;
    S.adults.push(sim.newPenguin({ sex: males * 2 < S.adults.length ? 'M' : 'F',
      age: R.colony.immigrantAgeMin + sim.int(R.colony.immigrantAgeSpread), origin: 'coast' }));
    immigrants++;
  }

  // Reserve life heads towards a mix of habitat and pest control, and never crashes.
  const V = R.reserve;
  const before = S.reserve;
  const control = S.ys.n ? S.ys.controlSum / S.ys.n : V.defaultControl;
  const target = V.habitatWeight * sim.habitatScore() + V.controlWeight * control;
  let next = S.reserve + (target - S.reserve) * V.approach;
  if (next < S.reserve - V.maxDrop) next = S.reserve - V.maxDrop;
  S.reserve = clamp(next);
  const arrived = sim.D.species.filter(s => S.reserve >= s.at && !S.species.includes(s.k));
  S.speciesSeen ??= {};
  for (const s of arrived) { S.species.push(s.k); S.speciesSeen[s.k] = { mi: 11, year: S.year }; }   // for the notebook

  S.history.push({ year: S.year, adults: S.adults.length, nests: S.nests.length, fledged: S.ys.fledged,
    reserve: Math.round(S.reserve), sea: S.sea, species: S.species.length });
  return {
    type: 'year', year: S.year, died, returned, immigrants, adults: S.adults.length,
    before: Math.round(before), after: Math.round(S.reserve), arrived: arrived.map(s => s.k),
    matured: S.ys.matured.slice(), habitat: Math.round(sim.habitatScore()), sites: sim.nestSites(),
    control: Math.round(control),
  };
}
