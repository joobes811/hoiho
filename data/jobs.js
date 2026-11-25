// Jobs you can do at a place. min: minutes the job takes. repeat: can be done
// more than once a visit. minor: housekeeping, not counted in the map's job badges.
// When each is offered is decided in src/sim/jobs.js.
// Ported from the prototype's ACTS.
export default [
  { id: 'traps', min: 60, name: 'Walk the trap line', desc: '{traps:trap} on this line and a tracking tunnel. Check each one; about an hour.' },
  { id: 'bait', min: 45, name: 'Do the bait station round', desc: 'Open each station, see how much was taken, and top it up. Fewer rodents now means fewer stoats next season.' },
  { id: 'browse', min: 45, name: 'Possum and rabbit round by torchlight', desc: 'Spot the eyes and sign in the dark, then set and check the traps. Protects the plantings and bush here.' },
  { id: 'fence', min: 60, name: 'Walk and mend the fence', desc: 'Strain, staple and replace what needs it, and read any sign that something got through.' },
  { id: 'plant', min: 120, name: 'Plant a batch of seedlings', desc: 'Ten seedlings: flax, coprosma, kōhūhū, fuchsia. Where they go decides how many take.',
    descExposed: ' Exposed here without flax first.' },
  { id: 'nests', min: 45, name: 'Check the nests here', desc: 'See how each nest is doing.',
    descEarly: 'Sitting birds may leave the nest while you look.',
    descWeigh: 'Weigh the chicks. Light ones can go to rehab.' },
  { id: 'lift', min: 30, repeat: true, minor: true, name: 'Lift 2 traps to move them', desc: 'Carry them to a busier line. You are carrying {carry}.' },
  { id: 'set', min: 30, repeat: true, minor: true, name: 'Set the traps you are carrying', desc: '{carry:trap} to set here.' },
  { id: 'hunter', min: 30, name: 'Ring the hunter', desc: 'Only place with reception. They will deal with any pig or deer you have found.' },
  { id: 'stock', min: 60, name: 'Herd the cattle back out', desc: 'Before they trample anything else.',
    nameSheep: 'Lift the sheep back over the fence', descSheep: 'One at a time. Your back will not thank you.',
    nameCow: 'Dig the cow out' },
];
