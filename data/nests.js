// The hands-on nest check: peeking at nests, weighing and banding chicks, and
// reviewing trail-camera frames. Numbers are in the notes; the rules are in
// src/sim/nests.js and the scene is src/scenes/NestScene.js. Breeding numbers
// (disturbance odds, rehab survival) are in rates.js under nests.
export default {
  // How long each hands-on step takes, in minutes of daylight.
  minutes: {
    far: 3,            // min: a quiet look from a distance, per nest
    near: 6,           // min: creeping right up to a nest, per nest
    weigh: 6,          // min: weighing and banding one chick
    rehab: 10,         // min: extra time to box up a light chick and arrange the pick-up
    camera: 10,        // min: scrubbing through one camera's frames
  },
  // A nest has a trail camera when its number in the list divides by this (1 = all of them).
  cameraEvery: 3,      // every third nest
  cameraMonths: [2, 3, 4, 5, 6],   // Oct to Feb (month index): the camera is out once eggs are down
  // Chick weights, in grams. A chick under lightBelow is "light".
  weight: {
    normalMin: 5000,   // g: lightest healthy chick
    normalMax: 6300,   // g: heaviest healthy chick
    lightMin: 3600,    // g: lightest underweight chick
    lightMax: 4500,    // g: heaviest underweight chick
    lightBelow: 4600,  // g: under this a chick counts as light
  },
  // Holding a chick steady. calm runs from 0 (squirming) to 1 (still).
  calm: {
    fastPx: 320,       // px/s: mouse speed above this startles the chick
    startle: 0.4,      // calm lost per second-fraction: each update loses startle * dt * 10 while moving too fast
    settlePerSec: 0.7, // calm gained per second while the mouse is slow or still
    dropStir: 0.5,     // calm is knocked down to at most this when the chick is lowered into the bag
    settled: 0.95,     // calm at which the scale reads true and you can record the weight
    wobbleG: 520,      // g: how far the reading swings when the chick is squirming
    wobbleHz: 3.3,     // swings per second of the wobbling reading
  },
  band: ['R', 'B', 'Y', 'G', 'W'],  // leg band colours you can fit (matches data/penguins.js bandColours)
  frames: 8,            // frames in a camera review
  // Times stamped on the frames, in order (the camera wakes only after dark).
  times: ['21:14', '22:46', '00:21', '01:52', '03:07', '04:18', '05:33', '06:09'],
  stoatSlots: [3, 4, 5],           // frame numbers a stoat may turn up in (the small hours)

  ui: {
    title: '{zone}: the nests',
    hintPick: 'Pick a nest to look at.',
    timeUsed: '{time} so far',
    peekFar: 'Peek from a distance',
    peekNear: 'Creep right up',
    peekFarNote: 'Quiet and safe. You can see who is home, but not what is under them.',
    peekNearNote: 'You see everything. {risk}',
    riskEarly: 'A sitting bird may be put off and knock an egg.',
    riskNone: 'No bother to them this late in the season.',
    camera: 'Look at the camera frames',
    cameraDone: 'Camera frames (seen)',
    weigh: 'Weigh a chick',
    weighAll: 'All weighed',
    finish: 'Finish the check',
    back: 'Back to the map',
    notYet: 'Not enough daylight left for that.',
    unweighed: '{n:chick} not weighed yet. Light ones that are not weighed will not get help.',
    // What the card under each nest says, by how much you know
    unknown: 'Not looked at yet',
    farSitting: 'Bird sitting tight. Something is underneath.',
    farHome: 'A parent is home with the chicks.',
    farAlone: 'Chicks alone in the nest.',
    farEmpty: 'Nobody home.',
    eggs: '{eggs:egg}',
    chicks: '{chicks:chick}',
    emptyNest: 'Empty',
    disturbed: 'The bird got up and knocked an egg out.',
    noEggsYet: 'No eggs yet',
    lightHeads: '{n} look thin',
    pair: '{m} and {f}',
    camBadge: 'Camera',
    bandedN: '{n} banded',
    rehabN: '{n} off to rehab',
  },
  weighUi: {
    title: 'Weighing',
    pick: 'Click a chick to pick it up.',
    carry: 'Carry it to the bag, slowly.',
    settling: 'Waiting for it to settle...',
    steady: 'Steady. Read the scale.',
    fidget: 'It is fidgeting. Slow your hand down.',
    record: 'Record {g} g',
    bandHeading: 'Fit a leg band',
    decision: 'This one is light. What now?',
    rehab: 'Send to rehab',
    rehabNote: 'It will be fed up and let go at fledging.',
    stay: 'Leave it with its parents',
    stayNote: 'It might make it. It might not.',
    putBack: 'Put it back',
    weighed: '{g} g, band {band}',
    light: 'light',
    normal: 'good weight',
    need: 'Fit a band first.',
    needDecision: 'Choose what to do with this light chick.',
    reading: 'Scale reads',
  },
  camUi: {
    title: 'Trail camera',
    hint: 'Click a frame, or use the buttons. Flag the ones that matter.',
    flag: 'Flag this frame',
    unflag: 'Unflag it',
    flagged: 'Flagged',
    prev: 'Earlier',
    next: 'Later',
    close: 'Done with the camera',
    summaryNone: 'Nothing out of the ordinary. Just parents doing their job.',
    caught: 'You flagged {n} of the {total} frames that mattered.',
    stoatNote: 'A stoat on the camera. This place is a hot spot now. Lift a couple of traps from a quiet line and set them here.',
    frame: {
      sit: ['A parent sitting tight on the nest.', 'The sitting bird shifts its feet and settles again.', 'Head tucked, eyes shut. All is well.'],
      change: ['Changeover: one parent arrives as the other leaves.', 'Two birds at the nest. One goes off to sea, one takes over.'],
      feed: ['A parent feeding the chick, head to head.', 'Dinner is served, a bit messily.'],
      empty: ['Nobody at the nest for a moment.', 'Just the nest and the dark.'],
      stoat: ['A stoat at the nest. Pale eyes in the flash.', 'A stoat, up on the rim of the nest.'],
      rat: ['A rat creeping across the nest.', 'A rat, with an eye on the nest.'],
      missing: ['Something is missing from the nest. It was there earlier.', 'The nest is lighter than before.'],
      intruder: ['A big shape at the edge of the nest. Not a penguin.', 'Something heavy has been through here.'],
    },
    matters: { stoat: true, rat: true, missing: true, intruder: true },
    legend: { stoat: 'Stoat', rat: 'Rat', missing: 'Something gone', intruder: 'Intruder' },
  },
  messages: {
    nestsDone: '{zone}: nests checked.',
    weighed: '{zone}: weighed and banded {n:chick}.',
    camStoat: '{zone}: a stoat on the camera in the small hours. This is a hot spot: lift a couple of traps from a quiet line and set them here.',
    camNothing: '{zone}: the camera showed nothing out of the ordinary.',
    camCaught: '{zone}: you flagged {n} of the camera frames that mattered.',
    rehabbed: '{zone}: {n:chick} off to rehab.',
  },
};
