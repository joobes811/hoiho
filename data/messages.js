// The words for everything the simulation reports. The simulation writes
// events like { k: 'traps', zone: 'gully', stoats: 2, rats: 1 }; src/text.js
// finds the message with the same key and fills in the gaps.
//
// Gaps in a message:
//   {zone}            the place's name, e.g. "Gully & creek" ({place}: the same in lower case)
//   {name}            any other value, as is
//   {stoats:stoat}    a count with its word: "1 stoat", "2 stoats"
//   {n:sheep:sheep}   ...with an irregular plural: "1 sheep", "6 sheep"
// A key holding an object picks one of several versions (see src/text.js).
// Ported from docs/hoiho-prototype.html.
export default {
  // ----- the start of a visit -----
  notebook: 'New field notebook entry: {title}.',
  earlyStart: 'Up and out early after last night\'s count: {min} minutes more daylight today.',
  soreBack: 'Your back is still complaining about those sheep. Every walk takes a bit longer today.',
  nestsTaken: '{pairs:pair} have taken nest sites: {where}.',
  nestsWhere: '{n} in the {place}',
  noSite: ' {noSite:pair} couldn\'t find a sheltered, private site. More mature cover would help.',
  rodentBoom: 'Mouse droppings all over the tent floor. It looks like a rodent boom year.',
  stockCollected: {
    sheep: 'The farmer has been in and taken his sheep back. He did not look thrilled about the state of the fence.',
    cow: 'The farmer has been in and taken his cattle back. He did not look thrilled about the state of the fence.',
  },
  goalMet: {                             // today's goal met (data/goals.js), one line per kind of goal
    pests: "Goal met: {n} pests fewer. The penguins won't send a card, but they'd want to.",
    greatLines: "Goal met: {n} trap lines you could show an inspector.",
    fences: "Goal met: every fence line walked and mended. The neighbour's cattle will have to try harder.",
    bait: "Goal met: bait stations topped up in {n} places. The rats are dining on your terms now.",
    area: "Goal met: the {place} is as tidy as it's been all year.",
    plant: "Goal met: seedlings in the ground in the {place}. The rest is up to the rain, of which there is no shortage.",
    nests: "Goal met: the nests in the {place} are checked and noted down.",
  },
  workingBee: 'Volunteers from the branch turned up with a trailer of shrubs. {n} went into the {place} before lunch.',

  // ----- what you find when you arrive somewhere -----
  fenceSound: 'The fence here is sound.',
  fenceSagging: 'The fence is sagging in a few places.',
  fenceGaps: 'There are gaps in the fence you could walk a sheep through.',
  fenceFlat: 'Whole sections of fence are flat.',
  pigSign: 'Turned-over ground and torn-up ferns. A pig has been rooting through here.',
  deerSign: 'Fresh hoof prints, and the undergrowth has been stripped back. Deer.',
  stockSheep: 'A few sheep have got in and are eating the seedlings.',
  stockCowBogged: 'One of the neighbour\'s cows is bogged to the belly in the creek. She is not happy.',
  stockCattle: 'Three of the neighbour\'s cattle are wandering around in here, trampling everything.',
  stoatSignHeavy: 'Stoat prints everywhere: in the mud, in the tracking tunnel, on a rotten log.',
  stoatSignLight: 'A few stoat prints in the tracking tunnel.',
  mud: 'The creek is up and the gully is a bog. Everything here takes longer.',
  velvetWorm: 'Under a rotting log: a velvet worm. Peripatus. Older than the dinosaurs, and in no hurry.',
  fernbird: 'A fernbird calls from the scrub. It does not show itself.',
  sealion: 'A big whakahao is asleep right where the penguins come ashore. They will land further along tonight.',

  // ----- jobs -----
  traps: '{zone}: traps cleared and rebaited. Caught {stoats:stoat} and {rats:rat}.',
  ferret: '{zone}: and a ferret, in the big trap by the stream.',
  trapLine: {
    great: '{zone}: walked the trap line. Every trap set and baited. Caught {stoats:stoat} and {rats:rat}.',
    good: '{zone}: walked the trap line. {working} of {total} traps working. Caught {stoats:stoat} and {rats:rat}.',
    rough: '{zone}: walked the trap line, but only {working} of {total} traps are working. Caught {stoats:stoat} and {rats:rat}.',
  },
  bait: {
    heavy: '{zone}: bait stations topped up. Nearly all were emptied. Mice everywhere.',
    some: '{zone}: bait stations topped up. A fair bit taken.',
    little: '{zone}: bait stations topped up. Not much taken.',
  },
  browse: '{zone}: set traps for possums and rabbits. {possums:possum} and {rabbits:rabbit} by morning.',
  fence: {
    mended: '{zone}: mended {breaks:break} in the fence.',
    sound: '{zone}: walked the fence. All sound, for once.',
  },
  fenceMarked: '{zone}: you marked where the {what} came through. The hunter will want to know.',
  fenceBounce: '{zone}: a penguin walked straight into the fresh wire, bounced off, and carried on as if nothing happened.',
  planted: {                // {flax} and {shrub}: plants that should take
    great: '{zone}: planted out with care. About {flax} flax and {shrub} shrubs should take.',
    good: '{zone}: planted. About {flax} flax and {shrub} shrubs should take, though a few were put in the wrong place.',
    rough: '{zone}: planted in a hurry. Only about {flax} flax and {shrub} shrubs are likely to take.',
  },
  nestCheck: '{zone}: {lines}.',
  nestLine: '{m} & {f}: {status}',
  nestStatus: {
    chicks: '{chicks:chick}',
    chicksLight: '{chicks:chick} ({light} too light, off to rehab)',
    eggs: '{eggs:egg}',
    noEggsYet: 'no eggs yet',
    empty: 'empty',
  },
  lift: '{zone}: lifted 2 traps.',
  set: '{zone}: set {n:trap}. This line now has {total}.',
  hunter: 'Rang the hunter from the car park. They will sort out the {got}.',
  sheepLifted: '{zone}: six sheep lifted back over the fence, one at a time.',
  cowDug: '{zone}: an hour of digging, a rope, and one very muddy caretaker later: one free cow.',
  cattleHerded: '{zone}: cattle herded back through the gate.',
  cowFreed: {
    great: '{zone}: dug round her legs, roped her, pulled with her heave, and out she came. Barely a splash on you.',
    good: '{zone}: one cow free of the mud, though it took a few goes and the creek kept one of your gloves.',
    rough: '{zone}: a long, muddy morning, but the cow is out and none the worse.',
  },
  cattleShifted: {
    great: '{zone}: the cattle were eased back through the gate without any fuss.',
    good: '{zone}: the cattle are back through the gate after a few wrong turns.',
    rough: '{zone}: a lot of walking, but the cattle are back where they belong.',
  },
  sheepOver: {
    great: '{zone}: {n:sheep:sheep} lifted back over the fence, one at a time, without a wasted step.',
    good: '{zone}: {n:sheep:sheep} lifted back over the fence, one at a time. Your back has opinions.',
    rough: '{zone}: {n:sheep:sheep} chased down and lifted back over the fence. Your back is not impressed.',
  },

  // ----- the dusk count -----
  arrive: 'You settle on the hillside above the landing. {weather}. Click each hoiho as it comes ashore. They are small from up here, so get the binoculars out (right-click) to make out who is who.',
  arriveLate: 'You get to the hillside {late} late. Fresh tracks on the rocks: some birds are already up in the bush. Click each hoiho as it comes ashore, and use the binoculars (right-click) to tell who is who.',
  ashore: '{name} ({band}) comes ashore.',
  ashoreSealion: '{name} ({band}) comes ashore well along the rocks, giving the sea lion a wide berth.',
  thin: 'Looks thin.',
  inTent: 'Then walks straight into the old tent. You have to shoo it out.',
  sandflies: 'The wind drops and the sandflies find you immediately.',
  korora: 'A little blue penguin scurries ashore. Not one of yours. Do not count it.',
  titi: 'Tītī come in out of the dark over the headland.',
  furseal: 'A fur seal hauls out on the far rocks and goes to sleep.',
  nobody: 'Nobody tonight. It happens.',

  // ----- nest histories (breeding report) -----
  laid: '{n:egg} laid',
  lost: {
    'eggs.rat': 'Egg taken by a rat',
    'eggs.stoat': 'Egg taken by a stoat',
    'eggs.deer': 'Egg trampled by deer',
    'eggs.stock': 'Egg trampled by stock',
    'chicks.stoat': 'Chick killed by a stoat',
    'chicks.rat': 'Chick killed by a rat',
    'chicks.deer': 'Chick trampled by deer',
    'chicks.stock': 'Chick trampled by stock',
    'chicks.starve': 'Chick starved while both parents were at sea',
  },
  eggDisturbed: 'Egg lost after the bird left the nest during a check',
  infertile: 'One egg did not hatch',
  hatched: '{n:chick} hatched',
  rehab: '{n:light chick} went to rehab and fledged later',
  tooLight: '{n:chick} fledged too light to survive at sea',
  fledged: '{n:chick} banded and fledged',
  dugOut: 'Nest dug out by a pig',

  // ----- the two reports (src/report.js puts them together) -----
  report: {
    breedingTitle: 'Breeding season report · Year {year}',
    breedingHeading: '{fledged:chick} fledged from {nests:nest}',
    breedingNumbers: '{nests} nests · {eggs} eggs · {hatched} hatched · {fledged} fledged',
    share: '{pct}% of eggs became fledglings.',
    strong: 'That is a strong season.',          // one fledgling or more per nest
    respectable: 'A respectable season.',        // 0.6 or more per nest
    tough: 'A tough season.',
    atSea: 'At sea: {note}',
    rehab: '{rehab:underweight chick} went to rehab after your February nest checks, and fledged.',
    lostHeading: 'Lost to:',
    lostCauses: { stoat: 'Stoats', rat: 'Rats', pig: 'Pigs', deer: 'Deer', stock: 'Trampled by stock',
      starve: 'Starved (food at sea)', light: 'Too light at fledging' },
    infertile: 'Did not hatch',
    disturb: 'Disturbed during nest checks',
    caught: 'Traps caught {stoat:stoat}{ferrets} and {rat:rat} this season.',
    ferrets: ', {ferret:ferret}',
    noSite: ' {noSite:pair} sat the season out with no sheltered site.',
    breedingContinue: 'On to the moult',

    yearTitle: 'End of year {year}',
    yearHeading: 'Reserve life {before} → {after}',
    yearNumbers: 'Habitat {habitat} and pest control averaging {control}% across the reserve this year.',
    arrival: 'New arrival: {name}. {note}',
    noArrival: 'No new species this year. The bush is still growing.',
    matured: '{n} {plants} in the {place} are established.',
    sites: 'The reserve now has room for {sites} private nest sites.',
    colonyHeading: 'The colony',
    returned: "Home again: {name} ({band}), banded as a chick at {from}'s nest in Year {bornYear}, came ashore this winter.",
    returnedYours: "Home again: {name} ({band}). You weighed this one as a chick at {from}'s nest in Year {bornYear} and chose the band yourself. Two winters at sea, and back to the same beach.",
    family: {                 // family stories: birds that hatched here, growing up (src/report.js)
      paired: {
        plain: "{name}, who hatched at {parents}'s nest in Year {bornYear}, has paired up with {mate}.",
        yours: "{name}, the chick you banded at {parents}'s nest in Year {bornYear}, has paired up with {mate}. Somebody's been paying attention to the right sort of penguin.",
      },
      firstChicks: {
        plain: "{name}'s first chicks have fledged: {n:chick}. {parents} are grandparents.",
        yours: "{name}, whom you weighed as a chick in Year {bornYear}, has fledged {n:chick} of their own. {parents} are grandparents, and you've known the family three generations now.",
      },
    },
    adults: '{adults:adult} going into next season.',
    died: ' Not seen since the moult: {names}.',
    allMadeIt: ' Everyone made it through the year.',
    immigrants: ' {immigrants:new bird} turned up from elsewhere on the coast.',
    historyHeading: 'The years so far',
    historyLine: 'Year {year} · {sea} sea · {adults} adults · {nests} nests · {fledged} fledged · reserve life {reserve}',
    yearContinue: 'Start year {next}',
  },
};
