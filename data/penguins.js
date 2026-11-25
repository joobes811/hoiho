// Penguin names, leg-band colours and quirks. Ported from the prototype.
export default {
  // Names, given out in order as birds hatch or arrive, by sex. When a list runs
  // out it starts again with ' II'. Swap in family names here for Easter eggs.
  namesM: ['Gus', 'Clive', 'Barry', 'Hector', 'Stan', 'Kevin', 'Nugget', 'Alf', 'Bruce', 'Tama', 'Reg',
    'Huck', 'Sprat', 'Moss', 'Ted', 'Wiremu', 'Les', 'Frank', 'Rua', 'Dougal', 'Bob', 'Trevor', 'Sid', 'Squid'],
  namesF: ['Mabel', 'Doris', 'Pearl', 'Ngaio', 'Flossie', 'Beryl', 'Moana', 'Rata', 'Ivy', 'Pip', 'Nora',
    'Mavis', 'Hine', 'Kiri', 'Dot', 'Olive', 'Coral', 'Gwen', 'Marama', 'Elsie', 'Ines', 'Aroha', 'Iris', 'Peg'],
  bandColours: ['R', 'B', 'Y', 'G', 'W'],   // band = colour + number, e.g. R-01
  // name: shown in the penguin list. line: what you see at the count.
  // always: the line shows every time (otherwise half the time).
  // late: always lands after the count's usual window. nosy: may wander into the tent.
  quirks: [
    { name: 'Tends to sleep in', line: 'Last one in, as usual.', always: true, late: true },
    { name: 'Particularly neurotic', line: 'Freezes at the waterline for ages before risking the walk up.' },
    { name: 'Afraid of crabs', line: 'Takes a long detour around the rock pool. Crabs, probably.' },
    { name: 'Hates getting wet', line: 'Stands in the shallows looking personally offended by the sea.' },
    { name: 'Nosy', line: 'Wanders over to have a look at you before heading up.', nosy: true },
    { name: 'Terrible at landing', line: 'Gets dumped by three waves in a row on the way in.' },
    { name: 'Creature of habit', line: 'Takes exactly the same line up the rocks as every other night.', always: true },
    { name: 'Hopeless romantic', line: 'Brays up the hill at its mate for a very long time.' },
    { name: 'Unimpressed by everything', line: 'Walks up without a flicker of interest in anything.' },
    { name: 'Show-off', line: 'Hops straight up the steepest bit of the slope.' },
    { name: 'Easily distracted', line: 'Stops halfway up to stare at nothing in particular.' },
    { name: 'Grudge against shags', line: 'Glares at a passing shag the whole way up.' },
    { name: 'Always in a hurry', line: 'Barrels up the beach like it’s late for something important.' },
    { name: 'Goes the long way round', line: 'Wanders half the length of the beach before heading up.' },
    { name: 'Fond of a preen', line: 'Stops at the waterline for a very thorough preen.' },
    { name: 'Keeps to the shadows', line: 'Hugs the rocks all the way up, as if nobody can see it.' },
    { name: 'Dreadful ditherer', line: 'Turns back for the sea twice before making up its mind.' },
    { name: 'Rather shy', line: 'Waits in the shallows until the beach feels quiet enough.' },
    { name: 'Talks to itself', line: 'Mutters away quietly the whole walk up.' },
    { name: 'Terribly stately', line: 'Processes up the beach like it owns the place. It might.' },
    { name: 'Rolls like a sailor', line: 'Sways side to side like an old salt home from sea.' },
    { name: 'Kelp inspector', line: 'Stops to examine a strand of kelp, then thinks better of it.' },
    { name: 'Hates sandflies', line: 'Shakes its head crossly at the sandflies all the way up.' },
    { name: 'Loyal to one rock', line: 'Has a little sit on the same rock, same as every night.', always: true },
    { name: 'Weather watcher', line: 'Looks up at the sky and sighs. Fair enough, really.' },
    { name: 'Brave beyond reason', line: 'Strolls right past the sea lion’s patch without a second look.' },
  ],
};
