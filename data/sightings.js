// Your pest notes: every pest or stray animal you find (sign, a sighting, a
// catch) is jotted on the map for that area, so over the seasons you build up a
// picture of what is about and where. The map shows a small note on each area
// with recent notes; hovering the area lists them.
export default {
  keep: 120,             // notes kept in all (the oldest are dropped first)
  showMonths: 12,        // months a note stays on the map
  freshMonths: 3,        // months a note counts as fresh (drawn bright on the map)
  dotsMax: 4,            // most coloured dots on one area's note (one per kind)

  // Each kind of animal: what it's called in the notes and its dot colour on the map.
  kinds: {
    pig: { name: 'Pig', colour: 0xb07a5a },
    deer: { name: 'Deer', colour: 0xc89a5a },
    cow: { name: 'Cattle', colour: 0x8a6a4a },
    sheep: { name: 'Sheep', colour: 0xe8e4d8 },
    stoat: { name: 'Stoat', colour: 0xd9534f },
    ferret: { name: 'Ferret', colour: 0xa84040 },
    cat: { name: 'Feral cat', colour: 0x9a9a9a },
    rat: { name: 'Rat', colour: 0x7a7f86 },
    mouse: { name: 'Mouse', colour: 0xb8b0a0 },
    hedgehog: { name: 'Hedgehog', colour: 0x8f7a5a },
    possum: { name: 'Possum', colour: 0x6f6a8a },
    rabbit: { name: 'Rabbit', colour: 0xd8c8a8 },
  },
  // How it was found.
  how: { sign: 'sign', seen: 'seen', caught: 'caught' },

  card: {
    heading: 'Your pest notes here',
    row: '{name}: {count} · last {how}, {when}',     // e.g. "Stoat: 3 notes · last caught, Apr Y2"
    count: '{n:note}',
  },
};
