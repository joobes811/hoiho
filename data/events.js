// Something different every visit: one event when you arrive, drawn from a
// shuffled pile (no repeats until the rest have turned up). Some change the day,
// some are just a moment. The logic is in src/sim/events.js.
//
// Each event:
//   k        id. If data/notebook.js has an entry with the same id, the event adds it the first time.
//   where    which area it happens in: 'fence' (one with a fence), 'work' (anywhere
//            but the tent), 'plant' (somewhere you can plant), 'landing', 'base'; or none
//   months   only in these months (0 = August ... 11 = July); leave out for any month
//   needs    'noStock' (no stray stock in already), 'noPig', or a species that must
//            have returned (e.g. 'kereru')
//   effect   what it does (see each one)
//   copies   how many times it's in the pile (default 1)
//   text     what you're told when you arrive. {place} is the area, in lower case.
export default {
  heading: 'This morning',
  ok: 'Righto',
  keepApart: 6,                            // visits before the same event can come round again, even across a reshuffle
  list: [
    { k: 'treeDown', where: 'fence',
      effect: { fence: 45 },               // fence condition points knocked off (0-100)
      text: 'A big gust overnight dropped a macrocarpa limb right across the {place} fence. That will want mending before the neighbour\'s stock notice.' },
    { k: 'heifer', where: 'fence', needs: 'noStock',
      effect: { stock: 'cow' },            // one of the neighbour's cattle gets in here
      text: 'A note under the windscreen wiper from the neighbour: one of his heifers is through the fence into the {place}. "Sorry. Again."' },
    { k: 'sheep', where: 'fence', needs: 'noStock',
      effect: { stock: 'sheep' },          // the neighbour's sheep get in here
      text: 'Bleating from the {place}. Some of the neighbour\'s sheep have found a gap and are working their way through your seedlings.' },
    { k: 'stoatSeen', where: 'work',
      effect: { stoat: true },             // this becomes the season's stoat hotspot
      text: 'A tramper at the car park saw a stoat bounding along the track by the {place}, bold as brass in broad daylight. Worth a look at the traps there.' },
    { k: 'pig', where: 'work', needs: 'noPig',
      effect: { pig: true },               // a pig moves in here (ring the hunter)
      text: 'The pig hunter was out on the road this morning. He reckons a boar has been working the {place}.' },
    { k: 'tramper',
      effect: { minutes: 20 },             // minutes of daylight used up
      text: 'A lost tramper at the car park, looking for the lighthouse. Twenty minutes, one hand-drawn map and a lot of pointing later, they\'re on their way.' },
    { k: 'volunteer',
      effect: { minutes: -40 },            // minutes of daylight given back (a negative cost)
      text: 'One of the branch volunteers turned up with a spare pair of hands and a thermos. The morning goes twice as fast.' },
    { k: 'nursery', where: 'plant',
      effect: { seedlings: 40 },           // shrub seedlings planted here for free
      text: 'The nursery had seedlings going spare. You heel forty of them into the {place} before you start.' },
    { k: 'karearea', where: 'work',
      text: 'A kārearea goes over the {place} like it\'s late for something. Every small bird in the bush shuts up at once.' },
    { k: 'photographer', where: 'landing', months: [1, 2, 3, 4, 5, 6],
      text: 'A photographer with a very long lens is setting up by the landing. You have a quiet word about giving the birds room to come ashore. He takes it well, mostly.' },
    { k: 'sealPark', where: 'base',
      text: 'A fur seal is asleep across the car park. It does not move for the ute, or for anything else. You park on the verge.' },
    { k: 'ranger', where: 'base',
      text: 'A ranger drops in to borrow your trap records, and leaves a packet of gingernuts by way of thanks.' },
    { k: 'kereru', where: 'work', needs: 'kereru', months: [2, 3, 4, 5],
      text: 'A kererū crashes into the kōwhai by the {place}, eats far too much, and sits there looking pleased with itself.' },
    { k: 'flatTyre',
      effect: { minutes: 30 },             // minutes of daylight used up
      text: 'Flat tyre on the farm road. You change it in the drizzle, which is the traditional way.' },
    { k: 'wasps', where: 'work', months: [5, 6, 7, 8],
      effect: { minutes: 15 },             // minutes of daylight used up
      text: 'Wasps have built in a dry bank beside the {place} track. You go the long way round, and so would anyone sensible.' },
    { k: 'quiet',
      copies: 2,                           // a breather now and then
      text: 'Nothing out of the ordinary. The kettle boils, the rain eases off a bit, and the reserve gets on with it.' },
  ],
};
