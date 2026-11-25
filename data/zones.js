// The reserve's areas for the simulation (the map's clickable places are in
// places.js). Ported from the prototype's ZD and EDGES.
//   fence:    1 = has a fence line that decays and lets stock in
//   traps:    traps on this line at the start
//   cap:      nest sites here before any planting matures
//   plant:    1 = you can plant here
//   w:        how attractive to stoats (1 = average; times the reserve-wide stoat level)
//   exposed:  1 = windswept; shrubs struggle without flax shelter first
//   flags:    base (the tent: start of day, phone reception), muddy (the creek bogs in rain),
//             oldBush (velvet worms), scrub (fernbirds call), landing (the count is here),
//             browse (possum and rabbit traps make sense), bee (where volunteers plant)
export default {
  zones: [
    { id: 'tent', name: 'Tent & car park', fence: 0, traps: 0, cap: 0, plant: 0, w: 0.3, exposed: 0,
      flags: ['base'], desc: 'The old tent, the car, and one bar of phone reception if you stand on the bumper.' },
    { id: 'boundary', name: 'Boundary fence', fence: 1, traps: 3, cap: 0, plant: 0, w: 1.2, exposed: 1,
      flags: [], desc: 'The fence between the reserve and the farm. Stock lean on it all winter.' },
    { id: 'paddock', name: 'Restoration paddock', fence: 1, traps: 3, cap: 0, plant: 1, w: 1, exposed: 1,
      flags: ['scrub', 'browse', 'bee'], desc: 'Old grazing land being planted back to scrub. The rabbits think it is a salad bar.' },
    { id: 'bush', name: 'Old bush', fence: 0, traps: 4, cap: 3, plant: 0, w: 1.1, exposed: 0,
      flags: ['oldBush', 'browse'], desc: 'The original forest. Dark, dense, and where the nests have always been.' },
    { id: 'gully', name: 'Gully & creek', fence: 0, traps: 4, cap: 2, plant: 1, w: 1.2, exposed: 0,
      flags: ['muddy', 'scrub', 'browse'], desc: 'A wet, sheltered gully running down to the sea. The muddiest ground on the reserve.' },
    { id: 'headland', name: 'Headland', fence: 1, traps: 3, cap: 1, plant: 1, w: 0.8, exposed: 1,
      flags: ['browse'], desc: 'Takes every southerly full in the face. Nothing grows here without flax for shelter first.' },
    { id: 'beach', name: 'Landing spot', fence: 0, traps: 3, cap: 0, plant: 0, w: 0.7, exposed: 1,
      flags: ['landing'], desc: 'Where the penguins come ashore. The counting spot is on the hillside above.' },
  ],
  // Paths between areas. Walking costs rates.walkMinutes per path.
  edges: [['tent', 'boundary'], ['tent', 'paddock'], ['boundary', 'paddock'], ['boundary', 'bush'],
    ['paddock', 'gully'], ['paddock', 'headland'], ['bush', 'gully'], ['bush', 'beach'],
    ['gully', 'beach'], ['gully', 'headland'], ['headland', 'beach']],
  // Starting state of each area.
  start: { trapFreshness: 60, bait: 50, browseControl: 30, fence: 70 },   // all 0 to 100
  startCover: { gully: { shrub: 70 }, headland: { flax: 60 } },          // mature plants already there
};
