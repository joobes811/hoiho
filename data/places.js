// The places on the overview map, keyed by the object name in the map's
// 'places' layer (assets/maps/style-test.tmx). Only places that are on the map
// appear in the game; the rest are ready for when the full map is built.
// `blurb` is shown in the info panel when the place is clicked.
// `label` is which side of the place its name goes on the map: above, below, left or right
// (default above). Use it to stop neighbouring names overlapping.
export default {
  'Landing spot': {
    blurb: 'A low rock shelf at the head of the cove. At dusk the hoiho come ashore here, '
      + 'hop up the rocks one careful step at a time, and plod off into the bush. '
      + 'Best watched from well back, sitting very still.',
  },
  'Tent spot': {
    label: 'left',
    blurb: 'A flat patch of grass at the bush edge, just big enough for the old tent. '
      + 'Sheltered from the southerly, mostly. The sandflies have found it too.',
  },
  'Car park': {
    label: 'right',
    blurb: 'A gravel pull-off on the bend in the farm road. The ute lives here, '
      + 'and so, after rain, does a good deal of mud.',
  },
  'Boundary fence': {
    label: 'right',
    blurb: 'The line between the reserve and the farm. Wind, weather and curious cows '
      + 'all test it. Walking it is the only way to find the breaks.',
  },
  'Restoration paddock': {
    blurb: 'Open grazing next door. Good for cows, bad for seedlings, '
      + 'and the reason the fence matters.',
  },
  'Old bush': {
    blurb: 'Coastal forest in the gully, where the hoiho nest. Every planted flax and '
      + 'coprosma adds shelter, and more shelter means more nests.',
  },
  'Gully & creek': {
    blurb: 'A steep, damp fold running down to the sea. Penguin paths, stoat runs, and the '
      + 'best spot on the reserve for losing a boot.',
  },
  'Headland': {
    blurb: 'The high ground over the cove. A fine place to watch the sea, '
      + 'and to be blown off your feet while doing it.',
  },
};
