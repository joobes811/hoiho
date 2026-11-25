// The fence walk: what you see in each section and what you can do about it.
// Numbers are in rates.js (fenceWalk). Each description has a few versions so
// a walk reads differently each time; the simulation picks one.
export default {
  // Hands-on steps. min: minutes the step takes. hint: what the tool or button says.
  steps: {
    strain: { min: 3, hint: 'Strain the wire tight' },
    staple: { min: 2, hint: 'Staple it back to the post' },
    post: { min: 6, hint: 'Dig in a new post' },
    read: { min: 1, hint: 'Say what made the sign' },
    close: { min: 1, hint: 'Walk on along the fence' },
  },
  // What each kind of damage needs, in order. The scene's tools do these steps.
  fixes: {
    sagging: { steps: ['strain'] },
    broken: { steps: ['strain', 'staple'] },
    post: { steps: ['post', 'strain', 'staple'] },
  },
  // What a section looks like (several versions each).
  sections: {
    sound: [
      'Taut wire, firm posts. Nothing to do here but admire it.',
      'This stretch is sound. The wire sings a little in the wind.',
      'Posts upright, wire tight. Someone did this one properly.',
    ],
    sagging: [
      'The wire has gone slack between the posts. A cow could lean on this and think about it.',
      'Sagging wire. Nothing is through yet, but it will not take much.',
    ],
    broken: [
      'The top wire has snapped, and the ends have curled away from each other.',
      'A broken strand, the cut ends curling like pigtails. Something has gone through here, or will.',
    ],
    post: [
      'The middle post has rotted off at the base and the whole section is leaning, wire drooping.',
      'A rotten post, soft as cheese at the bottom. The wire is only held up by habit.',
    ],
  },
  // Sign on the ground or the wire. name: the button's words. look: what you see.
  // meaning: what it was, said after you decide.
  signs: {
    pig: { name: 'A pig', look: 'The ground by the wire is rooted up in heaps and furrows, with torn roots lying about.',
      meaning: 'Rooted-up ground like that is a pig.' },
    deer: { name: 'A deer', look: 'Small, neat, pointed prints in the soft ground, heading in from the farm side.',
      meaning: 'Small, neat cloven prints are deer.' },
    cow: { name: 'A cow', look: 'Big, round, deep hoof prints, and a trampled patch where something heavy leaned on the fence.',
      meaning: 'Big round prints are cattle.' },
    sheep: { name: 'A sheep', look: 'Tufts of wool snagged on the wire, and tiny prints in the mud.',
      meaning: 'Wool on the wire is sheep.' },
    possum: { name: 'Only a possum', look: 'Small hand-shaped prints with five toes, going along the bottom of the fence.',
      meaning: 'Five-toed hand prints are a possum, which is no worry for the fence.' },
  },
  // The order of the buttons for reading sign.
  signOrder: ['pig', 'deer', 'cow', 'sheep', 'possum'],
  // The three tools along the bottom of the picture.
  tools: {
    strain: { label: 'Wire strainer' },
    staple: { label: 'Staples and hammer' },
    post: { label: 'Spare post and spade' },
  },
  ui: {
    title: '{zone}: the fence walk',
    stop: 'Section {n} of {total}',
    timeUsed: '{time} on the fence so far',
    allDone: 'All sorted here.',
    next: 'Next: {step}.',
    wrongStep: 'That is not what this section needs right now.',
    askSign: 'What made this sign?',
    signRight: 'Right. {meaning}',
    signWrong: 'Not quite. {meaning}',
    marked: 'Marked on your map.',
    walkNote: 'Walking to the next section takes {walk}.',
    finish: 'Finish the walk',
    back: 'Back to the map',
    grade: {
      great: 'Great. Every break mended and every sign read right.',
      good: 'Good. The fence is mostly back in shape; a section or two still needs work.',
      rough: 'Rough. A fair bit was left broken. Stock and pigs will find it.',
    },
    summary: 'Mended {fixed} of {problems:break}. Read {right} of {signs:sign} right. {time} on the fence.',
    summaryClean: 'No breaks to mend. Read {right} of {signs:sign} right. {time} on the fence.',
    hunter: 'Pig or deer sign confirmed. Worth ringing the hunter from the tent.',
    stock: 'Stock got in here. Herd them back out before they trample anything else.',
    left: { mended: 'mended', open: 'still broken', clean: 'sound' },
    recap: 'Section {n}: {what}.',
    signRecap: 'sign: {sign}, {verdict}',
  },
};
