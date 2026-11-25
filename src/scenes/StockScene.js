// The stock mini-games: one scene that shows whichever is on (S.stockGame.kind):
//   cow     a cow bogged in the gully mud: dig round her legs, rope her, pull with her heave
//   cattle  cattle in a paddock to ease through the open gate: click where to stand
//   sheep   sheep on the reserve side: pick each up, carry it to the fence, lift it over
// The rules are in src/sim/stock.js; this scene only draws them and passes on
// clicks. Mouse only, no timer to beat: every step just uses a little daylight.
//
// The pictures are drawn by tools/stock_sprites.py.
import { COLOURS, SIZES, TEXT, fitTitle } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { game } from '../game.js';
import { fill, clock, duration } from '../text.js';
import { pathCost, isSoft, cowReady, legsLeft, pullsNeeded, inHeave, cattleLeft, sheepLeft, strainLevel } from '../sim/stock.js';

const SPRITES = 'assets/sprites/stock/';
const PICTURES = ['grass-0', 'grass-1', 'grass-2', 'bank-0', 'bank-1', 'mud-soft-0', 'mud-soft-1', 'mud-soft-2', 'tussock', 'cow-black',
  'cow-hereford', 'mud-pit', 'leg-mud-0', 'leg-mud-1', 'leg-mud-2', 'leg-mud-3', 'rope-coil', 'caretaker', 'caretaker-carry', 'sheep',
  'fence', 'gate-open', 'post', 'cowpat-0', 'cowpat-1', 'thistle', 'rushes', 'trough'];
const PANEL_W = 400;            // px: the side panel
const GOOD = 0x9bd17a;
const WARN = 0xe6a24a;
const WALK_MS = 130;            // ms the figure takes per grid square it walks (up to MAX_MS)
const MAX_MS = 850;             // ms: longest a walk is shown for
const FRAME = 0x0e1512;

export class StockScene extends Phaser.Scene {
  constructor() {
    super('stock');
  }

  preload() {
    for (const p of PICTURES) if (!this.textures.exists('stock-' + p)) this.load.image('stock-' + p, SPRITES + p + '.png');
  }

  create() {
    if (game.sim.S.phase !== 'stock' || !game.sim.S.stockGame) { this.scene.start('map'); return; }
    this.cameras.main.setBackgroundColor(COLOURS.background);
    this.shown = {};            // where each moving thing was last drawn, so it can walk to where it is now
    this.hover = null;
    this.freed = false;
    this.busyUntil = 0;
    this.render();
    const onResize = () => this.render();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  get G() { return game.sim.S.stockGame; }
  get D() { return game.data.stock; }
  get busy() { return this.time.now < this.busyUntil; }

  render() {
    this.board?.destroy();
    this.panels?.destroy();
    this.live = {};
    // Not a container: containers don't sort by depth, and the board layers things by depth.
    const made = [];
    this.board = { add: o => { made.push(...[o].flat()); }, destroy: () => made.forEach(o => o.destroy()) };
    this.panels = this.add.container(0, 0).setDepth(100);
    this.hoverText = null;
    this.hoverNote = null;
    this.hover = null;
    const G = this.G;
    const W = this.scale.width;
    const H = this.scale.height;
    const g = this.D[G.kind].grid;
    const gutter = G.kind === 'cattle' ? 1.7 : 0;
    const boardW = W - Math.max(SIZES.panelMin, PANEL_W);
    const cell = Math.floor(Math.min((boardW - 40) / (g.w + gutter), (H - 40) / g.h));
    this.geo = { cell, ox: Math.round((boardW - (g.w + gutter) * cell) / 2), oy: Math.round((H - g.h * cell) / 2), g, boardW };
    this.board.add(this.add.rectangle(this.geo.ox - 6, this.geo.oy - 6, g.w * cell + 12, g.h * cell + 12, FRAME).setOrigin(0).setStrokeStyle(2, COLOURS.panelEdge));
    this.busyUntil = 0;
    if (G.kind === 'cow') this.buildCow();
    if (G.kind === 'cattle') this.buildCattle();
    if (G.kind === 'sheep') this.buildSheep();
    this.buildPanel();
    this.showHover();
  }

  /* ---------- helpers ---------- */

  px(x, y) { return { x: this.geo.ox + x * this.geo.cell, y: this.geo.oy + y * this.geo.cell }; }

  img(key, x, y, widthCells, depth = 0) {
    const p = this.px(x, y);
    const im = this.add.image(p.x, p.y, 'stock-' + key);
    im.setScale(widthCells * this.geo.cell / im.width).setDepth(depth);
    if (key === 'fence') im.scaleY *= 1.7;                 // a sturdier line than the tile's own proportions
    this.board.add(im);
    return im;
  }

  // A moving thing: drawn where it was last time and walked to where it is now.
  mover(id, key, x, y, widthCells, depth, angle) {
    const im = this.img(key, x, y, widthCells, depth);
    const from = this.shown[id];
    this.shown[id] = { x, y, angle };
    if (from && (from.x !== x || from.y !== y)) {
      const p = this.px(x, y);
      const d = Math.hypot(from.x - x, from.y - y);
      const ms = Math.min(MAX_MS, Math.max(220, d * WALK_MS));
      const a0 = this.px(from.x, from.y);
      im.setPosition(a0.x, a0.y);
      if (angle !== undefined) im.setRotation(from.angle ?? angle);
      this.tweens.add({ targets: im, x: p.x, y: p.y, rotation: angle ?? 0, duration: ms, ease: 'Sine.easeInOut' });
      this.busyUntil = Math.max(this.busyUntil, this.time.now + ms);
    } else if (angle !== undefined) im.setRotation(angle);
    return im;
  }

  // Walking figure: faces the way it went.
  caretaker(G, carrying) {
    const was = this.shown.me;
    let angle = was?.angle ?? 0;
    if (was && Math.hypot(was.x - G.pos.x, was.y - G.pos.y) > 0.1) angle = Math.atan2(G.pos.y - was.y, G.pos.x - was.x);
    const im = this.mover('me', carrying ? 'caretaker-carry' : 'caretaker', G.pos.x, G.pos.y, 1.4, 30, angle);
    this.live.me = im;
    return im;
  }

  cursorZone(x, y, w, h, over, out, down) {
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    if (over) z.on('pointerover', over);
    if (out) z.on('pointerout', out);
    z.on('pointerdown', () => { if (!this.busy) down(); });
    this.board.add(z);
    return z;
  }

  // A big click area for a point on the board.
  spot(x, y, radiusCells, onOver, onDown, depth = 40) {
    const r = radiusCells * this.geo.cell;
    const p = this.px(x, y);
    const z = this.cursorZone(p.x - r, p.y - r, 2 * r, 2 * r, onOver, () => this.setHover(null), onDown).setDepth(depth);
    return z;
  }

  setHover(h) {
    this.hover = h;
    this.hoverNote = null;
    this.showHover();
  }

  // The ground zone: where clicking on empty ground walks/stands you.
  groundZone(onDown, onMove) {
    const { ox, oy, cell, g } = this.geo;
    const z = this.add.zone(ox, oy, g.w * cell, g.h * cell).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(1);
    z.on('pointerdown', ptr => { if (!this.busy) onDown((ptr.x - ox) / cell, (ptr.y - oy) / cell); });
    z.on('pointermove', ptr => onMove((ptr.x - ox) / cell, (ptr.y - oy) / cell));
    z.on('pointerout', () => this.setHover(null));
    this.board.add(z);
  }

  act(did) {
    if (!did) return;
    game.save();
    this.render();
  }

  /* ---------- the cow ---------- */

  buildCow() {
    const G = this.G;
    const C = this.D.cow;
    const sim = game.sim;
    const g = C.grid;
    // the ground: bank, soft mud (marked, darker), and firm tussocks standing in it
    for (let cy = 0; cy < g.h; cy++) for (let cx = 0; cx < g.w; cx++) this.img('bank-' + ((cx + cy) % 2), cx + 0.5, cy + 0.5, 1.012, 0);
    this.softMud(G, g);
    for (const t of G.tussocks) this.img('tussock', t.x + 0.5, t.y + 0.5, 1.5, 4);
    const mid = { x: (C.body.x0 + C.body.x1) / 2, y: (C.body.y0 + C.body.y1) / 2 };
    this.img('mud-pit', mid.x, mid.y, 6.4, 3);
    // the cow, breathing slowly (once she is out she heaves herself up and plods off west)
    if (!G.result || !this.freed) {
      const cow = this.img('cow-' + G.coat, mid.x + 0.25, mid.y, 3.8, 10);
      this.live.cow = cow;
      this.live.cowBase = cow.scaleX;
      if (G.result) {
        this.freed = true;
        this.tweens.add({ targets: cow, x: cow.x - this.geo.cell * 7, alpha: 0, delay: 500, duration: 3200, ease: 'Sine.easeIn' });
        this.tweens.add({ targets: cow, rotation: Math.PI, duration: 500 });
      }
    }
    // the mud round each leg
    (G.result ? [] : C.legs).forEach((leg, i) => {
      const stage = Math.min(3, G.legs[i]);
      this.img('leg-mud-' + stage, leg.x, leg.y, 0.88, 12);
      if (stage < C.digsPerLeg) {
        const left = C.digsPerLeg - stage;
        this.spot(leg.x, leg.y, 0.8, () => this.setHover(fill(game.data, this.D.ui.cow.hint.leg, { left })), () => this.act(sim.digLeg(i)), 50);
        const p = this.px(leg.x, leg.y);
        this.board.add(this.add.text(p.x, p.y + this.geo.cell * 0.72, '●'.repeat(left), { ...TEXT.small, color: '#f2c94c' }).setOrigin(0.5).setDepth(14));
      } else {
        this.spot(leg.x, leg.y, 0.8, () => this.setHover(this.D.ui.cow.hint.legDone), () => {}, 50);
      }
    });
    // the rope: still on the bank, in your hands, or on her
    if (G.rope === 'coil') {
      this.img('rope-coil', C.coil.x, C.coil.y, 1.1, 12);
      this.spot(C.coil.x, C.coil.y, 0.9, () => this.setHover(this.D.ui.cow.hint.coil), () => this.act(sim.takeRope()), 50);
      const p = this.px(C.coil.x, C.coil.y);
      this.board.add(this.add.text(p.x, p.y + this.geo.cell * 0.8, 'Rope', { ...TEXT.small, backgroundColor: '#1c2420cc', padding: { x: 5, y: 1 } }).setOrigin(0.5).setDepth(14));
    }
    if (G.rope === 'held') {
      for (const where of ['horns', 'neck']) {
        const t = C[where];
        const p = this.px(t.x, t.y + (where === 'neck' ? -0.0 : 0));
        const ring = this.add.circle(p.x, p.y, this.geo.cell * 0.3).setStrokeStyle(5, COLOURS.accent).setDepth(20);
        this.board.add(ring);
        this.tweens.add({ targets: ring, scale: 1.18, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
        const label = this.add.text(p.x + (where === 'neck' ? -this.geo.cell * 0.25 : this.geo.cell * 0.55), p.y - this.geo.cell * 0.8,
          where === 'neck' ? 'Neck' : 'Horns', { ...TEXT.small, backgroundColor: '#1c2420e6', padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(22);
        this.board.add(label);
        this.spot(t.x, t.y, 0.42, () => this.setHover(this.D.ui.cow.hint[where]), () => this.act(sim.tieRope(where)), 55);
      }
    }
    this.live.heave = this.add.graphics().setDepth(9);
    this.board.add(this.live.heave);
    this.live.rope = this.add.graphics().setDepth(25);
    this.board.add(this.live.rope);
    this.caretaker(G, false);
    // walking: click the ground (the hover shows what it would cost)
    this.groundZone((x, y) => this.act(sim.moveTo(x, y)), (x, y) => {
      const to = { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 };
      const c = pathCost(sim, G, G.pos, to);
      this.setHover({ ground: to, minutes: c.minutes, soft: isSoft(G, to.x, to.y) });
    });
    // a floating cost beside the pointer
    this.live.cost = this.add.text(0, 0, '', { ...TEXT.small, backgroundColor: '#1c2420ee', padding: { x: 8, y: 3 } }).setDepth(90).setVisible(false);
    this.live.tile = this.add.rectangle(0, 0, this.geo.cell - 2, this.geo.cell - 2).setStrokeStyle(3, GOOD).setDepth(26).setVisible(false);
    this.board.add([this.live.cost, this.live.tile]);
  }

  // The soft mud, drawn as one organic patch: every soft cell adds a soft
  // round "pull", and wherever the pulls add up past a threshold is mud (the
  // way metaballs merge). Then a dark wet rim, a damp halo on the grass, wet
  // patches inside, and a few ripples. Made once per layout and size, then kept.
  softMud(G, g) {
    const { cell } = this.geo;
    const cells = G.soft.map(k => k.split(',').map(Number));
    const key = `stock-mud-${cell}-${G.soft.join(';')}`;
    if (!this.textures.exists(key)) this.mudTexture(key, cells, g, cell);
    const p = this.px(0, 0);
    this.board.add(this.add.image(p.x, p.y, key).setOrigin(0).setDepth(1.5));
    const gfx = this.add.graphics().setDepth(1.6);
    this.board.add(gfx);
    for (const [cx, cy] of cells) {   // ripples, the same every time
      if ((cx * 5 + cy * 3) % 3) continue;
      const q = this.px(cx + 0.5, cy + 0.5);
      gfx.lineStyle(2, 0xa89070, 0.45);
      gfx.beginPath();
      gfx.arc(q.x + ((cx * 3 + cy) % 3 - 1) * cell * 0.15, q.y + ((cx + cy * 5) % 3 - 1) * cell * 0.15, cell * (0.14 + ((cx + cy) % 3) * 0.05), 3.4, 6.0);
      gfx.strokePath();
    }
  }

  mudTexture(key, cells, g, cell) {
    const w = Math.ceil(g.w * cell);
    const h = Math.ceil(g.h * cell);
    const tex = this.textures.createCanvas(key, w, h);
    const ctx = tex.getContext();
    const img = ctx.createImageData(w, h);
    const soft = new Set(cells.map(([x, y]) => x + ',' + y));
    const SIG2 = 2 * (0.4 * cell) ** 2;     // how far each cell's pull reaches
    const TH = 0.32;                         // pull needed to be mud
    const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
    const vnoise = (x, y) => {               // smooth value noise, 0 to 1
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
    const RIM = [70, 54, 40], MUD = [108, 86, 64], DEEP = [88, 68, 50], WET = [132, 108, 80], HALO = [58, 64, 40];
    const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    for (let y = 0; y < h; y++) {
      const gy = Math.floor(y / cell);
      for (let x = 0; x < w; x++) {
        const gx = Math.floor(x / cell);
        let f = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (!soft.has((gx + dx) + ',' + (gy + dy))) continue;
            const ex = x - (gx + dx + 0.5) * cell, ey = y - (gy + dy + 0.5) * cell;
            f += Math.exp(-(ex * ex + ey * ey) / SIG2);
          }
        }
        // a little wobble on the edge so it isn't too perfect
        f += (vnoise(x / (cell * 0.35), y / (cell * 0.35)) - 0.5) * 0.08;
        const o = (y * w + x) * 4;
        if (f < TH - 0.1) continue;
        let col, a;
        if (f < TH) {                         // the damp halo on the grass
          col = HALO; a = 0.35 * (f - (TH - 0.1)) / 0.1;
        } else {
          a = Math.min(1, (f - TH) / 0.03);
          const depth = Math.min(1, (f - TH) / 0.22);
          col = mixc(RIM, MUD, depth);
          if (f > 1) col = mixc(col, DEEP, Math.min(1, (f - 1) / 0.6));
          const n = vnoise(x / (cell * 0.45) + 9, y / (cell * 0.3) + 3);
          if (n > 0.62 && depth > 0.6) col = mixc(col, WET, Math.min(1, (n - 0.62) * 4) * 0.6);
          const grain = (hash(x, y) - 0.5) * 8;
          col = [col[0] + grain, col[1] + grain, col[2] + grain];
        }
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }

  // Where she is in her heave, 0 to 1.
  phase() { return (this.time.now % this.D.cow.heave.period) / this.D.cow.heave.period; }

  pullNow() {
    if (this.busy) return;
    const sim = game.sim;
    const G = this.G;
    if (!cowReady(sim)) { this.hoverNote = this.D.ui.cow.hint.need; this.showHover(); return; }
    const phase = this.phase();
    const good = inHeave(sim, phase);
    if (!sim.pullRope(phase)) return;
    game.save();
    this.render();
    const cow = this.live.cow;
    if (cow) this.tweens.add({ targets: cow, y: cow.y + (good ? -6 : 3), scaleY: cow.scaleY * (good ? 1.06 : 0.97), duration: 220, yoyo: true });
  }

  /* ---------- cattle ---------- */

  buildCattle() {
    const G = this.G;
    const C = this.D.cattle;
    const sim = game.sim;
    const { cell, g } = this.geo;
    for (let cy = 0; cy < g.h; cy++) for (let cx = 0; cx < g.w; cx++) this.img('grass-' + ((cx * 2 + cy * 3) % 3), cx + 0.5, cy + 0.5, 1.012, 0);
    this.paddock(0, 0, g.w, g.h, true);
    // a worn track of bare earth where the cattle come and go at the gate
    const track = this.add.graphics().setDepth(1);
    this.board.add(track);
    const gm = this.px(g.w, (C.gate.y0 + C.gate.y1) / 2);
    track.fillStyle(0x9a8660, 0.55).fillEllipse(gm.x - cell * 0.4, gm.y, cell * 3.4, cell * 2.6);
    track.fillStyle(0x8c7852, 0.5).fillEllipse(gm.x - cell * 0.2, gm.y, cell * 2.2, cell * 1.6);
    // fences round the paddock, with the open gate gap in the east side
    for (let cx = 0; cx < g.w; cx++) { this.img('fence', cx + 0.5, 0, 1, 4); this.img('fence', cx + 0.5, g.h, 1, 4); }
    for (let cy = 0; cy < g.h; cy++) {
      this.img('fence', 0, cy + 0.5, 1, 4).setRotation(Math.PI / 2);
      if (cy < C.gate.y0 || cy >= C.gate.y1) this.img('fence', g.w, cy + 0.5, 1, 4).setRotation(Math.PI / 2);
    }
    this.img('post', g.w, C.gate.y0, 0.5, 6);
    this.img('post', g.w, C.gate.y1, 0.5, 6);
    const gate = this.img('gate-open', g.w + 0.05, C.gate.y0 + 0.05, 1.6, 5);
    gate.setOrigin(0.03, 0.04);
    // paddock beyond the gate: a green strip so you can see where they are headed
    const gp = this.px(g.w + 0.35, (C.gate.y0 + C.gate.y1) / 2 + 0.55);
    this.board.add(this.add.text(gp.x + cell * 0.3, gp.y, this.D.ui.cattle.gate + '\n>>>', { ...TEXT.heading, align: 'center', backgroundColor: '#1c2420cc', padding: { x: 8, y: 4 } }).setOrigin(0.5).setDepth(8));
    // the herd
    this.live.cows = [];
    G.cows.forEach((c, i) => {
      if (c.out && !(G.last && !G.last.before[i].out)) return;
      const before = G.last?.before[i];
      const was = this.shown['cow' + i];
      let angle = was?.angle ?? 0;
      if (before && (before.x !== c.x || before.y !== c.y)) angle = Math.atan2(c.y - before.y, c.x - before.x);
      const to = c.out ? { x: g.w + 1.3, y: (C.gate.y0 + C.gate.y1) / 2 } : c;
      const im = this.mover('cow' + i, 'cow-' + c.kind, to.x, to.y, 2.3, 20, angle);
      if (c.out) this.tweens.add({ targets: im, alpha: 0, delay: 600, duration: 600 });
    });
    this.caretaker(G, false);
    // hover: where you would stand, and how far the cattle notice you
    this.live.alert = this.add.graphics().setDepth(18);
    this.board.add(this.live.alert);
    this.groundZone((x, y) => { if (cattleLeft(G) > 0) this.act(sim.moveCattle(x, y)); }, (x, y) => { if (cattleLeft(G) > 0) this.setHover({ stand: { x, y } }); });   // no 'where to stand' help once they are out
  }

  /* ---------- sheep ---------- */

  // Things that make a paddock look grazed and lived-in (only for looks, and
  // the same every time): patches of shorter and longer grass, cow pats,
  // thistles, rushes in the damp, and (for the cattle) a trough in a corner.
  paddock(x0, y0, x1, y1, trough) {
    const { cell } = this.geo;
    const h = (a, b) => { const n = Math.sin(a * 91.7 + b * 47.3) * 9631.1; return n - Math.floor(n); };
    const gfx = this.add.graphics().setDepth(0.4);
    this.board.add(gfx);
    for (let i = 0; i < 7; i++) {                        // grazed and rank patches, soft-edged, kept inside the paddock
      const cx = x0 + 1.5 + h(i, 1) * (x1 - x0 - 3);
      const cy = y0 + 1.2 + h(i, 2) * (y1 - y0 - 2.4);
      const rx = Math.min(1 + h(i, 3) * 1.5, cx - x0, x1 - cx);
      const ry = Math.min(0.8 + h(i, 4), cy - y0, y1 - cy);
      const p = this.px(cx, cy);
      for (let k = 0; k < 5; k++) {
        const f = 1 - k * 0.17;
        gfx.fillStyle(i % 2 ? 0x56703e : 0x9aac72, 0.05).fillEllipse(p.x, p.y, 2 * rx * cell * f, 2 * ry * cell * f);
      }
    }
    for (let cy = y0; cy < y1; cy++) {
      for (let cx = x0; cx < x1; cx++) {
        const r = h(cx, cy);
        const jx = cx + 0.25 + h(cy, cx) * 0.5;
        const jy = cy + 0.25 + h(cx + 3, cy + 7) * 0.5;
        if (r < 0.05) this.img('cowpat-' + (cx % 2), jx, jy, 0.42, 0.5).setRotation(r * 60);
        else if (r < 0.1) this.img('thistle', jx, jy, 0.8, 0.5);
        else if (r < 0.13 && cy > y0 + (y1 - y0) / 2) this.img('rushes', jx, jy, 0.95, 0.5);
      }
    }
    if (trough) this.img('trough', x0 + 1.3, y0 + 0.75, 1.9, 0.6);
  }

  buildSheep() {
    const G = this.G;
    const C = this.D.sheep;
    const sim = game.sim;
    const { cell, g } = this.geo;
    for (let cy = 0; cy < g.h; cy++) {
      for (let cx = 0; cx < g.w; cx++) {
        this.img(cy < C.fenceRow ? 'bank-' + ((cx + cy) % 2) : 'grass-' + ((cx * 2 + cy * 3) % 3), cx + 0.5, cy + 0.5, 1.012, 0);
      }
    }
    this.paddock(0, C.fenceRow + 1, g.w, g.h, false);
    for (let cx = 0; cx < g.w; cx++) this.img('fence', cx + 0.5, C.fenceRow, 1, 4);
    const label = (txt, y) => this.board.add(this.add.text(this.px(0.3, y).x, this.px(0.3, y).y, txt, { ...TEXT.small, backgroundColor: '#1c2420cc', padding: { x: 8, y: 3 } }).setOrigin(0, 0.5).setDepth(9));
    label('Reserve side', 0.45);
    label('Farm side', g.h - 0.45);
    const carrying = G.carrying !== null;
    const prevFace = this.shown.me?.angle ?? 0;
    this.caretaker(G, carrying);
    const face = this.shown.me.angle ?? prevFace;
    G.sheep.forEach((s, i) => {
      let x = s.x;
      let y = s.y;
      if (s.state === 'carried') { x = G.pos.x + Math.cos(face) * 0.95; y = G.pos.y + Math.sin(face) * 0.95; }
      const im = this.mover('sheep' + i, 'sheep', x, y, s.state === 'carried' ? 1.5 : 1.7, s.state === 'carried' ? 29 : 15, s.state === 'carried' ? face : 0);
      if (s.face < 0 && s.state !== 'carried') im.setFlipY(true);
      if (s.state === 'field' && !carrying) {
        this.spot(s.x, s.y, 0.9, () => this.setHover({ sheep: i }), () => this.act(sim.pickSheep(i)), 50);
      }
    });
    if (carrying) {
      // the whole fence line is a click area, and a mark shows where you would lift
      const fp = this.px(0, C.fenceRow);
      this.live.lift = this.add.circle(0, 0, cell * 0.5).setStrokeStyle(5, COLOURS.accent).setDepth(30).setVisible(false);
      this.board.add(this.live.lift);
      const z = this.add.zone(fp.x, fp.y - cell * 0.6, g.w * cell, cell * 1.2).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(45);
      z.on('pointermove', ptr => { this.setHover({ fence: (ptr.x - this.geo.ox) / cell }); });
      z.on('pointerover', ptr => this.setHover({ fence: (ptr.x - this.geo.ox) / cell }));
      z.on('pointerout', () => this.setHover(null));
      z.on('pointerdown', ptr => { if (!this.busy) this.act(sim.liftOver((ptr.x - this.geo.ox) / cell)); });
      this.board.add(z);
    }
    this.groundZone(() => {}, () => this.setHover(null));
  }

  /* ---------- hover ---------- */

  hoverLine() {
    const U = this.D.ui;
    const G = this.G;
    if (this.hoverNote) return this.hoverNote;
    const h = this.hover;
    const idle = G.line ?? (G.started ? '' : U[G.kind].intro);
    if (G.kind === 'cow') {
      if (!h) return idle;
      if (typeof h === 'string') return h;
      return `${h.soft ? 'Soft mud: slow going. ' : 'Firm ground. '}About ${Math.max(1, Math.round(h.minutes))} min to walk there.`;
    }
    if (G.kind === 'cattle') return h?.stand ? U.cattle.hint : (idle || U.cattle.hint);
    if (G.kind === 'sheep') {
      if (h?.sheep !== undefined) return U.sheep.hint.sheep;
      if (h?.fence !== undefined) return U.sheep.hint.fence;
      return G.carrying !== null ? U.sheep.hint.carrying : idle;
    }
    return '';
  }

  showHover() {
    const G = this.G;
    const h = this.hover;
    if (this.hoverText) this.hoverText.setText(this.hoverLine());
    const { cell } = this.geo;
    if (G.kind === 'cow' && this.live.cost) {
      const ground = h && typeof h === 'object' && h.ground;
      this.live.cost.setVisible(Boolean(ground)).setText(ground ? `${h.soft ? 'soft, ' : ''}about ${Math.max(1, Math.round(h.minutes))} min` : '');
      const b = this.D.cow.body;
      const inBody = ground && h.ground.x > b.x0 && h.ground.x < b.x1 && h.ground.y > b.y0 && h.ground.y < b.y1;
      if (inBody) { this.live.cost.setVisible(false); }
      this.live.tile.setVisible(Boolean(ground) && !inBody);
      if (ground) {
        const p = this.px(h.ground.x, h.ground.y);
        this.live.tile.setPosition(p.x, p.y).setStrokeStyle(3, h.soft ? WARN : GOOD);
        this.live.cost.setPosition(p.x + cell * 0.6, p.y - cell * 0.9);
      }
    }
    if (G.kind === 'cattle' && this.live.alert) {
      const a = this.live.alert.clear();
      if (h?.stand) {
        const p = this.px(h.stand.x, h.stand.y);
        a.fillStyle(COLOURS.accent, 0.07).fillCircle(p.x, p.y, this.D.cattle.alert * cell);
        a.lineStyle(3, COLOURS.accent, 0.5).strokeCircle(p.x, p.y, this.D.cattle.alert * cell);
        a.lineStyle(2, COLOURS.accent, 0.3).strokeCircle(p.x, p.y, this.D.cattle.alert * cell * 0.5);
        a.fillStyle(COLOURS.accent, 0.9).fillCircle(p.x, p.y, 7);
      }
    }
    if (G.kind === 'sheep' && this.live.lift) {
      const on = h?.fence !== undefined;
      this.live.lift.setVisible(on);
      if (on) { const p = this.px(Math.max(0.5, Math.min(this.geo.g.w - 0.5, h.fence)), this.D.sheep.fenceRow - 0.1); this.live.lift.setPosition(p.x, p.y); }
    }
  }

  update() {
    const G = this.G;
    if (!G || G.kind !== 'cow' || !this.live) return;
    const C = this.D.cow;
    const sim = game.sim;
    const phase = this.phase();
    const push = inHeave(sim, phase);
    // the cow breathes, and swells when she heaves
    if (this.live.cow && !G.result) {
      const k = 1 + 0.018 * Math.sin(phase * Math.PI * 2) + (push ? 0.025 : 0);
      this.live.cow.setScale(this.live.cowBase * k);
    }
    // a ring round her that lights up in her heave: the same rhythm as the meter
    const hv = this.live.heave;
    if (hv && !G.result) {
      const mid = this.px((C.body.x0 + C.body.x1) / 2 + 0.25, (C.body.y0 + C.body.y1) / 2);
      const cell = this.geo.cell;
      hv.clear();
      hv.lineStyle(push ? 9 : 3, push ? GOOD : 0x8a7a60, push ? 0.9 : 0.45);
      hv.strokeEllipse(mid.x, mid.y, cell * (push ? 5.3 : 4.9), cell * (push ? 3.0 : 2.8));
    }
    // the rope, from where it is tied to where you are
    const r = this.live.rope;
    if (r) {
      r.clear();
      if (!G.result && (G.rope === 'horns' || G.rope === 'neck') && this.live.me) {
        const t = this.px(C[G.rope].x, C[G.rope].y);
        r.lineStyle(7, 0x5a4326, 1).lineBetween(t.x, t.y, this.live.me.x, this.live.me.y);
        r.lineStyle(4, 0xc4a464, 1).lineBetween(t.x, t.y, this.live.me.x, this.live.me.y);
      }
    }
    // the heave meter in the panel
    const m = this.live.meter;
    if (m && !G.result) {
      m.marker.x = m.x0 + phase * m.w;
      m.marker.setFillStyle(push ? GOOD : 0xf4efe0);
      m.caption.setText(push ? this.D.ui.cow.heave.push : this.D.ui.cow.heave.rest).setColor(push ? '#9bd17a' : COLOURS.textDim);
    }
  }

  /* ---------- the side panel ---------- */

  buildPanel() {
    const D = game.data;
    const S = game.sim.S;
    const G = this.G;
    const U = this.D.ui;
    const K = U[G.kind];
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
    text(U.title[G.kind], TEXT.title, 4);
    text(`${clock(S.time)} · ${fill(D, U.timeUsed, { time: duration(G.minutes) })}`, TEXT.dim, 12);

    // what to do, and what's happening (a fixed-height box so the rest doesn't jump)
    const boxH = 138;
    const boxTop = y;
    items.push(this.add.rectangle(x + 8, boxTop, w - 16, boxH, 0x232e29).setOrigin(0).setStrokeStyle(2, COLOURS.panelEdge));
    this.hoverText = this.add.text(x + 18, boxTop + 10, '', { ...TEXT.body, fontSize: '19px', wordWrap: { width: w - 36 } });
    items.push(this.hoverText);
    this.hoverText.setText(this.hoverLine());
    y = boxTop + boxH + 10;

    if (G.result) {
      text(K.grade[G.result.grade], G.result.grade === 'great' ? TEXT.highlight : TEXT.body, 8);
      const n = G.kind === 'sheep' ? G.lifted : G.moves;
      text(fill(D, K.summary, { n, time: duration(G.minutes) }), TEXT.dim, 12);
      btn(U.done, { accent: true, center: true, onClick: () => this.leave(false) });
    } else {
      if (G.kind === 'cow') this.cowPanel(text, btn, items, x, w, () => y, v => { y = v; });
      if (G.kind === 'cattle') {
        text(fill(D, K.left, { n: cattleLeft(G) }), TEXT.highlight, 2);
        text(fill(D, K.moves, { n: G.moves }), TEXT.small, 10);
      }
      if (G.kind === 'sheep') {
        text(fill(D, K.left, { n: sheepLeft(G) }), TEXT.highlight, 2);
        text(fill(D, K.lifted, { n: G.lifted }), TEXT.small, 2);
        text(fill(D, K.strain, { word: K.strainWords[strainLevel(game.sim, G)] }), TEXT.small, 10);
      }
      if (!G.started) btn(U.leave, { center: true, onClick: () => this.leave(true) });
    }
    c.add(items);
    c.addAt(panel(this, x, g, w, Math.max(y + 2 - g, 200)), 0);
  }

  cowPanel(text, btn, items, x, w, getY, setY) {
    const D = game.data;
    const G = this.G;
    const sim = game.sim;
    const K = this.D.ui.cow;
    const C = this.D.cow;
    const left = legsLeft(sim, G);
    const tick = (done, str, style) => text((done ? '✓ ' : '· ') + str, done ? TEXT.small : style, 2);
    tick(left === 0, fill(D, K.todo.legs, { left }), TEXT.small);
    tick(G.rope === 'horns' || G.rope === 'neck', G.rope === 'coil' ? K.pickRope : G.rope === 'held' ? K.ropeOn : K.todo.rope, TEXT.small);
    tick(false, fill(D, K.pulls, { done: G.pulls, need: pullsNeeded(sim, G) }), TEXT.small);
    text(K.softWarn, TEXT.smallFaint, 8);
    // the heave meter: a track with her heave marked, and a marker sweeping across it
    let y = getY();
    const x0 = x + 22;
    const mw = w - 44;
    items.push(this.add.rectangle(x0, y, mw, 26, 0x16201c).setOrigin(0).setStrokeStyle(2, COLOURS.panelEdge));
    items.push(this.add.rectangle(x0 + C.heave.from * mw, y, (C.heave.to - C.heave.from) * mw, 26, 0x6ea35a, 0.85).setOrigin(0));
    const marker = this.add.rectangle(x0, y + 13, 8, 38, 0xf4efe0).setStrokeStyle(2, 0x16201c);
    items.push(marker);
    const caption = this.add.text(x0 + mw / 2, y + 44, '', { ...TEXT.small, fontStyle: 'bold' }).setOrigin(0.5, 0);
    items.push(caption);
    this.live.meter = { marker, caption, x0, w: mw };
    setY(y + 76);
    y = y + 76;
    const ready = cowReady(sim);
    items.push(...button(this, x + 12, y, w - 24, ready ? K.pullButton : K.pullNeed, {
      accent: ready, disabled: !ready, center: true, height: 58, onClick: () => this.pullNow(),
    }));
    setY(y + 58 + 10);
  }

  leave(cancel) {
    const sim = game.sim;
    if (cancel) sim.cancelStock();
    else sim.closeStock();
    game.save();
    this.scene.start('map');
  }
}
