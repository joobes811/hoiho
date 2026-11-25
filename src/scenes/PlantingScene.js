// The planting mini-game (build step E): a close-up plot at the place you are
// standing. Choose a seedling from the tray and click a spot to plant it;
// click a planted seedling to fit a rabbit guard. Hover a spot and the panel
// tells you what it is like (windward edge, penguin track, rabbits, shelter).
// The rules are in src/sim/planting.js; this scene only draws them and passes
// on clicks. Mouse only, no timer: each seedling just uses a little daylight.
//
// The pictures are drawn by tools/planting_sprites.py.
import { COLOURS, SIZES, TEXT, fitTitle } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { game } from '../game.js';
import { fill, clock, duration, plural } from '../text.js';
import { evaluate, spotInfo, canPlant } from '../sim/planting.js';
import UI from '../../data/ui-text.js';

const HOVER_BOX_H = 156;          // px: height of the box that says what a spot is like
const SPRITES = 'assets/sprites/plant/';
const PICTURES = ['ground-0', 'ground-1', 'ground-2', 'edge-0', 'edge-1', 'path', 'warren', 'flax-seedling', 'coprosma-seedling',
  'kohuhu-seedling', 'fuchsia-seedling', 'flax-mid', 'flax-grown', 'shrub-mid', 'shrub-grown', 'guard', 'tray', 'tool-guard',
  'tool-lift', 'wind'];
const SEEDLING_PICTURE = { flax: 'flax-seedling', coprosma: 'coprosma-seedling', kohuhu: 'kohuhu-seedling', fuchsia: 'fuchsia-seedling' };
const HISTORY_PICTURE = { flax: { young: 'flax-seedling', mid: 'flax-mid', grown: 'flax-grown' },
  shrub: { young: 'coprosma-seedling', mid: 'shrub-mid', grown: 'shrub-grown' } };
const PANEL_W = 400;          // px: the side panel
const TRAY_H = 166;           // px: the seedling tray along the bottom of the board
const WIND_ROTATION = { n: Math.PI / 2, s: -Math.PI / 2, w: 0, e: Math.PI };   // the streaks point where the wind blows
const GOOD = 0x9bd17a;
const WARN = 0xe6a24a;
const BAD = 0xe0674f;

export class PlantingScene extends Phaser.Scene {
  constructor() {
    super('planting');
  }

  preload() {
    for (const p of PICTURES) if (!this.textures.exists('plant-' + p)) this.load.image('plant-' + p, SPRITES + p + '.png');
  }

  create() {
    if (game.sim.S.phase !== 'planting' || !game.sim.S.planting) { this.scene.start('map'); return; }
    this.cameras.main.setBackgroundColor(COLOURS.background);
    this.tool = game.data.planting.species[0].k;       // what a click does: a species, 'guard' or 'lift'
    this.hover = null;
    this.note = null;                                   // a one-off message in the hover box (e.g. no guards left)
    this.pop = null;
    this.layout();
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  get P() { return game.sim.S.planting; }

  layout() {
    this.render();
  }

  render() {
    this.board?.destroy();
    this.panels?.destroy();
    this.board = this.add.container(0, 0);
    this.panels = this.add.container(0, 0);
    this.buildBoard();
    this.buildPanel();
    this.showHover();
  }

  /* ---------- the plot ---------- */

  buildBoard() {
    const W = this.scale.width;
    const H = this.scale.height;
    const P = this.P;
    const boardW = W - Math.max(SIZES.panelMin, PANEL_W);
    const wide = P.wind === 'e' || P.wind === 'w';
    const band = wide ? 150 : 90;                 // room for the wind on its side
    const pad = 20;
    const availW = boardW - 2 * pad - (wide ? band : 0);
    const availH = H - TRAY_H - 2 * pad - (wide ? 0 : band);
    const cell = Math.floor(Math.min(availW / P.w, availH / P.h));
    const left = pad + (P.wind === 'w' ? band : 0);
    const ox = Math.round(left + (availW - P.w * cell) / 2);
    const oy = Math.round(pad + (P.wind === 'n' ? band : 0) + (availH - P.h * cell) / 2);
    this.geo = { cell, ox, oy, boardW };
    const c = this.board;
    const at = (x, y) => ({ x: ox + (x + 0.5) * cell, y: oy + (y + 0.5) * cell });
    const img = (key, x, y, scale) => this.add.image(x, y, 'plant-' + key).setDisplaySize(cell * scale, cell * scale);
    const T = game.data.planting;
    const ui = T.ui;

    // a frame under the plot
    c.add(this.add.rectangle(ox - 6, oy - 6, P.w * cell + 12, P.h * cell + 12, 0x0e1512).setOrigin(0).setStrokeStyle(2, COLOURS.panelEdge));
    const info = new Map();
    for (const h of P.hist) info.set(h.x + ',' + h.y, h);
    this.seedlingSprites = new Map();
    for (let y = 0; y < P.h; y++) {
      for (let x = 0; x < P.w; x++) {
        const p = at(x, y);
        const isEdge = P.wind === 'n' ? y === 0 : P.wind === 's' ? y === P.h - 1 : P.wind === 'w' ? x === 0 : x === P.w - 1;
        const isPath = P.paths.some(([a, b]) => a === x && b === y);
        const variant = (x * 7 + y * 3) % 3;
        c.add(img(isPath ? 'path' : isEdge ? 'edge-' + (variant % 2) : 'ground-' + variant, p.x, p.y, 1.01));
      }
    }
    // the penguin tracks get a soft edge so they read as a route, not just patches
    for (const [x, y] of P.paths) {
      const p = at(x, y);
      c.add(this.add.rectangle(p.x, p.y, cell, cell).setStrokeStyle(2, 0xa88f5e, 0.5));
    }
    for (const [x, y] of P.warrens) { const p = at(x, y); c.add(img('warren', p.x, p.y, 1)); }
    for (const h of P.hist) { const p = at(h.x, h.y); c.add(img(HISTORY_PICTURE[h.kind][h.stage], p.x, p.y, h.stage === 'young' ? 1.15 : 1.05)); }
    for (const s of P.seedlings) {
      const p = at(s.x, s.y);
      const im = img(SEEDLING_PICTURE[s.sp], p.x, p.y, 1.35);
      this.seedlingSprites.set(s.x + ',' + s.y, im);
      c.add(im);
      if (s.guard) c.add(img('guard', p.x, p.y, 1.1));
      if (this.pop && this.pop.x === s.x && this.pop.y === s.y) {
        const k = im.scaleX;
        im.setScale(k * 0.3);
        this.tweens.add({ targets: im, scaleX: k, scaleY: k, duration: 220, ease: 'Back.easeOut' });
      }
    }
    this.pop = null;
    if (P.result) {                                   // ring the seedlings that will struggle
      const ev = evaluate(game.sim);
      P.seedlings.forEach((s, i) => {
        if (ev.per[i].s >= 0.99) return;
        const p = at(s.x, s.y);
        c.add(this.add.circle(p.x, p.y, cell * 0.44).setStrokeStyle(5, ev.per[i].s < 0.5 ? BAD : WARN));
      });
    }

    // the wind on its side of the plot: streaks pointing the way it blows, and a label
    const wr = WIND_ROTATION[P.wind];
    const bw = P.w * cell;
    const bh = P.h * cell;
    const bandAt = P.wind === 'n' ? { x: ox + bw / 2, y: oy - band / 2 - 4 } : P.wind === 's' ? { x: ox + bw / 2, y: oy + bh + band / 2 + 4 }
      : P.wind === 'w' ? { x: ox - band / 2 - 4, y: oy + bh / 2 } : { x: ox + bw + band / 2 + 4, y: oy + bh / 2 };
    const along = wide ? bh : bw;
    const streaks = Math.max(2, Math.floor(along / 130));
    for (let i = 0; i < streaks; i++) {
      const t = (i + 0.5) / streaks - 0.5;
      const sx = wide ? bandAt.x : bandAt.x + t * along;
      const sy = wide ? bandAt.y + t * along : bandAt.y - (P.wind === 'n' ? 12 : -12);
      if (wide && Math.abs(t) < 0.22) continue;         // keep the middle clear for the label
      c.add(this.add.image(sx, sy, 'plant-wind').setRotation(wr).setAlpha(0.9).setScale(0.6));
    }
    const edgeWords = wide ? `${ui.windward}
${ui.wind[P.wind]}` : `${ui.windward} · wind from the ${ui.wind[P.wind]}`;
    c.add(this.add.text(bandAt.x, wide ? bandAt.y : bandAt.y + (P.wind === 'n' ? 30 : -30), edgeWords,
      { ...TEXT.small, align: 'center', backgroundColor: '#1c2420cc', padding: { x: 8, y: 3 } }).setOrigin(0.5));

    // the hover outline and a ghost of the seedling about to go in
    this.outline = this.add.rectangle(0, 0, cell - 2, cell - 2).setStrokeStyle(4, GOOD).setVisible(false);
    this.ghost = this.add.image(0, 0, 'plant-flax-seedling').setAlpha(0.55).setVisible(false);
    c.add([this.outline, this.ghost]);

    // click areas (after finishing they're just for hovering)
    {
      for (let y = 0; y < P.h; y++) {
        for (let x = 0; x < P.w; x++) {
          const p = at(x, y);
          const z = this.add.zone(p.x - cell / 2, p.y - cell / 2, cell, cell).setOrigin(0).setInteractive({ useHandCursor: true });
          z.on('pointerover', () => { this.hover = { x, y }; this.note = null; this.showHover(); });
          z.on('pointerout', () => { if (this.hover?.x === x && this.hover?.y === y) this.hover = null; this.showHover(); });
          z.on('pointerdown', () => this.click(x, y));
          c.add(z);
        }
      }
    }
    this.buildTray(boardW, H);
  }

  // The seedling tray and the two tools along the bottom of the board.
  buildTray(boardW, H) {
    const T = game.data.planting;
    const P = this.P;
    const c = this.board;
    if (P.result) return;
    const tray = this.add.image(0, 0, 'plant-tray');
    const k = Math.min(1, (boardW * 0.62) / tray.width);
    tray.setScale(k);
    const tx = 18 + tray.displayWidth / 2;
    const ty = H - 10 - tray.displayHeight / 2;
    tray.setPosition(tx, ty);
    c.add(tray);
    const sel = [];
    T.species.forEach((sp, i) => {
      const cx = tx - tray.displayWidth / 2 + (20 + i * 150 + 70) * k;
      const cy = ty - tray.displayHeight / 2 + (34 + 70) * k;
      const w = 140 * k;
      const h = (190 - 54) * k;
      const frame = this.add.rectangle(cx, cy + 12 * k, w, h).setStrokeStyle(5, COLOURS.accent).setVisible(this.tool === sp.k);
      const im = this.add.image(cx, cy - 8 * k, 'plant-' + SEEDLING_PICTURE[sp.k]).setScale(k * 0.95);
      const name = this.add.text(cx, cy + h / 2 - 8 * k, sp.short, { ...TEXT.small, backgroundColor: '#1c2420cc', padding: { x: 4, y: 1 } }).setOrigin(0.5, 1);
      const z = this.add.zone(cx - w / 2, cy + 12 * k - h / 2, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { this.tool = sp.k; this.note = null; this.render(); });
      z.on('pointerover', () => { this.note = sp.note; this.hover = null; this.showHover(); im.setScale(k * 1.05); });
      z.on('pointerout', () => { this.note = null; this.showHover(); im.setScale(k * 0.95); });
      c.add([frame, im, name, z]);
      sel.push(frame);
    });
    // tools: guard and lift
    const tools = [['guard', T.ui.guardTool, 'tool-guard', T.ui.guardHint], ['lift', T.ui.liftTool, 'tool-lift', T.ui.liftHint]];
    const left = 18 + tray.displayWidth + 16;
    const room = boardW - left - 12;
    const bw = Math.min(150, room / 2 - 8);
    tools.forEach(([id, name, pic, hint], i) => {
      const x0 = left + i * (bw + 10);
      const y0 = ty - tray.displayHeight / 2 + 20;
      const box = this.add.rectangle(x0, y0, bw, tray.displayHeight - 30, COLOURS.panel, 0.94).setOrigin(0)
        .setStrokeStyle(this.tool === id ? 5 : 2, this.tool === id ? COLOURS.accent : COLOURS.panelEdge);
      const im = this.add.image(x0 + bw / 2, y0 + 42, 'plant-' + pic).setScale(0.8);
      const label = this.add.text(x0 + bw / 2, y0 + tray.displayHeight - 30 - 8, name, { ...TEXT.small, align: 'center', wordWrap: { width: bw - 8 } }).setOrigin(0.5, 1);
      const z = this.add.zone(x0, y0, bw, tray.displayHeight - 30).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { this.tool = this.tool === id ? T.species[0].k : id; this.note = null; this.render(); });
      z.on('pointerover', () => { this.note = hint; this.hover = null; this.showHover(); });
      z.on('pointerout', () => { this.note = null; this.showHover(); });
      c.add([box, im, label, z]);
    });
  }

  /* ---------- clicks and hovering ---------- */

  click(x, y) {
    const sim = game.sim;
    const P = this.P;
    if (P.result) return;
    const here = P.seedlings.find(s => s.x === x && s.y === y);
    let done = false;
    if (here) {
      if (this.tool === 'lift') done = sim.liftSeedling(x, y);
      else if (!sim.toggleGuard(x, y)) this.note = game.data.planting.ui.spot.noGuards;
      else done = true;
    } else if (this.tool !== 'guard' && this.tool !== 'lift') {
      done = sim.plantSeedling(x, y, this.tool);
      if (done) this.pop = { x, y };
    }
    if (done) game.save();
    this.render();
  }

  // What the hover box says: about the spot, or about the tray item.
  hoverLines() {
    const T = game.data.planting;
    const ui = T.ui;
    const P = this.P;
    if (this.note) return [this.note];
    if (!this.hover) return [P.result ? ui.resultHint : fill(game.data, ui.intro, { wind: ui.wind[P.wind] })];
    const { x, y } = this.hover;
    if (P.result) {
      const i = P.seedlings.findIndex(s => s.x === x && s.y === y);
      if (i < 0) return [ui.resultHint];
      const f = evaluate(game.sim).per[i];
      const bad = ['onPath', 'tenderEdge', 'tenderBare', 'crowded', 'unguarded', 'wasted'].filter(k => f[k]);
      return [T.species.find(s => s.k === P.seedlings[i].sp).name + '.', ...(bad.length ? bad.map(k => ui.problem[k]) : [ui.doingWell])];
    }
    const species = T.species.find(s => s.k === this.tool);
    const info = spotInfo(game.sim, x, y, species?.k ?? null);
    const lines = [];
    if (info.seedling) {
      const sp = T.species.find(s => s.k === info.seedling.sp);
      lines.push(sp.name + '.');
    } else if (info.verdict) {
      lines.push(fill(game.data, ui.verdict[info.verdict], { plant: species.short }));
    }
    // facts the verdict already says are left out, so the box stays short
    const said = { path: ['path'], tenderEdge: ['edge'], tenderBare: ['bare'], crowded: ['crowded', 'squeezes'] }[info.verdict] ?? [];
    for (const f of info.facts) if (!said.includes(f)) lines.push(fill(game.data, ui.spot[f], { crowdedAt: T.crowdedAt }));
    if (info.seedling) lines.push(info.seedling.guard ? ui.spot.guardOn : P.guardsLeft ? ui.spot.guardOff : ui.spot.noGuards);
    return lines;
  }

  showHover() {
    const P = this.P;
    if (this.hoverText) this.hoverText.setText(this.hoverLines().join('\n'));
    if (!this.outline) return;
    if (!this.hover) { this.outline.setVisible(false); this.ghost?.setVisible(false); return; }
    const { x, y } = this.hover;
    const { cell, ox, oy } = this.geo;
    const px = ox + (x + 0.5) * cell;
    const py = oy + (y + 0.5) * cell;
    const planted = P.seedlings.some(s => s.x === x && s.y === y);
    if (P.result) { this.ghost.setVisible(false); this.outline.setPosition(px, py).setStrokeStyle(4, COLOURS.accent).setVisible(planted); return; }
    const species = game.data.planting.species.find(s => s.k === this.tool);
    const info = spotInfo(game.sim, x, y, species?.k ?? null);
    let colour = COLOURS.accent;
    let ghost = false;
    if (!planted && species) {
      ghost = canPlant(game.sim, x, y);
      colour = !ghost ? 0x666666 : info.verdict === 'good' ? GOOD : info.verdict === 'path' ? BAD : WARN;
    }
    this.outline.setPosition(px, py).setStrokeStyle(4, colour).setVisible(true);
    if (ghost) this.ghost.setTexture('plant-' + SEEDLING_PICTURE[species.k]).setDisplaySize(cell * 1.35, cell * 1.35).setPosition(px, py).setVisible(true);
    else this.ghost.setVisible(false);
  }

  /* ---------- the side panel ---------- */

  buildPanel() {
    const D = game.data;
    const T = D.planting;
    const ui = T.ui;
    const S = game.sim.S;
    const P = this.P;
    const g = SIZES.gap;
    const W = this.scale.width;
    const pw = Math.max(SIZES.panelMin, PANEL_W);
    const x = W - pw + g;
    const w = pw - 2 * g;
    const c = this.panels;
    const items = [];
    let y = g + 12;
    const text = (str, style, after = 8) => {
      const t = this.add.text(x + 18, y, str, { ...fitTitle(this, str, style, w - 36), wordWrap: { width: w - 36 } });
      items.push(t);
      y += t.height + after;
      return t;
    };
    const btn = (label, opts) => {
      items.push(...button(this, x + 12, y, w - 24, label, opts));
      y += (opts.height ?? SIZES.buttonHeight) + 8;
    };

    text(fill(D, ui.title, { zone: P.zone }), TEXT.title, 4);
    text(`${clock(S.time)} · ${fill(D, ui.timeUsed, { time: duration(P.minutes) })}`, TEXT.dim, 12);

    if (!P.result) {
      const left = P.total - P.seedlings.length;
      text(fill(D, ui.seedlingsLeft, { left, total: P.total }), TEXT.highlight, 2);
      text(fill(D, ui.guardsLeft, { left: P.guardsLeft, total: P.guards }), TEXT.small, 10);
      // The hover box: a fixed height so the rules below don't jump about.
      const boxTop = y;
      this.hoverText = this.add.text(x + 18, boxTop + 8, '', { ...TEXT.body, fontSize: '18px', lineSpacing: 1, wordWrap: { width: w - 36 } });
      c.add(this.add.rectangle(x + 8, boxTop, w - 16, HOVER_BOX_H, 0x232e29).setOrigin(0).setStrokeStyle(2, COLOURS.panelEdge));
      items.push(this.hoverText);
      y = boxTop + HOVER_BOX_H + 10;
      this.ruleLines(text, evaluate(game.sim), P.seedlings.length > 0);
      y += 4;
      // Seedlings still to go: offer to plant the rest the Quick button's way (the count is shown above).
      if (left > 0) btn(UI.finishQuick, { center: true, onClick: () => this.finishQuick() });
      else btn(ui.finish, { accent: true, center: true, onClick: () => this.finish() });
      if (!P.started) btn(ui.back, { center: true, onClick: () => this.back(true) });
    } else {
      const r = P.result;
      text(ui.grade[r.grade], r.grade === 'great' ? TEXT.highlight : TEXT.body, 8);
      const parts = [];
      if (r.flax) parts.push(plural(r.flax, 'flax plant'));
      if (r.shrub) parts.push(plural(r.shrub, 'shrub'));
      text(fill(D, ui.summary, { flax: r.flax, shrub: r.shrub, survive: r.survive, total: r.total })
        .replace(/About 0 flax plants and /, 'About ').replace(/ and 0 shrubs/, ''), TEXT.body, 12);
      this.ruleLines(text, { rules: r.rules }, true);
      y += 6;
      const boxTop = y;
      this.hoverText = this.add.text(x + 18, boxTop + 8, '', { ...TEXT.small, wordWrap: { width: w - 36 } });
      c.add(this.add.rectangle(x + 8, boxTop, w - 16, 150, 0x232e29).setOrigin(0).setStrokeStyle(2, COLOURS.panelEdge));
      items.push(this.hoverText);
      y = boxTop + 150 + 10;
      btn(ui.back, { accent: true, center: true, onClick: () => this.back(false) });
    }
    c.add(items);
    c.addAt(panel(this, x, g, w, Math.max(y + 2 - g, 200)), 0);
  }

  // One line per rule, ticked when kept and noted when broken.
  ruleLines(text, ev, show) {
    const ui = game.data.planting.ui;
    const P = this.P;
    text(show ? ui.ruleHeading : ui.aimHeading, TEXT.heading, 4);
    for (const key of ['edge', 'shelter', 'path', 'rabbits', 'wasted', 'crowd']) {
      if (!P.rabbits && (key === 'rabbits' || key === 'wasted') && !ev.rules.wasted) continue;
      const n = ev.rules[key];
      const R = ui.rules[key];
      if (!show) { text('· ' + R.aim, TEXT.small, 2); continue; }
      if (n) text('– ' + fill(game.data, R.bad, { n }), TEXT.smallAccent, 2);
      else text('✓ ' + R.ok, TEXT.small, 2);
    }
    if (!P.rabbits) text(ui.noRabbits, TEXT.smallFaint, 2);
  }

  finish() {
    if (!game.sim.finishPlanting()) return;
    game.save();
    this.hover = null;
    this.render();
  }

  finishQuick() {
    if (!game.sim.finishQuick()) return;
    game.save();
    this.hover = null;
    this.render();
  }

  back(cancel) {
    if (cancel) game.sim.cancelPlanting();
    else game.sim.closePlanting();
    game.save();
    this.scene.start('map');
  }
}
