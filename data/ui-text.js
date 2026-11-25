// Words on the game's screens (the simulation's own messages are in messages.js).
// Gaps work the same way: {name}, {n:word} for counts.
export default {
  title: 'Hoiho',                         // working title; the real name is still open
  date: '{month} · Year {year}',
  time: '{clock} · {left} of work left before the count',
  timeUp: '{clock} · time to head to the count',
  blocked: { done: 'done today', daylight: 'not enough daylight' },
  quick: 'Quick',                         // the button beside a mini-game job
  quickHint: 'Get it done in one click, without the close-up. A bit less careful than doing it by hand: you might miss a trap or a stop.',
  finishQuick: 'Finish the rest quickly',   // inside a trap line, round or planting
  finishQuickNote: 'The rest done in a hurry, like the Quick button. Something might get missed.',
  toCount: 'Head to the count',
  diaryHeading: 'Today',
  diaryEmpty: 'Nothing done yet. Yellow numbers on the map show how many jobs each place has; hover a place to see them, click it to walk there.',
  tooFar: 'Not enough daylight left to walk to {place}. Time to head to the count.',
  card: {                                 // the card shown when you hover a place
    here: 'You are here. The jobs are on the right.',
    walk: '{walk} walk from here',
    nothing: 'Nothing to do here today.',
    click: 'Click to walk here',
  },
  saveFile: 'Save to file',
  loadFile: 'Load file',
  newGame: 'New game',
  newGameConfirm: 'Click again to start over',
  loaded: 'Save loaded.',
  notASave: 'That file isn\'t a save from this game.',
  count: {
    heading: 'Dusk count · the hillside above the landing',
    tally: '{n} hoiho counted',
    missed: ' · {missed} up before you arrived',
    skip: 'Skip ahead',
    done: 'Pack up and drive home',
  },
};
