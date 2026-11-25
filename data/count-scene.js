// The dusk count scene (watch and spot): timing, light, weather looks, how
// the birds behave, how well you can read a band, and the scene's words.
// The simulation decides who comes ashore and when (src/sim/count.js); this
// file only sets how the evening looks and feels on screen.
//
// Colours are 0xRRGGBB. "Multiplier" colours tint the drawn view: 0xffffff
// leaves it as drawn, darker colours darken it (that's how the light goes).
export default {
  seconds: 110,            // real seconds the evening takes on screen at normal speed
  // The speed you watch at. pace: how fast everything runs, birds and light alike
  // (1 = as drawn; 0.5 = twice as slow). It's a viewing choice only: who comes
  // ashore and when never changes, and nothing is missed for being slow.
  speeds: [
    { key: 'slow', label: 'Slow', pace: 0.45 },
    { key: 'normal', label: 'Normal', pace: 1 },
    { key: 'brisk', label: 'Brisk', pace: 1.6 },
  ],
  defaultSpeed: 'normal',  // the speed used until you pick one
  tailMinutes: 14,         // evening minutes after the last thing happens (the light keeps going)
  lastLandingAt: 0.82,     // share of the evening by which the last bird has landed (0 to 1)

  // How the birds move (scene pixels; the view is 1600 x 840).
  walkSpeed: 30,           // px per second a hoiho waddles
  kororaSpeed: 44,         // px per second a kororā scurries
  stepSeconds: 0.24,       // seconds per waddle step (the picture alternates)
  emergeSeconds: 1.6,      // seconds to come up out of the surf
  pauseChance: 0.55,       // chance of a short stop at each point along the way
  pauseSeconds: [1.2, 3.5],// a short stop lasts between these many seconds
  dipChance: 0.25,         // chance a bird turns back into the surf once before landing properly
  dipSeconds: [3, 7],      // seconds it's gone before coming out again
  sizeFar: 0.5,            // a bird's size at the waterline (share of its 1x picture: a hoiho 84 px tall). Small: you're a long way off...
  sizeNear: 0.82,          // ...and at the bush edge (nearer you)
  lookalikeSize: 0.84,     // the rock, a standing shag and kelp drawn this many times their 1x size, to match the birds
  hitWidth: 72,            // px (view pixels): smallest click area round each bird; it grows to cover bigger birds
  hitHeight: 86,
  pickReach: 46,           // px (view pixels): with the binoculars up, a click picks the bird nearest the middle of the lens if it's this close
  labelSeconds: 4.5,       // seconds a bird's name card stays up
  captionSeconds: 8,       // seconds a caption (what happens around you) stays up

  // What each quirk looks like on the beach, by its place in data/penguins.js quirks.
  //   shore: seconds standing at the waterline; dips: times it goes back into the surf;
  //   stop: seconds stopped halfway; speed: walking speed multiplier;
  //   nosy: wanders towards you first; detour: px it swings out on the way up
  quirkMoves: [
    {},                                  // sleeps in (it lands late; that's the sim's doing)
    { shore: 7 },                        // neurotic: freezes at the waterline
    { detour: 120 },                     // afraid of crabs: long way round the rock pool
    { shore: 5 },                        // hates getting wet: stands in the shallows, offended
    { nosy: true },                      // nosy: comes to look at you
    { dips: 3 },                         // terrible at landing: dumped by three waves
    {},                                  // creature of habit: same line every time
    { stop: 6 },                         // hopeless romantic: stops to bray up the hill
    { speed: 0.9 },                      // unimpressed
    { speed: 1.5 },                      // show-off: straight up the steep bit
    { stop: 5 },                         // easily distracted: stares at nothing halfway
    {},                                  // grudge against shags
    { speed: 1.6 },                      // always in a hurry
    { detour: 170 },                     // goes the long way round
    { shore: 6 },                        // fond of a preen
    { detour: 80, speed: 0.9 },          // keeps to the shadows
    { dips: 2 },                         // dreadful ditherer
    { shore: 8 },                        // rather shy
    {},                                  // talks to itself
    { speed: 0.75 },                     // terribly stately
    { speed: 0.85 },                     // rolls like a sailor
    { stop: 5 },                         // kelp inspector
    { speed: 1.15 },                     // hates sandflies
    { stop: 4 },                         // loyal to one rock
    { stop: 3 },                         // weather watcher
    { speed: 1.2 },                      // brave beyond reason
  ],

  // Reading a leg band. clarity = light's read x weather's read x nearness,
  // where nearness runs from nearFrom at the waterline to 1 at the bush edge.
  // The band can be read when clarity is at least readNeed.
  // Without the binoculars you can't read a band or tell a hoiho from a look-alike.
  // With them, clarity is multiplied by binoBoost.
  readNeed: 0.5,
  binoBoost: 1.2,
  nearFrom: 0.55,
  bandColours: { R: 0xd0463c, B: 0x4a78d8, Y: 0xf2c94c, G: 0x4caf5e, W: 0xf4f4f0 },

  // The light through the evening. at: share of the evening (0 to 1).
  //   land: multiplier on the view; sky: [top, middle, horizon]; sea: [far, near];
  //   glow: warm light low in the sky (0 to 1); read: how well you can see (0 to 1);
  //   stars: how many stars show (0 to 1)
  light: [
    { at: 0, land: 0xfff7ea, sky: [0x7c9cc2, 0xa9bccf, 0xe9dcc0], sea: [0x6f93a6, 0x3f6f7e], glow: 0.2, read: 1, stars: 0 },
    { at: 0.3, land: 0xffe6c4, sky: [0x6a86b0, 0xb0a8b4, 0xf3c894], sea: [0x8a94a0, 0x44626e], glow: 0.7, read: 1, stars: 0 },
    { at: 0.52, land: 0xd6a8a0, sky: [0x46578a, 0x9a7f98, 0xec9e7e], sea: [0x7a6e86, 0x34465a], glow: 1, read: 0.88, stars: 0 },
    { at: 0.74, land: 0x7f8aac, sky: [0x232d4c, 0x4a4f74, 0x8a7a96], sea: [0x404c6a, 0x222e44], glow: 0.35, read: 0.66, stars: 0.4 },
    { at: 1, land: 0x56607e, sky: [0x0e1424, 0x1a2238, 0x323a56], sea: [0x222c42, 0x141c2c], glow: 0, read: 0.45, stars: 1 },
  ],
  // The binoculars: a round double-lens view that follows the mouse.
  binos: {
    zoom: 2.6,             // how many times bigger things look through the lens
    radius: 128,           // px (screen): each lens circle's radius
    spread: 92,            // px (screen): how far each lens centre is from the middle (they overlap)
    surround: 0.62,        // how dark the view outside the lens goes (0 clear to 1 black)
    rim: 0x0b0f0d,         // the lens rims and the bridge between them
    reticle: 0xf2c94c,     // the soft ring in the middle that shows what a click will pick
  },
  penguinLift: 0.25,        // birds catch a bit more light than the land (0: none, 1: always full light)

  // How each weather looks. grey: how much the sky and light go grey (0 to 1);
  //   rain: drops on screen; drop: 'rain' or 'sleet'; wind: 0 calm to 1 gale (slants rain,
  //   whitecaps); haze: mist over the sea (0 to 1); clouds: how many clouds; read: multiplier
  //   on seeing bands; dim: extra darkening (0 to 1)
  weather: {
    fine: { grey: 0, rain: 0, wind: 0.1, haze: 0, clouds: 3, read: 1, dim: 0 },
    cold: { grey: 0.45, rain: 70, drop: 'sleet', wind: 0.35, haze: 0.12, clouds: 6, read: 0.95, dim: 0.06 },
    drizzle: { grey: 0.7, rain: 140, drop: 'rain', wind: 0.2, haze: 0.38, clouds: 7, read: 0.82, dim: 0.1 },
    rain: { grey: 0.75, rain: 260, drop: 'rain', wind: 0.35, haze: 0.25, clouds: 8, read: 0.78, dim: 0.14 },
    wind: { grey: 0.35, rain: 0, wind: 1, haze: 0.08, clouds: 7, read: 0.88, dim: 0.05 },
    storm: { grey: 0.9, rain: 420, drop: 'rain', wind: 1, haze: 0.35, clouds: 9, read: 0.66, dim: 0.24 },
  },
  cloudSpeed: [4, 12],     // px per second clouds drift (more with wind)
  waveSeconds: 7,          // seconds between waves running up the beach
  maxStars: 70,            // stars on a clear night
  squallSeconds: 12,       // how long a passing squall lasts
  goldSeconds: 10,         // how long the headland stays gold when the cloud lifts
  gustSeconds: 8,          // how long a gust lasts
  shagStays: 0.45,         // chance a shag is standing on the rocks when you arrive
  extraShags: 2,           // shags that may fly past besides the ones in the sim's lines
  sandflies: 16,           // sandflies at once on a still night (they're pooled)
  titiFlock: 22,           // tītī in the flock that comes in at dusk
  companionSeconds: 18,    // seconds a companion's line waits for a reply before the moment passes
  replySeconds: 5,         // seconds their answer stays up
  hintAfter: 12,           // seconds into the evening before your companion mentions the binoculars (if you haven't found them)
  nodChance: 0.4,          // chance they say something small when you just keep watching

  text: {
    heading: 'Dusk count',
    tally: 'Tally {n}',
    speedHeading: 'How fast the evening goes',
    binosUp: 'Binoculars (or right-click)',
    binosDown: 'Binoculars down',
    binosHint: 'Move the mouse to look about. Click to tally.',
    tooFarPlain: 'Counted. Too far off to tell who it is. Try the binoculars (right-click).',
    plainShape: 'Something penguin-shaped. From here it could be anything. Try the binoculars (right-click).',
    hint: 'Your companion nudges the bag between you. "Binoculars are in there. Hoiho are hard to make out from this far, and the rock is counting on it. Right-click, or press the button."',
    takenOff: 'Ah, not a hoiho after all. You take it back off the tally.',
    skip: 'Pack up early',
    keepWatching: 'Keep watching',
    counted: 'Counted',
    already: 'Already counted',
    named: '{name} · {band}',
    unread: 'Too dark to read the band',
    unreadFar: 'Too far off to read the band yet',
    thin: 'Looks thin.',
    tent: '{name} wanders off towards the old tent. You\'ll have to shoo it out later.',
    korora: 'A kororā, not a hoiho. Not one for the tally.',
    shag: 'A shag, not a hoiho. Long neck gives it away.',
    rock: 'That\'s the rock. It\'s always the rock.',
    kelp: 'Kelp. Very penguin-shaped kelp.',
    sealion: 'A whakahao, sound asleep. Not in the count, and not to be argued with.',
    furseal: 'A fur seal, having a lie-down. Not in the count.',
    summary: {
      heading: { great: 'A great count', good: 'A good count', rough: 'A rough count' },
      counted: 'You counted {counted}. There were {n} ashore after you got there.',
      none: 'Nobody came ashore while you watched.',
      leftEarly: 'You packed up before the last of them landed.',
      missed: '{missed} were already up the hill before you arrived.',
      read: 'Bands read: {names}.',
      noneRead: 'No bands read tonight: too dark, too far off, or the binoculars stayed in the bag.',
      unread: 'Counted but not read: {unread}.',
      lookalikes: 'Not hoiho, but counted anyway: {n}.',
      thin: 'Looking thin: {names}.',
      missing: 'Not seen for a while: {names}.',
      meaning: {
        great: 'A clear picture of who\'s home.',
        good: 'Enough to know most of who\'s home.',
        rough: 'Hard to say much about who\'s home tonight. There\'s always next month.',
      },
      done: 'Pack up and drive home',
      andMore: '{names} and {n} more',
    },
  },
};
