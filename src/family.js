// A bird's family story, for the colony roster: where it came from, its
// parents, mate, chicks, the chicks that came home, and grandchicks.
// Plain code (no Phaser), so it's tested in Node.
import { fill } from './text.js';

// The birds in the colony that hatched to this bird.
export function childrenOf(S, a) {
  return S.adults.filter(b => b.parents?.includes(a.id));
}

// Lines of text telling this bird's story, most personal first. F: the words
// (data/screens.js colony.family).
export function familyLines(D, F, S, a) {
  const byId = id => S.adults.find(b => b.id === id);
  const them = a.sex === 'M' ? F.him : F.her;
  const out = [];
  if (a.origin === 'returned') {
    out.push(fill(D, F.hatched, { from: a.from, bornYear: a.bornYear }) + (a.byYou ? ' ' + fill(D, F.byYou, { them }) : ''));
    const parents = (a.parents ?? []).map(byId).filter(Boolean);
    out.push(parents.length === 2 ? fill(D, F.parentsBoth, { a: parents[0].name, b: parents[1].name })
      : parents.length === 1 ? fill(D, F.parentsOne, { name: parents[0].name })
        : F.parentsGone);
  } else {
    out.push(a.origin === 'coast' ? F.coast : F.founder);
  }
  const mate = a.mate ? byId(a.mate) : null;
  if (mate) out.push(fill(D, F.mate, { name: mate.name }) + (mate.origin === 'returned' ? ' ' + F.mateHomegrown : ''));
  if (a.fledged) out.push(fill(D, F.chicks, { n: a.fledged }));
  const kids = childrenOf(S, a);
  if (kids.length) out.push(fill(D, F.home, { names: kids.map(k => k.name).join(', ') }));
  const grand = kids.reduce((s, k) => s + (k.fledged ?? 0), 0);
  if (grand) out.push(fill(D, F.grand, { n: grand }));
  return out;
}
