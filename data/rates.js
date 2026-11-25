// Every balance number in the simulation. Ported unchanged from the prototype
// (docs/hoiho-prototype.html); tune here, then check with
//   node tools/simulate.js --years 20 --seed 7
// Levels marked 0-100 are percentages or abstract scores.
export default {
  start: {
    stoat: 40,               // 0-100 reserve-wide stoat level
    rodent: 40,              // 0-100 reserve-wide rat and mouse level
    adults: 16,              // penguins at the start
    pairedAdults: 14,        // of those, how many start already paired (7 pairs)
    ageMin: 3,               // years: youngest starting adult
    ageSpread: 12,           // years: ages run from ageMin to ageMin + ageSpread - 1
    reserve: 25,             // 0-100 reserve life score
  },
  stoats: {
    hotspot: 1.7,            // times more stoats in this season's hotspot area
    trapEffect: 0.85,        // share of stoats fresh, full trap lines remove (0-1)
    fullLine: 4,             // traps a line needs to work at full strength
    fromRodents: 0.6,        // next season's stoats = base + fromRodents * average rodents...
    base: 18,                //   ...plus this...
    jitterMin: -5,           //   ...plus a random amount from jitterMin...
    jitterMax: 10,           //   ...to jitterMax
    min: 10, max: 95,        // 0-100: limits on the new season's stoat level
    defaultRodent: 40,       // rodent average to assume if there's no record yet
    perCatch: 6,             // stoat level drops this much per stoat caught (catches are rare, so each counts)
    floor: 8,                // trapping never takes the stoat level below this
    signFrom: 22,            // local stoat level above which you may find sign
    signChance: 0.35,        // chance of sign = signChance + local level / signScale
    signScale: 120,
    heavySign: 45,           // local level above which the sign is "everywhere"
    ferretChance: 0.04,      // chance a trap line has a ferret in one of its empty traps
  },
  trapLine: {               // the trap line mini-game (data/trapline.js has the actions)
    walkMinutes: 10,         // minutes to walk from one trap to the next (they are 100-200 m apart)
    tunnelMinutes: 5,        // minutes to check the tracking tunnel
    stoatCatch: 0.25,        // chance a trap holds a stoat = local stoat level / 100 * this
    ratCatch: 0.2,           // chance a trap holds a rat = local rodent level / 100 * this
    sprungChance: 0.1,       // chance an empty trap has been sprung (wind, a lucky rat)
    staleBase: 0.55,         // chance the bait in an empty, set trap has gone off: staleBase...
    staleScale: 0.45,        // ...plus (100 - trap freshness) / 100 * this. Most checks are a rebait.
    good: 0.66,              // share of traps working for a "good" result (2 of 3 counts) (all working = "great")
    tunnelFew: 22,           // local stoat level for "a few" prints on the tunnel card...
    tunnelMany: 45,          // ...and for prints "all over"
    ratFew: 30,              // local rodent level for some rat prints...
    ratMany: 55,             // ...and for a card black with them
    moveHintBelow: 22,       // suggest moving traps when the local stoat level is under this
  },
  fenceWalk: {              // the fence walk mini-game (data/fencewalk.js has the words)
    sections: 6,             // sections of fence you walk, one stop each
    walkMinutes: 7,          // minutes to walk from one section to the next
    breakOdds: { sagging: 0.5, broken: 0.3, post: 0.2 },   // shares: what kind of damage each break is
    decoyChance: 0.15,       // chance a section with no real sign has harmless possum prints
    good: 0.66,              // share of breaks mended for a "good" result (all mended and all sign read = "great")
  },
  baitRounds: {             // the bait-station rounds (data/baitrounds.js has the words)
    stations: 4,             // stations on a round, one stop each
    walkMinutes: 5,          // minutes to walk from one station to the next
    capacity: 4,             // scoops a full station holds (one per well)
    overflow: 2,             // extra scoops you could tip in before the bag is empty: they spill and are wasted
    missing: { none: 0, some: 0.5, all: 1 },   // share of a station's bait gone for each amount taken
    takeOdds: {              // shares: how much was taken, by how bad the rodents are (rates.rodents.baitHeavy / baitSome)
      heavy: { none: 0.05, some: 0.25, all: 0.7 },
      some: { none: 0.3, some: 0.6, all: 0.1 },
      little: { none: 0.8, some: 0.2, all: 0 },
    },
    mouldChance: 0.12,       // chance the pellets left in a station have gone mouldy (in a dry month)
    mouldWetFactor: 1.6,     // times: mould is likelier in the muddy (wet) months (calendar.muddyMonths)
    ratShare: 0.5,           // share of droppings and teeth marks that are rat (the rest are mouse)
    mouseOdds: { none: 0.05, some: 0.15, all: 0.3 },   // chance a live mouse is in or by a station, by how much bait was taken
    mouseWhere: { in: 0.6, by: 0.4 },                  // shares: the mouse is inside the station, or on the ground beside it
    mouseNeed: { 1: 0.5, 2: 0.5 },                     // shares: swings of the boot it takes (2 means the first one misses)
    mouseFate: { flat: 0.5, puff: 0.3, scarper: 0.2 }, // shares: how a hit ends (a flat cartoon mouse, a puff of dust, or it runs off)
    tippedChance: 0.07,      // chance a station has been knocked over (by a possum) and bait scattered
    guestChance: 0.12,       // chance a weta or slug is in a station that is not knocked over
    guestOdds: { weta: 0.55, slug: 0.45 },             // shares: which one it is
    waspMonths: [6, 7, 8],   // months (Feb to Apr, late summer) when a wasp nest may be near a station
    waspChance: 0.25,        // chance a station has a wasp nest nearby in those months
    good: 0.75,              // share of bait wells full for a "good" result (all full and nothing wasted = "great")
  },
  torchRounds: {            // possum and rabbit rounds by torchlight (data/torchrounds.js has the words)
    stops: 4,                // trap sites on a round, one stop each
    walkMinutes: 5,          // minutes to walk from one trap to the next
    eyesChance: 0.7,         // chance of possum or rabbit eyes at a stop = this * (browsing pressure / full pressure)
    rabbitShare: 0.5,        // share of eyes and catches that are rabbit (the rest possum)
    moreporkChance: 0.15,    // chance a morepork's eyes are in the dark too (nothing to set a trap for)
    signChance: 0.7,         // chance of sign at a stop = this * (0.4 + 0.6 * browsing pressure / full pressure)
    signOdds: { nibble: 0.2, droppings: 0.2, scratch: 0.25, chewed: 0.2, pdung: 0.15 },   // shares: which sign it is (data/torchrounds.js says what each means)
    moreSignChance: 0.2,     // chance of a second, different sign at a stop that already has one
    catchChance: 0.6,        // chance a trap holds a catch = this * (browsing pressure / full pressure)
    sprungChance: 0.1,       // chance an empty trap has been sprung
    lureGoneChance: 0.55,    // chance the lure in an empty, set trap is gone
    good: 0.7,               // share of traps working for a "good" result (all working and all found = "great")
  },
  rodents: {
    baitEffect: 0.85,        // share of rodents full bait stations remove (0-1)
    boomChance: 0.22,        // chance of a rodent boom year (beech mast and the like)
    boomLevel: 75,           // 0-100 rodent level in a boom year
    normalLevel: 40,         // 0-100 rodent level in a normal year
    boomRise: 3,             // per month: rise in a boom year from the boom month on
    baitHeavy: 60,           // rodent level above which the bait was all eaten
    baitSome: 35,            // ...above which a fair bit was taken
  },
  browse: {
    pressure: 50,            // 0-100 browsing by possums and rabbits with no control
    controlEffect: 0.85,     // share of browsing that full control removes
    possumsMax: 3,           // possums caught: 1 to this
    rabbitsMax: 5,           // rabbits caught: 1 to this
  },
  decay: {                   // per month, how much each kind of upkeep wears off (0-100)
    traps: 25,
    bait: 25,
    browse: 20,
    fence: 8,
  },
  fence: {
    stormDamage: 25,         // a storm knocks this much off one fence
    perBreak: 18,            // breaks found = (100 - condition) / perBreak
    sound: 75, sagging: 50, gaps: 30,   // condition thresholds for what you see
    bounceChance: 0.08,      // chance a penguin walks into freshly mended wire
  },
  intruders: {
    pigChance: 0.2,          // per month per fence: chance = (share of fence down) * this
    deerChance: 0.16,
    stockBelow: 60,          // stock can get in when a fence is below this condition...
    stockChance: 0.3,        // ...with this chance per month
    sheepShare: 0.5,         // share of stock that are sheep (the rest are cattle)
    boggedZone: 'gully',     // where a cow ends up bogged when the ground is mud (the creek)
    stockStays: 2,           // months before the farmer collects his stock
    roamChance: 0.4,         // chance a pig or deer moves to a neighbouring area each month
    pigTrample: 0.06,        // share of young plants a pig destroys per month
    deerTrample: 0.06,
    stockTrample: 0.12,
    pigNestChance: 0.35,     // chance per breeding month a pig digs out a nest
    deerNestChance: 0.25,
    stockNestChance: 0.2,
  },
  plants: {
    batch: 100,              // plants per planting job
    monthsToMature: 24,      // months before a planting counts as established cover
    browseLoss: 0.08,        // monthly share lost at full browsing pressure
    exposedLoss: 0.03,       // extra monthly loss for shrubs on exposed ground without shelter
    shelterNeeded: 60,       // flax cover that counts as shelter
    youngFlaxShelter: 0.5,   // young flax counts this much towards shelter
    coverPerSite: 60,        // mature cover per extra nest site
    flaxCover: 0.5,          // flax counts this much as nest cover (shrubs count 1)
    habitatBase: 25,         // habitat score = base + total cover / habitatScale (0-100)
    habitatScale: 6,
  },
  day: {
    workBeforeSunset: 90,    // minutes: work ends this long before sunset (time to walk to the count)
    length: 9 * 60,          // minutes of work in a day
    earliestStart: 9 * 60,   // minutes after midnight: never start before 9am
    fineBonus: 30,           // minutes: a fine day lets you start earlier
    walkMinutes: 30,         // minutes per path between areas
    soreBack: 15,            // extra minutes per walk the day after lifting sheep
    mudChance: 0.7,          // chance heavy rain in a muddy month makes mud
    mudMinutes: 15,          // extra minutes for each job in a muddy gully
    windPlanting: 30,        // extra minutes to plant in wind or storm
  },
  quick: {                  // the "Quick" button: a job done in one click instead of its mini-game
    missChance: 0.6,         // chance a hasty caretaker misses the care at one trap or stop on the round
    skipShare: 0.3,          // share of seedlings planted wherever there's room, not carefully
  },
  finds: {
    velvetChance: 0.02,      // chance of a velvet worm in the old bush...
    velvetBonus: 0.05,       // ...plus this once reserve life passes velvetFrom
    velvetFrom: 55,
    fernbirdChance: 0.3,     // chance a fernbird calls (once they've returned)
    sealionChance: 0.14,     // chance of a sea lion on the landing in summer
    receptionChance: 0.12,   // chance of finding a bar of reception at the tent
    // Notebook luck: each visit without a new notebook entry adds 1 luck (meeting a goal adds
    // goals.luck more), and a new entry resets it. Luck raises the odds of every entry not yet found.
    luckStep: 0.03,          // added to the chance of an unfound entry, per point of luck
    luckMax: 0.5,            // the most luck can add to one chance
  },
  nests: {
    pairAge: 2,              // years: youngest age to pair
    twoEggChance: 0.9,       // chance a nest has two eggs (otherwise one)
    eggRat: 0.07,            // monthly chance per egg at full rodent level
    eggStoat: 0.05,          // monthly chance per egg at full stoat level
    hatchChance: 0.85,       // chance an egg hatches
    chickStoat: 0.22,        // monthly chance per chick at full stoat level
    chickRat: 0.05,          // chance per chick in the hatching month at full rodent level
    nearDisturb: 0.05,       // chance per nest with eggs that creeping close early in the season (Aug to Oct) loses an egg
    farDisturb: 0,           // chance per nest that a quiet look from a distance loses an egg
    leaveSurvive: 0.3,       // chance a light chick left with its parents still fledges (rehab is certain)
    returnAfter: 2,          // years before a fledgling may come home
  },
  count: {
    spanSummer: 150,         // minutes the penguins keep landing in summer
    spanOther: 130,          // ...and the rest of the year
    ashoreBreeding: 0.55,    // chance each adult comes ashore in Sep to Jan
    ashoreMoult: 0.35,       // ...in Mar and Apr (moulting, mostly staying put)
    ashoreOther: 0.8,        // ...otherwise
    breedingMonths: [1, 2, 3, 4, 5],
    moultMonths: [7, 8],
    quirkShown: 0.5,         // chance a quirk shows (unless the quirk always does)
    thinChance: 0.4,         // chance a bird looks thin in a poor sea year
    tentChance: 0.05,        // chance a nosy bird wanders into the tent
    lateMin: 10,             // minutes after the window a sleepy bird lands, from...
    lateSpread: 20,          // ...plus up to this many
    ambientLines: 2,         // ambient lines each count
    talkLines: 3,            // the companion's lines each count, at most...
    talkChance: 0.75,        // ...each said with this chance
    sandflyChance: 0.5,      // still summer evenings
    sandflyDelay: 15,        // minutes after you arrive
    kororaChance: 0.12,      // little blue penguin in the count...
    kororaChanceBack: 0.5,   // ...once kororā have returned
    titiChance: 0.6,         // tītī flying in, once they've returned
    titiBeforeEnd: 10,       // minutes before the end of the window
    fursealChance: 0.08,
    sceneSeeds: 1000000000,  // range of the count scene's own seed (a whole number)
    lookalikeCost: 0.05,     // share of accuracy lost per kororā, shag or rock you tally
    greatFrom: 0.9,          // accuracy (0 to 1) for a great count...
    goodFrom: 0.6,           // ...and a good one (below that it's rough)
    missingAfter: 3,         // visits since a known bird was last identified before it shows as missing
    earlyStart: 45,          // minutes of extra daylight next visit for answering tonight's question (data/count-asks.js)
  },
  colony: {
    oldAge: 18,              // years: older birds survive less well...
    oldPenalty: 0.12,        // ...by this much
    minimum: 8,              // the colony never drops below this: birds arrive from along the coast
    immigrantAgeMin: 3,      // years: arriving birds are 3 to 6
    immigrantAgeSpread: 4,
  },
  reserve: {
    habitatWeight: 0.6,      // reserve life heads towards 0.6 * habitat + 0.4 * pest control
    controlWeight: 0.4,
    approach: 0.35,          // share of the gap closed each year
    maxDrop: 2,              // reserve life never falls more than this in a year
    defaultControl: 50,      // control to assume if there's no record yet
    beeFrom: 35,             // reserve life needed for a working bee
    beeShrubs: 100,          // shrubs the volunteers plant
  },
};
