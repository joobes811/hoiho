// Starts the game: loads or makes the saved game, sets up Phaser, and adds
// the window.__game debug handle. Phaser itself is loaded by index.html as a
// classic script, so it's the global `Phaser`.
//
// URL switches: ?seed=7 (new game with this seed), ?month=5&year=3 (new game,
// played automatically up to then), ?scene=count (straight to the count; add &weather=rain or &evening=0.6 to try a look), ?scene=trapline (a trap line in the old bush),
// ?scene=planting (a planting plot in the paddock; add &month=6&year=3), ?scene=nests (the nests in the old bush; add &month=11&year=3),
// ?scene=cow / cattle / sheep (the stock mini-games, forced),
// ?fps=1 (frame-rate meter), ?scene=fencewalk|baitrounds|torchrounds (a rounds mini-game; fencewalk also takes &cond=40&intruder=pig), ?scene=title / notebook / colony (those screens).
// Any of seed, month, year, auto or scene (other than title) skips the title screen.
import { game } from './game.js';
import { MapScene } from './scenes/MapScene.js';
import { CountScene } from './scenes/CountScene.js';
import { ReportScene } from './scenes/ReportScene.js';
import { TrapLineScene } from './scenes/TrapLineScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { NotebookScene } from './scenes/NotebookScene.js';
import { ColonyScene } from './scenes/ColonyScene.js';
import { PlantingScene } from './scenes/PlantingScene.js';
import { FenceWalkScene } from './scenes/FenceWalkScene.js';
import { BaitRoundsScene } from './scenes/BaitRoundsScene.js';
import { TorchRoundsScene } from './scenes/TorchRoundsScene.js';
import { NestScene } from './scenes/NestScene.js';
import { StockScene } from './scenes/StockScene.js';

const params = new URLSearchParams(location.search);
game.start(params);

// The title screen comes first, unless a URL switch says to skip menus.
const skipTitle = ['auto', 'seed', 'month', 'year', 'scene'].some(k => params.has(k)) && params.get('scene') !== 'title';
const scenes = [MapScene, CountScene, ReportScene, TrapLineScene, PlantingScene, FenceWalkScene, BaitRoundsScene, TorchRoundsScene, NestScene, StockScene, TitleScene, NotebookScene, ColonyScene];
if (!skipTitle) scenes.unshift(scenes.splice(scenes.indexOf(TitleScene), 1)[0]);

const phaser = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#16201c',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  render: {
    antialias: true,
    // Smooth when zoomed out: needs power-of-two textures (export_game_map.py makes them).
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
  },
  scene: scenes,    // the first one starts: the title, or the map (which loads the map art)
});

// For checking things from the browser console, e.g. __game.state.mi or __game.fps
window.__game = {
  phaser,
  game,
  params,
  get sim() { return game.sim; },
  get state() { return game.sim.S; },
  get scene() { return phaser.scene.getScenes(true)[0]; },
  get fps() { return Math.round(phaser.loop.actualFps); },
};
