// The planting mini-game: the plot, the seedlings, the rules and the words.
// Rules in src/sim/planting.js, drawing in src/scenes/PlantingScene.js.
// Every number says what it is and its unit. Text is for the player.
export default {
  // How big the plot is and what's on it. Sizes are in planting spots (columns x rows).
  plot: {
    sizes: [[7, 4], [7, 5], [8, 4], [8, 5], [6, 5]],   // one is picked at random each visit
    secondPathChance: 0.4,     // chance of a second penguin track across the plot
    wobbleChance: 0.3,         // chance a track steps sideways instead of straight on
    pathMaxShare: 0.3,         // tracks never take more than this share of the spots
    plantsPerCell: 50,         // plants in earlier plantings that one drawn plant stands for
    youngBelow: 8,             // months: a planting younger than this is drawn as a seedling
    midBelow: 18,              // months: younger than this is drawn half grown (older: grown)
    spareSpots: 3,             // spots always left empty beyond the batch, however grown-in the plot
    historyEdgeShare: 0.5,     // most of the windward edge old flax may take
    warrenFrom: 15,            // browse pressure (0-100) at which rabbits are about at all
    warrenPer: 20,             // one more rabbit burrow for every this much pressure above the minimum
    warrenMax: 3,              // most rabbit burrows on a plot
  },
  // What a batch is. Each seedling stands for plantsPerSeedling plants in the reserve.
  batch: {
    seedlings: 10,             // seedlings in a batch
    plantsPerSeedling: 10,     // plants each seedling stands for (batch x this = rates.plants.batch)
    guards: 4,                 // rabbit guards in your bag
  },
  // Time: each step uses a little daylight (minutes).
  minutes: {
    start: 44,                 // carrying the trays in and marking out the plot
    place: 8,                  // putting one seedling in
    guard: 2,                  // fitting a rabbit guard
    lift: 1,                   // lifting a seedling to move it
  },
  // How a seedling does, as a share (0-1) of its plants that survive the planting.
  // Each applies on top of the others.
  survival: {
    onPath: 0.1,               // planted on a penguin track: trampled in the first week
    tenderOnEdge: 0.3,         // a tender plant on the windward edge
    tenderNoShelter: 0.6,      // a tender plant with nothing windward of it
    crowded: 0.8,              // too many neighbours: they fight for light
    rabbits: 0.45,             // next to a rabbit burrow with no guard
  },
  crowdedAt: 6,                // planted neighbours (of the 8 round it) that hem a seedling in
  // How much a guard helps the plant in the years that follow (share of browse losses removed, 0-1).
  guardEffect: 0.1,
  // Grading, from the average survival of the seedlings and the rules broken.
  // Great needs no rule broken at all; good needs the average to stay up.
  goodAverage: 0.75,           // average survival (0-1) for a good result
  // Plants. group: how the sim counts them ('flax' or 'shrub').
  // hardy: copes with the wind. shelters: gives shelter to tender plants behind it.
  species: [
    { k: 'flax', name: 'Harakeke · flax', short: 'Flax', group: 'flax', hardy: true, shelters: true,
      note: 'Hardy and possum-proof. Goes on the windward edge and shelters what grows behind it.' },
    { k: 'coprosma', name: 'Karamū · coprosma', short: 'Coprosma', group: 'shrub', hardy: true, shelters: false,
      note: 'Tough, glossy shrub. Copes with the wind where others would not.' },
    { k: 'kohuhu', name: 'Kōhūhū · pittosporum', short: 'Kōhūhū', group: 'shrub', hardy: false, shelters: false,
      note: 'Tender. Needs flax or old cover on its windward side.' },
    { k: 'fuchsia', name: 'Kōtukutuku · fuchsia', short: 'Fuchsia', group: 'shrub', hardy: false, shelters: false,
      note: 'Tender. Feeds the birds with its berries, if it gets a gentle start.' },
  ],
  // Words for the scene.
  ui: {
    title: '{zone}: planting',
    timeUsed: '{time} on the plot so far',
    intro: 'Pick a seedling, then click a spot. Wind from the {wind}: flax along that edge first, tender plants behind it. Hover a spot to see how it would do.',
    seedlingsLeft: '{left} of {total} seedlings left',
    guardsLeft: '{left} of {total} guards left',
    tray: 'Seedling tray',
    guardTool: 'Rabbit guard',
    liftTool: 'Lift a seedling',
    guardHint: 'Click a planted seedling to put a guard on it (or take it off).',
    liftHint: 'Click a planted seedling to lift it out. It is not put back in the tray.',
    windward: 'Windward edge',
    wind: { n: 'north', s: 'south', e: 'east', w: 'west' },
    ready: 'All planted. Have a last look, then finish.',
    finish: 'Finish planting',
    finishLeft: 'Plant {left:more seedling} first',
    back: 'Back to the map',
    // What a spot tells you as you hover. The scene joins the facts that apply.
    spot: {
      path: 'A penguin track. Seedlings here get trampled, and the birds are blocked.',
      cover: 'Established plants already.',
      warren: 'A rabbit burrow. Nothing can be planted in it.',
      edge: 'Windward edge: only hardy plants cope here.',
      rabbits: 'Rabbits graze around the burrow. A guard keeps them off.',
      rabbitsOk: 'The guard keeps the rabbits off.',
      sheltered: 'Sheltered: there is cover on its windward side.',
      bare: 'Nothing on its windward side to shelter it.',
      crowded: 'Hemmed in: plants on {crowdedAt} or more of the 8 sides round it.',
      squeezes: 'A seedling here would hem in the one next to it.',
      free: 'Free ground.',
      guardOn: 'Click to take its guard off.',
      guardOff: 'Click to put a guard on it.',
      noGuards: 'No guards left in the bag.',
    },
    // The line before you plant: how this seedling would do here.
    verdict: {
      good: '{plant} should do well here.',
      tenderEdge: '{plant} is tender. The wind off the sea would scorch it on this edge.',
      tenderBare: '{plant} is tender and has nothing windward to shelter it.',
      path: 'Not on the track: it would be trampled.',
      crowded: '{plant} would be hemmed in here. Leave it a little room.',
    },
    grade: {
      great: 'Great. Every seedling is where it should be.',
      good: 'Good. Most of the plot is well placed. A few seedlings will struggle.',
      rough: 'Rough. Several seedlings were in the wrong spot and many will not make it.',
    },
    summary: 'About {flax:flax plant:flax plants} and {shrub:shrub} should take ({survive} of {total} seedlings).',
    rules: {              // one line per rule: ok when it was followed, bad when not
      path: { aim: 'Keep the penguin tracks clear.', ok: 'Penguin tracks kept clear.', bad: '{n:seedling} planted on a penguin track.' },
      edge: { aim: 'Flax fills the windward edge before going anywhere else.', ok: 'Flax on the windward edge.', bad: 'Not enough flax on the windward edge ({n:spot} still bare there).' },
      shelter: { aim: 'Tender plants go behind flax or old cover.', ok: 'Tender plants are sheltered.', bad: '{n:tender plant} left without shelter.' },
      rabbits: { aim: 'Guard seedlings near a rabbit burrow.', ok: 'Guards where the rabbits are.', bad: '{n:seedling} left unguarded by a rabbit burrow.' },
      wasted: { aim: 'Save guards for where rabbits are.', ok: 'No guards wasted.', bad: '{n:guard} put where there are no rabbits.' },
      crowd: { aim: 'Give each seedling room: not hemmed in on 6 sides.', ok: 'Nothing crowded.', bad: '{n:seedling} boxed in by neighbours.' },
    },
    // After finishing: what held a seedling back (hover a ringed one to see).
    problem: {
      onPath: 'It is on a penguin track and will be trampled.',
      tenderEdge: 'Tender, on the windward edge: the wind will scorch it.',
      tenderBare: 'Tender, with nothing windward to shelter it.',
      crowded: 'It is boxed in by neighbours.',
      unguarded: 'Rabbits will go for it: no guard.',
      wasted: 'The guard is not needed here: no rabbits about.',
    },
    doingWell: 'Well placed. It should take.',
    resultHint: 'Hover over a seedling to see how it fares. Ringed ones will struggle.',
    noRabbits: 'No sign of rabbits on this plot, so no guards are needed.',
    ruleHeading: 'Planning',
    aimHeading: 'What makes a good plot',
  },
};
