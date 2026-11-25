// The bait-station rounds: what you see in each station and what you can do.
// Numbers are in rates.js (baitRounds). Each description has a few versions.
export default {
  // Hands-on steps. min: minutes each takes (add is one scoop, swing is one swing of the boot). hint: the button or hover words.
  steps: {
    open: { min: 1, hint: 'Lift the lid' },
    check: { min: 1, hint: 'Poke the pellets and sniff for mould' },
    bin: { min: 2, hint: 'Bin the bad bait' },
    add: { min: 1, hint: 'Tip in a scoop of bait' },
    right: { min: 2, hint: 'Stand the station upright' },
    shoo: { min: 1, hint: 'Coax it out with a twig' },
    mark: { min: 1, hint: 'Flag the nest for the wasp crew' },
    swing: { min: 1, hint: 'Swing the boot' },
    close: { min: 1, hint: 'Shut the lid and walk on' },
  },
  // What the station looks like once the lid is up. take: how much bait was eaten.
  take: {
    none: [
      'Every pellet is still here. Nothing has been near it.',
      'Full to the brim and untouched.',
    ],
    some: [
      'Half the pellets have gone, and there are gnaw marks on the rest.',
      'A fair bit eaten. The wells are patchy.',
    ],
    all: [
      'Cleaned out. Not a pellet left, just crumbs.',
      'Empty. Whatever lives round here has been eating well.',
    ],
  },
  // What a knocked-over station looks like (instead of the take lines).
  tipped: [
    'Knocked flat, lid skewed, bait all over the ground. Possum, by the look of the muddy prints.',
    'Somebody has been sitting on this one. The station is on its side and the bait is scattered.',
  ],
  droppings: {
    rat: 'Rat droppings: fat, dark and blunt-ended.',
    mouse: 'Mouse droppings: tiny and pointed, like grains of black rice.',
  },
  // The teeth marks on the leftover bait, which say what to refill with.
  teeth: {
    rat: 'Big paired grooves in the bait: rat teeth. Refill with the rat blocks.',
    mouse: 'Tiny nibbles, like it was eaten with a pin: mouse. Refill with the mouse pellets.',
  },
  guests: {
    weta: 'A tree weta has moved in and is looking smug about it. It is harmless and a bit of a taonga, so coax it out gently.',
    slug: 'A fat slug is sliming about in the corner. Coax it out before it has the bait.',
  },
  nest: 'A wasp nest, a papery hole in the bank beside the station, with wasps coming and going. Do not poke it. Flag it for the wasp crew and carry on.',
  checked: {
    clean: 'The pellets are hard and sound.',
    mouldy: 'Furry mould on the pellets. They have gone off. Nothing will eat that.',
  },
  // The live mouse (always waits politely; nothing here is quick).
  mouse: {
    in: 'A mouse sits in the station, looking guilty and pleased with itself.',
    by: 'A mouse is sitting on the ground beside the station, washing its whiskers.',
    ready: 'Boot raised! Click the mouse again to swing.',
    miss: ['Whiff! The mouse sidestepped and now looks offended. Try again.', 'Missed by a whisker. It is still waiting.'],
    hit: 'THWACK!',
    fate: {
      flat: 'The mouse is now a flat little cartoon mouse. Cartoon physics: it will peel itself off later.',
      puff: 'A puff of dust, a few tiny stars, and no more mouse.',
      scarper: 'The mouse scarpers, tail first, vowing never to return. It will.',
    },
  },
  boot: 'Your boot',
  ui: {
    title: '{zone}: the bait stations',
    stop: 'Station {n} of {total}',
    timeUsed: '{time} on the round so far',
    // The point of the round, shown on every station.
    purpose: 'Rats and mice eat the eggs and chicks. Keep every station topped up with fresh bait, and deal with whatever is lurking.',
    closed: 'The lid is shut. Click the lid to lift it and see how much was taken.',
    // The short line at the top of the picture: what to do next, by what is first on the list.
    goal: {
      right: 'Click the knocked-over station to stand it upright.',
      open: 'Click the lid to lift it.',
      swing: 'A mouse! Click it to raise your boot.',
      swingReady: 'Boot raised. Click the mouse again to swing.',
      shoo: 'Click the creature in the corner to coax it out.',
      check: 'Click the pellets to poke them for mould.',
      bin: 'Click the bad bait to bin it.',
      add: 'Read the teeth marks, then click the matching bag to tip in a scoop ({more} more to fill every well).',
      mark: 'Click the wasp nest to flag it.',
      done: 'All done here. Shut the lid and walk on.',
    },
    // What to look for, by what is first on the list (the panel's "Look for" line).
    look: {
      right: 'The station is on its side.',
      open: 'A shut lid.',
      swing: 'A live mouse.',
      shoo: 'Something that should not be in the station.',
      check: 'Furry mould, teeth marks and droppings.',
      bin: 'Mould, or bait of the wrong sort.',
      add: 'Empty wells and which bag to use.',
      mark: 'A wasp nest by the station.',
      done: 'Nothing more.',
    },
    extras: 'Also here: {list}.',
    extra: { right: 'a knocked-over station', swing: 'a mouse', shoo: 'a creature in the corner', mark: 'a wasp nest' },
    nestLabel: 'Wasp nest',
    signTeeth: 'Teeth marks',
    signDroppings: 'Droppings',
    bagRat: 'Rat blocks',
    bagMouse: 'Mouse pellets',
    bin: 'Bin bag',
    full: 'Full. Any more would just spill.',
    wrongBait: 'The wrong bait for {eater}s. Bin it and use the other bag.',
    wrongHover: 'Wrong sort for this station. Click to bin it.',
    spilled: 'Spilled {n} scoop{s} on the ground. A waste, and a feast for the mice.',
    wells: '{fill} of {cap} wells full',
    needCheck: 'Check the pellets first.',
    needBin: 'Bin the bad bait first.',
    walkNote: 'Walking to the next station takes {walk}.',
    back: 'Back to the map',
    grade: {
      great: 'Great. Every station full and tidy, and nothing wasted.',
      good: 'Good. The stations are mostly full; a few have gaps or loose ends.',
      rough: 'Rough. Several stations were left low or mouldy. The rodents will have a field day.',
    },
    summary: 'Stations {pct} full. {taken} {wasted} {time} on the round.',
    taken: { none: 'No bait was taken.', some: 'Some bait was taken.', all: 'Most of the bait was taken.' },
    wasteLine: 'Wasted {n} scoop{s}.',
    noWaste: 'Nothing wasted.',
    extrasLine: 'Mice dealt with: {mice}. Loose ends left: {loose}.',
    recap: 'Station {n}: {what}. {left}',
    whatIs: { none: 'untouched', some: 'half eaten', all: 'cleaned out', mouldy: 'mouldy', tipped: 'knocked over' },
    left: { full: 'Left full.', low: 'Left low.', mouldy: 'Left with mouldy bait.', spill: 'Left full, with some spilled.', wrong: 'Left with the wrong bait.' },
  },
};
