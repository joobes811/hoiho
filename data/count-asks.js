// Tonight's question: one thing your companion asks you to look out for at each
// dusk count, so no two counts feel quite the same. Answer it and you're up
// early next visit (rates.count.earlyStart minutes of extra daylight).
// One kind is drawn each count (by weight), never the same kind twice running,
// and only kinds that make sense tonight. The logic is in src/sim/count.js.
// Gaps: {name} and {band} a bird's, {n} how many.
export default {
  heading: 'Tonight',
  met: 'Done',
  notYet: 'Not yet',
  missed: 'Not tonight',
  kinds: [
    { k: 'bird', weight: 3,
      ask: '"Keep an eye out for {name}, {band}. I haven\'t had a proper look at that one for a while."',
      card: 'Read {name}\'s band ({band}).' },
    { k: 'bands', weight: 2,
      need: 3,              // bands to read (fewer if fewer birds come ashore, but at least 2 must)
      ask: '"Bet you can\'t read {n} bands before it gets dark."',
      card: 'Read {n} bands.' },
    { k: 'last', weight: 2,
      ask: '"Whoever\'s last up the beach tonight, I want to know who it is."',
      card: 'Read the band of the last bird up.' },
    { k: 'all', weight: 2,
      ask: '"Let\'s get every one of them tonight. No stragglers."',
      card: 'Count every bird that lands while you\'re here.' },
    { k: 'clean', weight: 1,
      need: 3,              // birds to count (fewer if fewer come ashore)
      ask: '"That rock got me twice last month. Don\'t let it get you."',
      card: 'Count {n} without counting anything that isn\'t a hoiho.' },
  ],
  // In the summary at the end.
  summaryMet: 'Tonight\'s question: done. You\'ll be up early next visit, with an extra {early} of daylight.',
  summaryMissed: 'Tonight\'s question: not this time.',
};
