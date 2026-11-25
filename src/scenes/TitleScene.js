// The title screen: a dimmed, slowly drifting view of the coast, the penguin
// silhouette, and the buttons (Continue, New game, Load from file). Skipped by
// ?auto=1 and by the other URL switches (see src/main.js).
import { COLOURS, TEXT } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { preloadMap, buildMap } from '../ui/map.js';
import { game } from '../game.js';
import { fill } from '../text.js';
import UI from '../../data/ui-text.js';
import T from '../../data/screens.js';

const FONT = 'Georgia, "Times New Roman", serif';
const DRIFT_MS = 60000;         // ms: one slow pan across the backdrop
const DIM = 0.68;               // how dark the map is dimmed (0 to 1)
const PENGUIN_MAX = 250;        // px: tallest the hoiho at the bottom left is drawn
const PENGUIN_MIN = 110;        // px: below this there's no room, so it's left out

export class TitleScene extends Phaser.Scene {
  constructor() { super('title'); }

  preload() {
    preloadMap(this);
    this.load.image('hoiho-title', 'assets/sprites/hoiho/title.png');   // drawn by tools/hoiho_art.py
  }

  create() {
    this.confirmNew = false;
    const { world, size } = buildMap(this);
    this.world = world;
    this.mapSize = size;
    const veil = this.add.graphics().fillStyle(0x0e1512, DIM).fillRect(0, 0, size.w, size.h);
    world.push(veil);
    this.ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.ui.ignore(world);
    this.sheet = null;
    this.layout();
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cam = this.cameras.main;
    const zoom = Math.max(W / this.mapSize.w, H / this.mapSize.h) * 1.35;
    cam.setZoom(zoom);
    cam.centerOn(this.mapSize.w * 0.5, this.mapSize.h * 0.5);
    this.tweens.killTweensOf(cam);
    const x0 = cam.scrollX;
    this.tweens.add({ targets: cam, scrollX: x0 + 120, duration: DRIFT_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.ui.setSize(W, H);
    this.build();
  }

  build() {
    this.sheet?.destroy();
    const c = this.sheet = this.add.container(0, 0);
    this.cameras.main.ignore(c);
    const W = this.scale.width;
    const H = this.scale.height;
    const colX = 64;
    const colW = 380;
    const out = [];

    const g = this.add.graphics();
    out.push(g);
    out.push(this.add.text(colX - 4, 44, UI.title, { fontFamily: FONT, fontSize: '104px', color: COLOURS.accentText, stroke: '#0e1512', strokeThickness: 8 }));
    out.push(this.add.text(colX, 172, T.title.subtitle, { ...TEXT.body, wordWrap: { width: colW + 40 }, stroke: '#0e1512', strokeThickness: 4 }));

    let y = 270;
    const BH = 56;
    const add = (label, opts) => { out.push(...button(this, colX, y, colW, label, { height: BH, center: true, ...opts })); y += BH + 12; };
    if (game.hadSave) {
      const S = game.sim.S;
      const doing = T.title.doing[S.phase];      // e.g. left half-way along the trap line
      add(`${T.title.continue}  ·  ${fill(game.data, T.title.continueSub, { year: S.year, month: game.data.calendar.months[S.mi] })}${doing ? ' · ' + doing : ''}`,
        { accent: true, onClick: () => this.scene.start('map') });
    }
    add(this.confirmNew ? T.title.newGameConfirm : T.title.newGame, {
      accent: !game.hadSave, selected: this.confirmNew, onClick: () => this.newGame(),
    });
    add(T.title.loadFile, { onClick: () => this.loadFile() });
    this.note = this.add.text(colX, y + 4, '', { ...TEXT.smallAccent, wordWrap: { width: colW } });
    out.push(this.note);
    // a hoiho standing at the bottom left, on a soft shadow, as tall as the room below the buttons allows
    const birdH = Math.max(0, Math.min(PENGUIN_MAX, H - y - 70));
    if (birdH >= PENGUIN_MIN) {
      g.fillStyle(0x0e1512, 0.5).fillEllipse(colX + 150, H - 36, birdH * 0.8, birdH * 0.12);
      out.push(this.add.image(colX + 150, H - 30, 'hoiho-title').setOrigin(0.5, 1).setScale(birdH / 300));
    }

    // One card on the right with two tabs: the story, and how to play. It opens on the story.
    // The card is as tall as the longer of the two, so it doesn't jump when you switch.
    const px = colX + colW + 130;
    const pw = Math.min(700, W - px - 40);
    const TAB_H = 46;               // px: height of the two tab buttons
    const TOP = 22 + TAB_H + 22;    // px: from the card's top edge to the first line of text
    const storyText = this.add.text(px + 28, 0, T.title.story, { ...TEXT.body, wordWrap: { width: pw - 56 } });
    const lines = T.title.how.map(str => this.add.text(px + 62, 0, str, { ...TEXT.body, wordWrap: { width: pw - 94 } }));
    const howH = lines.reduce((n, t) => n + t.height + 16, 0) - 16;
    const ph = TOP + Math.max(storyText.height, howH) + 26;
    const py = Math.max(28, Math.min(H - ph - 64, 130));
    const card = panel(this, px, py, pw, ph);
    const tab = this.tab ?? 'story';
    const tabW = (pw - 56 - 12) / 2;
    const tabs = [
      ...button(this, px + 28, py + 22, tabW, T.title.storyHeading,
        { height: TAB_H, center: true, accent: tab === 'story', onClick: () => { this.tab = 'story'; this.build(); } }),
      ...button(this, px + 28 + tabW + 12, py + 22, tabW, T.title.howHeading,
        { height: TAB_H, center: true, accent: tab === 'how', onClick: () => { this.tab = 'how'; this.build(); } }),
    ];
    storyText.setY(py + TOP).setVisible(tab === 'story');
    const dots = this.add.graphics().setVisible(tab === 'how');
    const nums = [];
    let cy = py + TOP;
    lines.forEach((t, i) => {
      t.setY(cy).setVisible(tab === 'how');
      dots.fillStyle(COLOURS.accent, 1).fillCircle(px + 40, cy + 14, 13);
      nums.push(this.add.text(px + 40, cy + 14, String(i + 1), TEXT.badge).setOrigin(0.5).setVisible(tab === 'how'));
      cy += t.height + 16;
    });
    const foot = this.add.text(px + 4, py + ph + 12, T.title.footer, { ...TEXT.dim, stroke: '#0e1512', strokeThickness: 4 });
    // The map credit, bottom right; the linked parts open in a new tab.
    const credit = [];
    let cx = W - 16;
    for (const part of [...T.title.credit].reverse()) {
      const t = this.add.text(cx, H - 12, part.text, {
        ...TEXT.smallFaint, fontSize: '15px', stroke: '#0e1512', strokeThickness: 3, color: part.url ? COLOURS.textDim : COLOURS.textFaint,
      }).setOrigin(1, 1);
      if (part.url) {
        t.setInteractive({ useHandCursor: true }).on('pointerdown', () => window.open(part.url, '_blank', 'noopener'));
        t.on('pointerover', () => t.setColor(COLOURS.accentText)).on('pointerout', () => t.setColor(COLOURS.textDim));
      }
      credit.push(t);
      cx -= t.width;
    }
    c.add([card, ...tabs, storyText, dots, ...lines, ...nums, foot, ...out, ...credit]);
  }

  newGame() {
    if (game.hadSave && !this.confirmNew) { this.confirmNew = true; this.build(); return; }
    game.newGame(Math.floor(Date.now() % 1e9));
    game.hadSave = true;
    this.scene.start('map');
  }

  loadFile() {
    game.importSave(ok => {
      if (!ok) { this.note.setText(T.title.notASave); return; }
      game.hadSave = true;
      this.scene.start('map');
    });
  }
}
