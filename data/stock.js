// The stock mini-games: a cow bogged in the gully, cattle to shift back
// through the gate, and sheep to lift over the fence. Rules are in
// src/sim/stock.js, drawing is in src/scenes/StockScene.js.
// Every number says what it is and its unit. Text is for the player.
export default {
  // Shared by all three.
  common: {
    startMinutes: 8,            // minutes: walking in from the track and sizing it up
    plainMinutes: 60,           // minutes: what the automatic caretaker's plain job takes (as before)
    plainSheep: 6,              // sheep: how many the plain job lifts (so the sore back is the usual size)
    walkMinutes: 1.2,           // minutes per grid square walked on firm ground
  },

  // ----- the cow in the mud -----
  // The ground is a grid of squares (columns x rows). Positions are in squares.
  cow: {
    grid: { w: 13, h: 9 },              // squares: columns x rows of the gully view
    start: { x: 1.5, y: 7.5 },          // squares: where you begin, on the bank
    body: { x0: 5.0, y0: 3.7, x1: 8.0, y1: 5.3 },   // squares: the cow's body; you can't stand in it
    legs: [{ x: 5.4, y: 3.55 }, { x: 7.6, y: 3.55 }, { x: 5.4, y: 5.45 }, { x: 7.6, y: 5.45 }],   // squares: the mud round each leg
    neck: { x: 7.85, y: 4.5 },           // squares: where the rope goes round the neck
    horns: { x: 8.8, y: 4.5 },          // squares: where the rope goes on the horns
    coil: { x: 1.5, y: 5.5 },           // squares: the coil of rope on the bank
    pullSpot: { x: 11.5, y: 4.5 },      // squares: where you stand to pull (firm bank, east of the cow)
    reach: 1.7,                         // squares: how close you must be to dig or tie on
    softRing: 2.9,                      // squares: the mud is soft this close to the cow's middle
    softBlobs: [1, 2],                  // soft patches elsewhere: fewest and most
    blobRadius: 1.3,                    // squares: how big each soft patch is
    tussocks: [[4, 2], [9, 2], [4, 6], [9, 6], [6, 2], [6, 6], [3, 4]],   // [column, row]: firm tussocks standing in the mud
    walkMinutes: 0.7,                   // minutes per square walked on firm ground
    softSlow: 2.5,                       // times slower: walking through soft mud (1 = firm ground)
    digsPerLeg: 3,                      // clicks: to dig clear round one leg
    digMinutes: 2,                      // minutes: one dig
    ropeMinutes: 2,                     // minutes: picking up the coil, and tying it on
    pullsNeeded: { horns: 3, neck: 4 }, // heaves: it takes this many good pulls (the neck slips more)
    pullMinutes: 3,                     // minutes: one pull
    missMinutes: 5,                     // minutes: extra for a pull while she rests (you wait for her next heave; it still counts)
    heave: { period: 2600, from: 0.5, to: 0.92 },   // the cow's rhythm: a cycle lasts this many ms; she pushes between these shares of it
    grade: { great: 66, good: 85 },     // minutes in the game: at most this for great, then good, else rough
  },

  // ----- shifting cattle -----
  cattle: {
    grid: { w: 14, h: 9 },              // squares: columns x rows of the paddock
    start: { x: 1.5, y: 7.5 },          // squares: where you begin
    count: 3,                           // cattle to shift
    gate: { y0: 3, y1: 5 },             // squares: the open gate is the east fence between these rows
    cluster: { x0: 3.5, x1: 8, y0: 1.5, y1: 7.5 },   // squares: where the cattle start, scattered
    alert: 5.5,                         // squares: cattle notice you this close
    push: 0.9,                          // squares: how far a close beast steps away in one tick
    drift: 0.3,                         // squares: how far a beast wanders at random in one tick
    cohesion: 0.06,                     // share of the way to the herd's middle each beast tends to drift
    gateReach: 3,                       // squares: cattle this close to the gate lean towards it
    gatePull: 0.2,                      // share of the way to the gate they lean
    ticks: 5,                           // ticks of cattle movement for each move you make
    margin: 0.6,                        // squares: cattle keep this far from the fences
    moveMinutes: 4,                     // minutes: each move (flat)
    perSquare: 0.4,                     // minutes: for each square you walk, on top
    maxMoves: 16,                       // moves: after this many the cattle amble out by themselves
    grade: { great: 6, good: 10 },      // moves: at most this for great, then good, else rough
    herderStand: 3.5,                   // squares: how far behind the herd the helper stands (tests and the plain job only)
  },

  // ----- lifting sheep -----
  sheep: {
    grid: { w: 16, h: 10 },             // squares: columns x rows of the fence view
    fenceRow: 5,                        // squares: the fence runs along this row; the reserve is above it
    start: { x: 8, y: 4.6 },            // squares: where you begin, beside the fence
    count: { min: 4, max: 7 },          // sheep stuck on the reserve side: fewest and most
    spread: { x0: 1, x1: 15, y0: 0.8, y1: 4.0 },    // squares: where they stand
    apart: 1.6,                         // squares: sheep stand at least this far from each other
    pickMinutes: 1,                     // minutes: getting a good hold on a sheep
    liftMinutes: 3,                     // minutes: heaving one over
    soreRef: 6,                         // sheep: lifting this many gives the usual sore back (rates.day.soreBack minutes per walk)
    soreMin: 0.5,                       // share: the least sore a back gets (a lift or two)
    soreMax: 1.5,                       // share: the most
    grade: { great: 12.5, good: 17 },   // minutes per sheep (all told): at most this for great, then good, else rough
  },

  // ----- words -----
  ui: {
    title: { cow: 'Cow in the mud', cattle: 'Shifting the cattle', sheep: 'Sheep over the fence' },
    timeUsed: 'Used so far: {time}',
    back: 'Back to the map',
    done: 'Done: back to the map',
    leave: 'Walk away for now',
    cow: {
      intro: 'She is up to her belly in the creek mud and has given up on you. Dig round each leg, get a rope on, then pull when she heaves.',
      todo: { legs: 'Dig round all four legs ({left} to go).', rope: 'Get the rope on her.', pull: 'Pull. It goes quicker if you pull with her heave, when the ring is full.' },
      softWarn: 'The darker mud is soft. Wading through it is slow. The tussocks are firm.',
      pickRope: 'Click the rope to pick it up',
      ropeOn: 'Now click her horns or her neck',
      hint: {
        leg: 'Dig round this leg. {left} more to free it.',
        legDone: 'This leg is clear.',
        coil: 'The coil of rope. Pick it up.',
        horns: 'Horns: a firm hold. Three good pulls will do it.',
        neck: 'Neck: kinder on her, but the rope slips. It will take four pulls.',
        ground: 'Walk here. Soft mud slows you; tussocks are firm.',
        need: 'Not yet: dig round every leg and put the rope on first.',
      },
      pullButton: 'Pull!',
      pullWait: 'Pull! (wait for her heave)',
      pullNeed: 'Pull (dig and rope first)',
      heave: { rest: 'She is resting.', push: 'She heaves: pull now.' },
      pulls: 'Good pulls: {done} of {need}',
      dug: ['A scoop of mud, and another.', 'She stops looking at you and looks at the sky instead.', 'The mud makes a rude noise and lets go of her leg a little.',
        'Mud slides straight back into the hole. Persistence.', 'One more scoop and this leg is nearly free.', 'A gumboot goes in. A gumboot comes out. Mostly.'],
      legFree: ['That leg is free, and she knows it.', 'Leg clear. She flexes it. Bold.', 'Another leg out of the clag.', 'That one has come right out of the mud.'],
      roped: { horns: 'Rope on the horns. She tosses her head. Fair enough.', neck: 'Rope round her neck. She gives you a look of deep betrayal.' },
      good: ['You pull with her heave and she comes up a good bit.', 'She heaves, you heave. The mud grumbles and gives way.', 'That is the way. A little more out of the mud.'],
      miss: ['She is resting, so you take up the slack and wait. When she heaves, up she comes a little.', 'Too early. She sighs at you, then heaves anyway. You get there.', 'You lean on the rope until she is ready. Slow, but it counts.'],
      freed: 'And out she comes with a great sucking squelch. She shakes herself, covers you in mud, and plods off home.',
      grade: {
        great: 'Neat work: dug just right, pulled with her, and barely any mud on you. Well, some.',
        good: 'Out she comes, and the creek keeps one of your gloves. It could have been worse.',
        rough: 'A long, muddy morning, but she is out, and nobody is hurt.',
      },
      summary: 'Time taken: {time}.',
    },
    cattle: {
      intro: 'Three of the neighbour\'s cattle, in the paddock and in no hurry. They drift away from you: stand on the far side of them from the gate and ease them along. Click where to stand.',
      hint: 'Click where to stand. The cattle step away from you. Closer pushes harder.',
      moves: 'Moves: {n}',
      left: 'Still in the paddock: {n}',
      gate: 'GATE',
      steps: ['You ease over. They look up, think about it, and shuffle.', 'A slow walk round the back. They shuffle along.', 'They study you. You study them. Progress.',
        'One of them does an about-turn for no reason at all.', 'Somebody wanders the wrong way. You sigh.', 'A very small step for cattle.'],
      through: ['One goes through the gate as if it had planned to all along.', 'Another one out. The gate is a popular place.', 'Through the gate she goes, and not a backward glance.'],
      all: 'The last one ambles through the gate. You shut it behind her.',
      tired: 'The cattle, bored of you, wander out through the gate by themselves.',
      grade: {
        great: 'Smooth as anything. They hardly knew they were being moved.',
        good: 'A few wrong turns, but they are all back where they belong.',
        rough: 'Rather a lot of walking, but they are out. Nobody is cross.',
      },
      summary: 'Moves: {n}. Time taken: {time}.',
    },
    sheep: {
      intro: 'Sheep stuck on the reserve side. Click a sheep to pick it up, then click the fence to lift it over. Each one is heavier than it looks.',
      hint: { sheep: 'Pick this one up.', fence: 'Click the fence to lift it over.', carrying: 'You are carrying a sheep. Click the fence.' },
      left: 'Still on the reserve side: {n}',
      lifted: 'Lifted over: {n}',
      strain: 'Your back: {word}',
      strainWords: ['fine', 'a bit stiff', 'complaining', 'very sore'],
      pick: ['You pick up a sheep. It goes limp, as sheep do, with an air of great dignity.', 'Up she comes. She smells of wet wool and general disappointment.',
        'You get an arm under the sheep. It lets you, which is somehow worse.'],
      over: ['Over the fence she goes. She trots off without so much as a thank you.', 'One more over. You feel it in your lower back.', 'Heave. Thump. Another sheep on the right side of the wire.',
        'The sheep lands on four feet, shakes, and starts eating.', 'Your back would like a word.', 'Over she goes. You straighten up in stages.', 'She bounces off home, light as anything. Unlike you.'],
      all: 'The last sheep is over. You lean on the fence post for a while and let your back think about it.',
      grade: {
        great: 'Sheep, one after another, with hardly a wasted step. The back will remember, mind.',
        good: 'All the sheep are over. Your back has things to say about tomorrow.',
        rough: 'Quite the chase, but they are all over the fence. Your back is not impressed.',
      },
      summary: 'Sheep lifted: {n}. Time taken: {time}.',
    },
  },
};
