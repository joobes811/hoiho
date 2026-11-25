// Words for the title screen, field notebook, colony roster and season report.
// (Map-screen words are in ui-text.js.) No logic and no balance numbers here
// except the few display settings, each commented with its unit.
export default {
  title: {
    subtitle: 'A year in the life of a penguin reserve on the Catlins coast',
    continue: 'Continue',
    continueSub: 'Year {year} · {month}',
    doing: {                              // added to Continue when you left mid-way through something
      trapline: 'trap line', planting: 'planting', rounds: 'on a round', nests: 'at the nests',
      stock: 'with the stock', count: 'at the count', report: 'the report',
    },
    newGame: 'New game',
    newGameConfirm: 'Click again to start over',
    loadFile: 'Load from file',
    notASave: 'That file isn\'t a save from this game.',
    storyHeading: 'The story',
    story: 'The hoiho is one of the rarest penguins in the world: a shy, yellow-eyed bird that nests alone '
      + 'in the bush rather than in a noisy crowd, and will waddle a surprisingly long way uphill to do it. '
      + 'On this stretch of the Catlins coast a handful of pairs still come ashore each evening, to a scrap of '
      + 'old bush hemmed in by farmland, rabbits and some very determined stoats. Years ago someone fenced off '
      + 'the gullies, planted the first flax and started setting traps, and now the job has passed to you. '
      + "There's no pay, the forecast is always worse than promised, and the tent has seen better decades. "
      + 'But keep the pests down, the fences up and the seedlings growing, and the bush will thicken, the birds '
      + 'will find safe places to nest, and one day a chick you weighed and banded may come home from the sea '
      + 'as an adult. The sea will do what the sea does. The land is yours to look after.',
    howHeading: 'How to play',
    how: [
      'You look after a small reserve where yellow-eyed penguins, the hoiho, nest. Once a month you visit for a day.',
      'Click a place on the map to walk there. Walking and jobs use up daylight, so choose what matters most.',
      'Trap the stoats, mend the fence, plant the shrubs. Fewer pests means more chicks and more birds in the reserve.',
      'At dusk you head to the hillside and count the penguins as they come ashore.',
      'Nothing is timed and nobody gets cross. The field notebook and the colony list fill up as you go.',
    ],
    footer: 'Mouse only. Your game saves itself after every action.',
    // The map's credit, which the LINZ licence asks to be visible in the game (see CREDITS.md). Each part links.
    credit: [
      { text: 'Map based on LINZ aerial imagery and LiDAR, modified. ', url: null },
      { text: '© LINZ CC BY 4.0', url: 'https://www.linz.govt.nz/linz-copyright' },
      { text: ' · ', url: null },
      { text: '© Imagery Basemap contributors', url: 'https://www.linz.govt.nz/data/linz-data/linz-basemaps/data-attribution' },
    ],
  },
  notebook: {
    heading: 'Field notebook',
    found: 'Found {mi} of Year {year}',
    locked: 'Not found yet',
    page: 'Page {n} of {total}',
    speciesHeading: 'Birds and other visitors',
    speciesLocked: 'Not seen yet. Keep the reserve healthy and see who turns up.',
    speciesTone: { riroriro: 0xc9b98a, tui: 0x44566a, korimako: 0x9aa860, matata: 0xb08a5c, kereru: 0x8fa07c, heron: 0x8a929a },   // sketch colour per bird
    speciesSketch: { korora: 'korora', titi: 'titi' },     // species that have their own drawing (the rest are perched birds)
    speciesFirst: 'First here in Year {year}',
    speciesStart: 'Here from the start',
    count: '{n} of {total} entries found',
    back: 'Back to the map',
    prev: 'Back',
    next: 'Next',
  },
  colony: {
    heading: 'The colony',
    sub: '{n} adults · {pairs} pairs',
    back: 'Back to the map',
    prev: 'Back',
    next: 'Next',
    page: '{from}-{to} of {total}',
    cols: { name: 'Name', band: 'Band', age: 'Age', quirk: 'Quirk', mate: 'Mate', nest: 'Nest', chicks: 'Chicks', seen: 'Last seen' },
    male: 'M',
    female: 'F',
    noMate: '-',
    seenRecently: 'seen lately',
    seenSince: 'not since {when}',          // {when} is like Nov Y2
    neverSeen: 'not seen yet',
    zoneShort: { tent: 'Tent', boundary: 'Fence', paddock: 'Paddock', bush: 'Bush', gully: 'Gully', headland: 'Headland', beach: 'Landing' },
    nest: { eggs: '{zone} · eggs', chicks: '{zone} · chicks', fledged: '{zone} · fledged', empty: '{zone} · empty', waiting: '{zone} · waiting', none: 'no nest', young: 'too young' },
    bandColours: { R: 0xd8453a, B: 0x3d7ec9, Y: 0xe5c33a, G: 0x4fa66a, W: 0xf0ede0 },      // chip colour for each band letter
    bandDarkText: ['Y', 'W'],           // band letters whose chip is light, so the number is drawn dark
    chartColony: 'Adults in the colony',
    chartFledged: 'Chicks fledged each year',
    chartReserve: 'Reserve life (0 to 100)',
    chartNow: 'now',
    homegrown: 'Gold names hatched here. Click any bird for its story.',
    family: {                             // a bird's story, when you click it (src/family.js)
      close: 'Close',
      him: 'him', her: 'her',
      hatched: "Hatched at {from}'s nest in Year {bornYear}.",
      byYou: 'You weighed {them} as a chick and chose the band yourself.',
      parentsBoth: 'Parents {a} and {b} are both still here.',
      parentsOne: 'Of the parents, {name} is still here.',
      parentsGone: 'The parents are no longer seen.',
      founder: 'One of the birds that was here when you took the reserve on.',
      coast: 'Turned up from elsewhere along the coast.',
      mate: 'Paired with {name}.',
      mateHomegrown: 'Another one that hatched here.',
      chicks: '{n:chick} fledged over the years.',
      home: 'Chicks of theirs home again as adults: {names}.',
      grand: '{n:grandchick} fledged so far.',
    },
    noHistory: 'The charts fill in after your first year.',
    staleAfter: 3,                      // months: a bird not confirmed for longer than this is shown as "not seen since"
    rowsPerPage: 11,                    // birds listed on each page (fewer is used on short windows)
  },
  report: {
    reserveLife: 'Reserve life',
    colony: 'Adults in the colony',
    fledged: 'Chicks fledged',
    survived: 'Adults that survived',
    sinceLast: '{d} since last year',
    midYear: 'as things stand',
    noChange: 'no change since last year',
    firstYear: 'your first year',
    fledgedOf: 'of {eggs} eggs',
    survivedOf: 'of {total}',
    colonyScale: 60,                    // adults: the colony meter is full at this many birds
    nothingNew: 'No new arrivals this year. These things take time.',
    highlightsHeading: 'Highlights',
    more: 'More of the report  →',      // when the report doesn't fit on one screen
    back: '←  Back',
  },
  map: {
    notebook: 'Notebook',
    colony: 'Colony',
    saveFile: 'Save file',
    loadFile: 'Load file',
    newGame: 'New game',
    newGameConfirm: 'Sure?',
    left: '{left} left',
    headHome: 'Head to the count',
    mud: ' Mud everywhere.',
    weatherSub: { rain: 'rain', drizzle: 'drizzle', wind: 'wind', cold: 'cold', storm: 'storm', fine: 'fine' },
  },
  // Gentle colouring of the map by time of day. f = how far through the day (0 dawn to 1 dusk).
  // Colours are blended over the map at the given alpha (0 to 1).
  tint: {
    morning: { colour: 0x9cb8d8, alpha: 0.16, until: 0.25 },     // cool and bluish until this fraction of the day
    midday: { colour: 0xffffff, alpha: 0, until: 0.6 },           // no tint around the middle of the day
    evening: { colour: 0xf0a050, alpha: 0.26 },                   // warm gold, reaching this alpha at dusk
    weather: { rain: 0.14, drizzle: 0.1, storm: 0.26, cold: 0.1, wind: 0.05, fine: 0 },   // grey wash for the sky, alpha
    weatherColour: 0x3a4650,
  },
  // Weather effects on the map: a fixed pool of streaks that fall or blow across it.
  //   n: how many streaks; len: length (map px); speed: map px per ms; dir: [x, y] direction;
  //   width: line width (map px); alpha: 0 to 1; flakes: draw dots instead of lines
  fx: {
    rain: { n: 120, len: 190, speed: 2.4, dir: [0.22, 1], width: 7, alpha: 0.5, colour: 0xcfe4f4 },
    drizzle: { n: 70, len: 90, speed: 1.2, dir: [0.12, 1], width: 5, alpha: 0.4, colour: 0xcfe4f4 },
    storm: { n: 190, len: 260, speed: 3.4, dir: [0.55, 1], width: 8, alpha: 0.55, colour: 0xcfe4f4 },
    wind: { n: 34, len: 340, speed: 3.2, dir: [1, 0.06], width: 9, alpha: 0.55, colour: 0xf4f0dc },
    cold: { n: 70, len: 0, speed: 0.3, dir: [0.15, 1], width: 13, alpha: 0.85, colour: 0xf4faff, flakes: true },
  },
};
