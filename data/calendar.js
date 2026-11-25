// The year, one visit per month. Month index 0 is August (the season starts
// when pairs form), 11 is July. Ported from docs/hoiho-prototype.html.
export default {
  months: ['August', 'September', 'October', 'November', 'December', 'January',
    'February', 'March', 'April', 'May', 'June', 'July'],
  // What the penguins are doing each month (shown on the status panel).
  stages: ['Pairs forming, nest sites chosen', 'Eggs being laid', 'Incubating', 'Hatching · guard stage',
    'Guard stage', 'Post-guard · chicks alone by day', 'Fledging', 'Adults moulting ashore',
    'Adults moulting ashore', 'At sea by day, ashore at night', 'At sea by day, ashore at night',
    'At sea by day, ashore at night'],
  // Sunset each month, in minutes after midnight (17*60+40 = 5:40pm).
  sunset: [17 * 60 + 40, 18 * 60 + 40, 20 * 60 + 10, 21 * 60, 21 * 60 + 35, 21 * 60 + 30,
    20 * 60 + 50, 19 * 60 + 50, 17 * 60 + 55, 17 * 60 + 10, 16 * 60 + 55, 17 * 60 + 10],
  plantingMonths: [0, 1, 9, 10, 11],      // months you can plant (Aug, Sep, May, Jun, Jul)
  nestCheckMonths: [1, 2, 3, 4, 5, 6],    // months nest checks are offered (Sep to Feb)
  muddyMonths: [9, 10, 11, 0, 1],         // months heavy rain can turn the ground to mud (May to Sep)
  summerMonths: [3, 4, 5, 6, 7],          // Nov to Mar: longer count, sea lions, sandflies
  layMonth: 1,                            // eggs laid (September)
  eggMonths: [1, 2, 3],                   // eggs can be lost to rats and stoats
  hatchMonth: 3,                          // eggs hatch (November)
  chickMonths: [3, 4, 5],                 // chicks can be lost to stoats
  chickRatMonth: 3,                       // rats can still take a chick this month (newly hatched)
  weighMonth: 5,                          // underweight chicks decided (January)
  fledgeMonth: 6,                         // chicks fledge; nest check sends light ones to rehab (February)
  disturbMonths: [0, 1, 2],               // nest checks can disturb sitting birds (to October)
  breedingMonths: [1, 2, 3, 4, 5],        // pigs, deer and stock can wreck nests
  boomFromMonth: 7,                       // in a rodent boom, numbers keep rising from March
  workingBeeMonth: 10,                    // June: volunteers may come
  fenceBounceMonths: [0, 1, 2],           // a penguin may walk into freshly mended wire
};
