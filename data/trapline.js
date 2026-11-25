// The trap line mini-game: what you see at each stop and what you can do.
// Numbers are in rates.js (trapLine). Descriptions have a few versions each so
// the line reads differently each time; the simulation picks one.
export default {
  // Where the line runs in the close-up (src/ui/trap-route.js): a route over land,
  // a new one each time, preferring the bush edge.
  route: {
    closeUp: 2.8,           // how much map the close-up shows (times the place's size)
    margin: 0.1,            // share of the view kept clear at each side, so traps stay in frame
    seaGap: 2,              // tile corners: keep at least this far from the sea and the rocky shore
    minLength: 0.55,        // the ends are at least this far apart (share of the view's width)
    wander: 2.5,            // how much the route meanders (random extra cost per corner)
    wanderEvery: 4,         // tile corners between the wander's random values (bigger = broader bends)
    edgeBonus: 1.6,         // cost taken off along the bush edge, so lines follow it
    rockCost: 3,            // extra cost on bare rock, so lines keep to the grass and bush
    dirtCost: 2,            // extra cost on bare dirt (tracks and the road verge)
    minCost: 0.2,           // the cheapest a step can be (keep above 0)
    smooth: 2,              // rounds of corner cutting on the drawn path
    tries: 8,               // starts to try before settling for the farthest reachable end
  },
  // The hands-on steps at a trap, in the order you'd usually do them. min:
  // minutes the step takes. hint: what the scene says you can click.
  steps: {
    open: { min: 1, hint: 'Lift the lid' },
    clear: { min: 3, hint: 'Bag the catch' },
    set: { min: 2, hint: 'Set the jaws' },
    bin: { min: 1, hint: 'Bin the old egg' },
    bait: { min: 2, hint: 'Put in a fresh egg' },
    close: { min: 1, hint: 'Shut the lid and walk on' },
  },
  // What a trap can look like when you lift the lid. has: what's in the box
  // (set: the jaws are cocked; bait: 'fresh', 'stale' or 'none'). A trap is
  // working once it's empty, set, and has a fresh egg.
  states: {
    fine: { has: { set: true, bait: 'fresh' }, text: [
      'The egg is whole and clean. Nothing has been near it.',
      'Bait\'s fresh, the trap\'s set, and the box is dry. Untouched.',
      'All as you left it. The egg is still glossy.',
    ] },
    stale: { has: { set: true, bait: 'stale' }, text: [
      'The trap is still set, but the egg has gone grey and smells like it.',
      'Nothing has touched it in weeks. The egg is spotted with mould; nothing will want that.',
      'Set, but the egg has turned into something you would rather not describe.',
    ] },
    sprung: { has: { set: false, bait: 'none' }, text: [
      'The trap has gone off, but there is nothing in it. The bait is gone too.',
      'Sprung and empty. Something had the egg and got away with it.',
      'The jaws are closed on nothing. Probably the wind rattling the box, or a lucky rat.',
    ] },
    catch: { has: { set: false, bait: 'stale' }, text: {
      stoat: [
        'A stoat. The trap did its job, quickly.',
        'There is a stoat in this one. One less hunting the gully tonight.',
      ],
      rat: [
        'A ship rat. The trap did its job.',
        'A big rat in this one, and the egg half-eaten.',
      ],
      ferret: [
        'A ferret, which is a first for this box. Bigger and darker than a stoat.',
      ],
    } },
  },
  // The tracking tunnel: an ink card that records the prints of whatever walked through.
  tunnel: {
    heading: 'Tracking tunnel',
    stoat: {
      none: 'No stoat prints on the card.',
      some: 'A few stoat prints across the card: neat, five-toed, bounding.',
      many: 'Stoat prints all over the card, coming and going. This line is busy.',
    },
    rat: {
      none: 'Hardly any rat prints.',
      some: 'Rat prints along one edge.',
      many: 'The card is black with rat and mouse prints.',
    },
    action: 'Note the prints and walk on',
  },
  // Words for the scene (src/scenes/TrapLineScene.js).
  ui: {
    title: '{zone}: the trap line',
    stopTrap: 'Trap {n} of {total}',
    closed: 'The box is shut. Lift the lid to see what is inside.',
    doNext: 'Click in the box to deal with it, or shut the lid when it is ready.',
    walkNote: 'Walking to the next trap takes {walk}.',
    bag: 'Your bag',
    freshEggs: 'Fresh eggs',
    binBag: 'Bin bag',
    sacks: 'Catch bag',
    timeUsed: '{time} on the line so far',
    finish: 'Finish the line',
    back: 'Back to the map',
    grade: {
      great: 'Great. Every trap on the line is set and baited.',
      good: 'Good. Most of the line is working; a trap or two will need another look.',
      rough: 'Rough. Several traps were left not working. They will catch nothing until someone fixes them.',
    },
    summary: '{working} of {total} traps working. Caught {stoats:stoat} and {rats:rat}. {time} on the line.',
    overdone: 'You binned an egg that was still fresh, which cost a little daylight.',
    moveHint: 'Not much stoat sign here. You could lift two traps and carry them to a busier line.',
    ferret: 'And a ferret.',
    trapRecap: 'Trap {n}: {what}. {left}',
    left: {                               // how you left each trap, for the recap
      working: 'Left set and baited.',
      catch: 'The catch was left in it.',
      sprung: 'Left with the jaws sprung.',
      stale: 'Left with stale bait.',
      none: 'Left with no bait.',
    },
    stateNames: {                         // short names for the recap at the end
      fine: 'untouched', stale: 'stale bait', sprung: 'sprung, empty',
      stoat: 'a stoat', rat: 'a rat', ferret: 'a ferret',
    },
  },
};
