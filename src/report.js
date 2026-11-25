// Turns a season report (sim.S.report) into lines of text for the report
// screen. Each line is { style, text }, style being title, heading, body,
// highlight or dim. Pure code, so it can be tested in Node.
import { fill } from './text.js';

const HISTORY_SHOWN = 6;          // years of history listed at the end of a year

export function reportLines(D, r, history = []) {
  const M = D.messages.report;
  const f = (template, vars = r) => fill(D, template, vars);
  const out = [];
  const add = (style, text) => out.push({ style, text });

  if (r.type === 'breeding') {
    const nests = r.nests.length;
    add('dim', f(M.breedingTitle));
    add('title', f(M.breedingHeading, { fledged: r.fledged, nests }));
    add('body', f(M.breedingNumbers, { ...r, nests }));
    const pct = r.eggs ? Math.round(r.fledged / r.eggs * 100) : 0;
    const per = r.fledged / (nests || 1);
    add('body', f(M.share, { pct }) + ' ' + (per >= 1 ? M.strong : per >= 0.6 ? M.respectable : M.tough));
    add('highlight', f(M.atSea, { note: D.weather.sea[r.sea].note }));
    if (r.rehab) add('body', f(M.rehab));
    for (const e of r.family ?? []) add('highlight', f(M.family[e.k][e.byYou ? 'yours' : 'plain'], e));
    const losses = Object.entries(M.lostCauses).filter(([k]) => r.lost[k]).map(([k, name]) => `${name} ${r.lost[k]}`);
    if (r.infertile) losses.push(`${M.infertile} ${r.infertile}`);
    if (r.disturb) losses.push(`${M.disturb} ${r.disturb}`);
    if (losses.length) add('body', `${M.lostHeading} ${losses.join(' · ')}`);
    const ferrets = r.caught.ferret ? f(M.ferrets, r.caught) : '';
    add('dim', f(M.caught, { ...r.caught, ferrets }) + (r.noSite ? f(M.noSite) : ''));
    return { lines: out, button: M.breedingContinue };
  }

  add('dim', f(M.yearTitle));
  add('title', f(M.yearHeading));
  add('dim', f(M.yearNumbers));
  const arrived = r.arrived.map(k => D.species.find(s => s.k === k));
  if (arrived.length) for (const s of arrived) add('highlight', f(M.arrival, s));
  else add('dim', M.noArrival);
  if (r.matured.length) {
    const merged = new Map();             // one line per kind of plant per place
    for (const m of r.matured) {
      const key = m.type + ':' + m.zone;
      merged.set(key, { ...m, n: (merged.get(key)?.n ?? 0) + m.n });
    }
    const grown = [...merged.values()].map(m => f(M.matured, { n: m.n, plants: m.type === 'flax' ? 'flax' : 'shrubs', zone: m.zone }));
    add('body', grown.join(' ') + ' ' + f(M.sites));
  }
  add('heading', M.colonyHeading);
  for (const p of r.returned) add('highlight', f(p.byYou ? M.returnedYours : M.returned, p));
  add('body', f(M.adults)
    + (r.died.length ? f(M.died, { names: r.died.map(d => `${d.name} (${d.band})`).join(', ') }) : M.allMadeIt)
    + (r.immigrants ? f(M.immigrants) : ''));
  if (history.length > 1) {
    add('heading', M.historyHeading);
    for (const h of history.slice(-HISTORY_SHOWN)) {
      add('dim', f(M.historyLine, { ...h, sea: D.weather.sea[h.sea].label }));
    }
  }
  return { lines: out, button: f(M.yearContinue, { next: r.year + 1 }) };
}
