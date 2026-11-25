// Loading and drawing the Tiled map, shared by the scenes that show it
// (the overview and the trap line's close-up). The map files are the game's
// copy in assets/maps/game/ (written by tools/export_game_map.py).
import { TEXT } from './styles.js';
import PLACES from '../../data/places.js';

const MAP_DIR = 'assets/maps/game/';
const MAP_FILE = 'style-test.json';

// Call from a scene's preload(). Loads once; later scenes reuse the cache.
export function preloadMap(scene) {
  if (scene.cache.tilemap.exists('map')) return;
  const loading = scene.add.text(20, 20, 'Loading the coast…', TEXT.body);
  scene.load.on('complete', () => loading.destroy());
  scene.load.once('filecomplete-tilemapJSON-map', (key, type, data) => {
    for (const ts of data.tilesets) scene.load.image(ts.name, MAP_DIR + ts.image);
    for (const layer of data.layers) {
      if (layer.type === 'imagelayer') scene.load.image('overlay-' + layer.name, MAP_DIR + layer.image);
    }
  });
  scene.load.tilemapTiledJSON('map', MAP_DIR + MAP_FILE);
}

// Draws every map layer in Tiled's order. Returns the drawn objects (`world`),
// the map's size in pixels, and its places ({ name, zone, x, y, w, h, side },
// x and y being the centre).
export function buildMap(scene) {
  const map = scene.make.tilemap({ key: 'map' });
  const raw = scene.cache.tilemap.get('map').data;
  const tilesets = raw.tilesets.map(ts =>
    map.addTilesetImage(ts.name, ts.name, ts.tilewidth, ts.tileheight, ts.margin, ts.spacing));
  const world = [];
  let placeObjects = [];
  for (const layer of raw.layers) {
    if (layer.type === 'tilelayer') {
      world.push(map.createLayer(layer.name, tilesets).setAlpha(layer.opacity));
    } else if (layer.type === 'imagelayer') {
      world.push(scene.add.image(0, 0, 'overlay-' + layer.name).setOrigin(0)
        .setDisplaySize(layer.imagewidth, layer.imageheight).setAlpha(layer.opacity));
    } else if (layer.name === 'places') {
      placeObjects = layer.objects;
    }
  }
  const prop = (o, name) => o.properties?.find(p => p.name === name)?.value;
  const places = placeObjects.filter(o => prop(o, 'zone')).map(o => ({
    name: o.name, zone: prop(o, 'zone'),
    x: o.x + o.width / 2, y: o.y + o.height / 2, w: o.width, h: o.height,
    side: PLACES[o.name]?.label ?? 'above',
  }));
  return { world, places, size: { w: map.widthInPixels, h: map.heightInPixels } };
}
