// Weather for each visit, and conditions at sea for each season.
// Ported from the prototype.
export default {
  // w: chance out of 100 (they add up to 100). t: how it's described at the count.
  weather: [
    { k: 'rain', w: 33, t: 'Rain, steady and cold' },
    { k: 'wind', w: 24, t: 'A howling southerly' },
    { k: 'drizzle', w: 18, t: 'Grey drizzle that gets in everywhere' },
    { k: 'cold', w: 14, t: 'Bitterly cold, sleet on the hills' },
    { k: 'storm', w: 6, t: 'Full storm, trees down on the road in' },
    { k: 'fine', w: 5, t: 'A fine, calm day. Nobody will believe you' },
  ],
  muddyWeather: ['rain', 'storm'],        // can turn the ground to mud
  windyWeather: ['wind', 'storm'],        // slows planting; keeps sandflies away
  // Sea years. odds: chance a season is this kind (adds up to 1).
  //   surv:   chance an adult survives the year
  //   uw:     chance each chick is underweight at weighing
  //   starve: chance each chick starves while both parents are at sea
  //   ret:    chance a fledgling from this year comes home two years later
  sea: {
    good: { label: 'Good', odds: 0.3, surv: 0.93, uw: 0.05, starve: 0, ret: 0.5,
      hint: 'Fishing boats are reporting plenty of sprat and red cod close in.',
      note: 'A good year at sea. Plenty of fish close to shore, and the birds came back fat.' },
    avg: { label: 'Average', odds: 0.45, surv: 0.9, uw: 0.18, starve: 0.04, ret: 0.36,
      hint: 'Nothing unusual at sea so far this season.',
      note: 'An ordinary year at sea. Some birds had to work hard, most managed.' },
    poor: { label: 'Poor', odds: 0.25, surv: 0.85, uw: 0.42, starve: 0.12, ret: 0.18,
      hint: 'The water is warm for August and the fishing reports are thin.',
      note: 'A hard year at sea. Warm water pushed the fish further out and the birds struggled for every meal. Nothing you could change from the land.' },
  },
  firstSea: 'avg',                        // the first season is always an average year
};
