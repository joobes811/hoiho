// The reserve health meter under the daylight bar: a rough "how are you going"
// from three things you can change on the day. Each part is 0-100.
// The logic is in src/sim/health.js.
export default {
  weights: {                // how much each part counts towards the overall score (they add up to 1)
    pests: 0.5,             // pest control: trap lines, bait stations and possum rounds (the same measure reserve life uses)
    cover: 0.3,             // plant cover: flax and shrubs, which shelter nests (the habitat score)
    fences: 0.2,            // fences: keeping stock and pigs out
  },
  // The word for the overall score: the first band whose `below` it's under.
  bands: [
    { below: 30, word: 'Struggling', colour: 0xd9824a },
    { below: 50, word: 'Holding on', colour: 0xf2c94c },
    { below: 70, word: 'Steady', colour: 0xb8d27a },
    { below: 101, word: 'Thriving', colour: 0x7cc47f },
  ],
  label: 'Reserve',
  gainColour: 0xe4f5b8,     // the part of the bar gained since you arrived today
  arrowFrom: 0.5,           // points up (or down) since arrival before a ▲ (or ▼) shows by the word
  // The card when you hover the meter. {n} a part's score.
  card: {
    heading: 'How the reserve is going',
    intro: 'The marker shows where you started today. Work today moves the bar; a month away lets it slip.',
    parts: {
      pests: { name: 'Pest control', tip: 'Walk the trap lines, keep the bait stations full, do the possum rounds.' },
      cover: { name: 'Plant cover', tip: 'Plant flax and shrubs. Slow, but it lasts.' },
      fences: { name: 'Fences', tip: 'Walk and mend the fence lines.' },
    },
    up: 'Up {n} since you arrived today.',
    down: 'Down {n} since you arrived today.',
    same: 'No change yet today.',
    colony: '{adults:adult} in the colony, {nests:nest} this season.',
  },
};
