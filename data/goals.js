// The goal for each visit: a note pinned to the tent with one thing to aim for
// today. One is picked at random each visit (by weight), never the same kind
// twice running, and only from the kinds that make sense this month.
// The logic is in src/sim/goals.js. Gaps: {n} the target, {place} an area's name.
export default {
  luck: 2,                  // visits' worth of notebook luck added when you meet a goal (see rates.finds.luckStep)
  heading: 'Today\'s goal',
  label: 'Goal:',           // shown in front of the goal under the daylight bar
  done: 'Done',
  progress: '{have} of {need}',
  kinds: [
    { k: 'pests', weight: 3,
      need: 3,              // pests caught today on trap lines and torchlit rounds (a trapping day catches 3 or more about 3 times in 4)
      text: 'Catch {n} pests: stoats, rats, possums or rabbits.' },
    { k: 'greatLines', weight: 2,
      need: 2,              // trap lines left with every trap working (a "great" line)
      text: 'Leave {n} trap lines in perfect order, every trap set and baited.' },
    { k: 'fences', weight: 2,
      text: 'Walk and mend every fence line on the reserve.' },
    { k: 'bait', weight: 2,
      need: 3,              // places whose bait stations you top up
      text: 'Top up the bait stations in {n} places.' },
    { k: 'area', weight: 2,
      minJobs: 3,           // only an area with at least this many jobs
      text: 'Give the {place} a proper going-over: every job there done.' },
    { k: 'plant', weight: 3, months: 'planting',
      text: 'Get a batch of seedlings into the {place}.' },
    { k: 'nests', weight: 3, months: 'nestCheck',
      text: 'Check how the nests in the {place} are getting on.' },
  ],
};
