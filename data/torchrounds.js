// The possum and rabbit rounds by torchlight: what you can find at each stop.
// Numbers are in rates.js (torchRounds). Each description has a few versions.
export default {
  // Hands-on steps. min: minutes each takes. hint: the hover words.
  steps: {
    spot: { min: 1, hint: 'Note it down' },
    clear: { min: 3, hint: 'Bag the catch' },
    set: { min: 2, hint: 'Reset the spring' },
    lure: { min: 1, hint: 'Put in fresh lure' },
    close: { min: 1, hint: 'Walk on to the next trap' },
  },
  // Where things can turn up at a stop, as shares across and down the scene
  // (0 to 1). The trap sits at the bottom middle, so these keep clear of it.
  spots: [[0.14, 0.2], [0.34, 0.14], [0.6, 0.18], [0.84, 0.22], [0.12, 0.5], [0.3, 0.42], [0.7, 0.44], [0.88, 0.52]],
  trap: { x: 0.5, y: 0.7 },        // where the trap sits, as shares of the scene
  // The kinds of bush a stop can be in. tint: colour multiplied over the ground picture (0xRRGGBB); text: the line under the stop's heading.
  settings: {
    fern: { tint: 0xffffff, text: 'Fern gully: wet, dark and dripping.' },
    flax: { tint: 0xe8f0d8, text: 'Flax and tussock by the creek, with a cold wind off the sea.' },
    rata: { tint: 0xf0e0e0, text: 'Under the rata, where the bark is thick and the ground is soft.' },
    paddock: { tint: 0xe0e8f0, text: 'The bush edge by the paddock, with moonlight on the grass.' },
  },
  // What each find is. kind: eyes (shining in the beam) or sign (something left behind, dimly visible).
  // animal: what it points to. sprite: the picture (assets/sprites/rounds/<sprite>.png).
  // scale: how big the picture is drawn, as a multiple of the scene's base size (1 = the picture's own pixels).
  finds: {
    possum: { scale: 1.5, kind: 'eyes', animal: 'possum', sprite: 'eyes-possum', name: 'A possum', text: 'A pair of orange eyes, glowing in the torch. A possum, looking thoroughly unbothered.' },
    rabbit: { scale: 1.5, kind: 'eyes', animal: 'rabbit', sprite: 'eyes-rabbit', name: 'A rabbit', text: 'Two red eyes low to the ground, frozen in the beam. A rabbit.' },
    morepork: { scale: 1.5, kind: 'eyes', animal: null, sprite: 'eyes-morepork', name: 'A morepork', text: 'Big yellow-green eyes, high up. A morepork, minding its own business. Nothing to set a trap for.' },
    nibble: { scale: 1.4, kind: 'sign', animal: 'rabbit', sprite: 'sign-nibble', name: 'Browsed seedlings', text: 'Seedlings nipped off clean at an angle. That is rabbit work.' },
    droppings: { scale: 1.4, kind: 'sign', animal: 'rabbit', sprite: 'sign-rabbit', name: 'Rabbit droppings', text: 'A heap of round pellets. Rabbits have been sitting here.' },
    scratch: { scale: 0.9, kind: 'sign', animal: 'possum', sprite: 'sign-scratch', name: 'Claw marks', text: 'Sets of parallel claw marks up the trunk, with a tuft of grey fur. A possum goes up and down here.' },
    chewed: { scale: 1.1, kind: 'sign', animal: 'possum', sprite: 'sign-chewed', name: 'Chewed leaves', text: 'Leaves chewed ragged from the edge in, and fallen on the ground. Possums browse like this.' },
    pdung: { scale: 1.3, kind: 'sign', animal: 'possum', sprite: 'sign-pdung', name: 'Possum droppings', text: 'Dark, tapered droppings, each about as long as a thumb joint. Possum.' },
  },
  // The trap at each stop, as you find it.
  states: {
    working: { has: { set: true, lure: true }, text: [
      'The trap is set and the lure is fresh. Nothing has been in yet.',
      'All as you left it, spring cocked and lure still sweet.',
    ] },
    nolure: { has: { set: true, lure: false }, text: [
      'Still set, but the lure has been licked clean away.',
      'The lure is gone, and not by any possum that got caught.',
    ] },
    sprung: { has: { set: false, lure: false }, text: [
      'The spring has gone off and there is nothing in it. A lucky escape for someone.',
      'Sprung and empty. The lure is gone too.',
    ] },
    catch: { has: { set: false, lure: false }, text: {
      possum: ['A possum, caught quickly and humanely. One less on the seedlings.', 'There is a possum in the box.'],
      rabbit: ['A rabbit in this one. The paddock salad bar loses a customer.', 'A rabbit, caught in the night.'],
    } },
  },
  ui: {
    title: '{zone}: possum round',
    stop: 'Stop {n} of {total}',
    timeUsed: '{time} on the round so far',
    // What the round is for, on every stop (the longer version opens the first stop).
    purpose: 'Possums browse the bush at night and eat eggs. Walk the bush with a torch, find where they are, and keep the traps working.',
    goal: 'Your goal: find every eye and sign, bag any catch, and leave each trap set and lured.',
    introTitle: 'Possum round',
    intro: [
      'Possums come out at night to browse the bush, and they eat eggs. Rabbits come out too.',
      'Move the torch to find shining eyes and sign: claw marks, chewed leaves, droppings. Click each find to note where they are, then see to the trap.',
    ],
    introGo: 'Torch on',
    sweep: 'Sweep the torch around the dark. Click anything it shows to note it.',
    nothing: 'Nothing else in the dark here.',
    noted: 'Noted: {what}',
    spotted: 'Found {n} of {total}.',
    // What to do next at the trap (the panel says the first that applies).
    hint: {
      clear: 'Click the catch to bag it.',
      set: 'Click the trap to reset the spring.',
      lure: 'Click the lure tub to put fresh lure in.',
      done: 'The trap is set and lured. Walk on when you are ready.',
    },
    noLure: 'Bag the catch first.',
    freshLure: 'The lure is fresh.',
    bag: 'Catch bag',
    lureTub: 'Lure',
    walkNote: 'Walking to the next trap takes {walk}.',
    back: 'Back to the map',
    grade: {
      great: 'Great. Every trap set and lured, and nothing in the dark got past your torch.',
      good: 'Good. Most traps are working; a few need another look.',
      rough: 'Rough. Several traps were left not working. The possums will be pleased.',
    },
    summary: '{working} of {total} traps working. Caught {possums:possum} and {rabbits:rabbit}. Found {found} of {finds} things in the dark. {time} on the round.',
    effect: 'You noted {possumSigns:possum find} to trap around. The more traps are working, the fewer possums eat the seedlings and eggs.',
    recap: 'Trap {n}: {what}. {left}',
    left: { working: 'Left set and lured.', catch: 'The catch was left in it.', sprung: 'Left unset.', nolure: 'Left with no lure.' },
    stateNames: { working: 'untouched', nolure: 'lure gone', sprung: 'sprung, empty', possum: 'a possum', rabbit: 'a rabbit' },
  },
};
