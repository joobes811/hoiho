// The words for the end of the dusk count: how your tally compares with who
// was really ashore, whose bands you read, and who hasn't been seen for a
// while. Pure code (no Phaser), so Node tests can check it reads properly.
import { fill, duration } from './text.js';

const MAX_NAMES = 8;             // names listed before "and N more"

function names(T, list) {
  if (list.length <= MAX_NAMES) return list.join(', ');
  return fill({}, T.andMore, { names: list.slice(0, MAX_NAMES).join(', '), n: list.length - MAX_NAMES });
}

// score: from sim.scoreCount(). early: you left before the end.
// Returns { heading, lines: [text], grade }.
export function countSummary(sim, score, early = false) {
  const D = sim.D;
  const T = D.countScene.text.summary;
  const say = (t, v = {}) => fill(D, t, v);
  const bird = id => sim.byId(id);
  const label = a => `${a.name} (${a.band})`;
  const lines = [];
  if (score.n) lines.push(say(T.counted, { n: score.n, counted: score.counted.length }));
  else lines.push(T.none);
  if (score.missed) lines.push(say(T.missed, score));
  if (early) lines.push(T.leftEarly);
  const read = score.identified.map(bird).filter(Boolean);
  if (score.n) lines.push(read.length ? say(T.read, { names: names(T, read.map(label)) }) : T.noneRead);
  if (score.unread > 0) lines.push(say(T.unread, score));
  if (score.lookalikes > 0) lines.push(say(T.lookalikes, { n: score.lookalikes }));
  const ashore = new Map(sim.S.count.lines.filter(l => l.kind === 'penguin').map(l => [l.id, l]));
  const thin = read.filter(a => ashore.get(a.id)?.thin);
  if (thin.length) lines.push(say(T.thin, { names: names(T, thin.map(a => a.name)) }));
  const missing = score.missing.map(bird).filter(Boolean);
  if (missing.length) lines.push(say(T.missing, { names: names(T, missing.map(label)) }));
  if (score.n) lines.push(T.meaning[score.grade]);
  // Tonight's question (data/count-asks.js): answered means an early start next visit.
  if (sim.S.count?.ask) {
    const A = D.countAsks;
    lines.push(score.ask ? say(A.summaryMet, { early: duration(D.rates.count.earlyStart) }) : A.summaryMissed);
  }
  return { heading: T.heading[score.grade], lines, grade: score.grade };
}
