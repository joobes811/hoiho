// Your pest notes for one area, grouped by kind for the map (newest first).
// Plain code (no Phaser), so it's tested in Node.
import { fill } from './text.js';

const monthsAgo = (S, e) => (S.year - e.year) * 12 + (S.mi - e.mi);

// The kinds noted in an area within the last showMonths, newest first:
// [{ kind, name, colour, count, fresh, line }]
export function areaNotes(D, S, zone) {
  const N = D.sightings;
  const groups = new Map();
  for (const e of S.sightings ?? []) {
    if (e.zone !== zone || monthsAgo(S, e) > N.showMonths || !N.kinds[e.kind]) continue;
    const g = groups.get(e.kind) ?? { kind: e.kind, count: 0, last: e };
    g.count++;
    if (monthsAgo(S, e) <= monthsAgo(S, g.last)) g.last = e;
    groups.set(e.kind, g);
  }
  return [...groups.values()]
    .sort((a, b) => monthsAgo(S, a.last) - monthsAgo(S, b.last))
    .map(g => {
      const k = N.kinds[g.kind];
      const when = `${D.calendar.months[g.last.mi].slice(0, 3)} Y${g.last.year}`;
      return {
        kind: g.kind, name: k.name, colour: k.colour, count: g.count,
        fresh: monthsAgo(S, g.last) <= N.freshMonths,
        line: fill(D, N.card.row, { name: k.name, count: fill(D, N.card.count, { n: g.count }), how: N.how[g.last.how] ?? g.last.how, when }),
      };
    });
}
