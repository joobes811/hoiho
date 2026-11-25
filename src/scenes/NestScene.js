// The hands-on nest check: a close-up of the nests under the bush at the place
// you are standing. Peek from a distance or creep right up, weigh and band the
// chicks (slow, steady mouse movements keep a chick calm), and scrub through
// the trail-camera frames. The rules are in src/sim/nests.js; this scene only
// draws them and passes on clicks. Mouse only, no timer, no failing: each step
// just uses a little daylight.
//
// The pictures are drawn by tools/nest_sprites.py.
import { COLOURS, SIZES, TEXT, fitTitle } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { game } from '../game.js';
import { fill, duration, plural } from '../text.js';
import { isDisturbMonth, unweighed } from '../sim/nests.js';
import SCREENS from '../../data/screens.js';

const SPRITES = 'assets/sprites/nest/';
const PICTURES = ['hoiho-sit', 'hoiho-front', 'chick-s', 'chick-l', 'egg', 'nest-bowl', 'fern', 'ground', 'scale', 'bag-back',
  'bag-lip', 'crate', 'cam-icon', 'band', 'cam-ground', 'cam-overlay',
  'g-nest-bowl', 'g-hoiho-sit', 'g-hoiho-front', 'g-chick-s', 'g-chick-l', 'g-egg', 'g-stoat', 'g-rat', 'g-intruder', 'g-fern'];
const PANEL_W = 400;           // px: the side panel
const BOWL = { w: 320, h: 250 };   // px: the nest picture
const CAM = { w: 560, h: 340 };    // px: one camera frame
const GOOD = 0x9bd17a;
const WARN = 0xe6a24a;
const FONT = 'Georgia, "Times New Roman", serif';
const BAND_COL = SCREENS.colony.bandColours;
const BAND_DARK = SCREENS.colony.bandDarkText;

const hex = n => '#' + n.toString(16).padStart(6, '0');

export class NestScene extends Phaser.Scene {
  constructor() {
    super('nests');
  }

  preload() {
    for (const p of PICTURES) if (!this.textures.exists('nest-' + p)) this.load.image('nest-' + p, SPRITES + p + '.png');
  }

  create() {
    const S = game.sim.S;
    if (S.phase !== 'nests' || !S.nestCheck) { this.scene.start('map'); return; }
    this.cameras.main.setBackgroundColor(COLOURS.background);
    this.mode = S.nestCheck.holding ? 'weigh' : 'nests';
    this.sel = S.nestCheck.holding ? S.nestCheck.holding.idx : 0;
    this.frame = 0;
    this.band = null;               // the band colour picked for the chick in hand
    this.decision = null;           // 'rehab' or 'stay' for a light chick
    this.note = null;
    this.held = null;
    this.pointer = { x: 0, y: 0 };
    this.render();
    const onResize = () => this.render();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  get C() { return game.sim.S.nestCheck; }
  get ui() { return game.data.nests.ui; }

  render() {
    this.board?.destroy();
    this.panels?.destroy();
    this.board = this.add.container(0, 0);
    this.panels = this.add.container(0, 0);
    this.dyn = {};                  // objects the weigh view updates every frame
    const W = this.scale.width;
    const H = this.scale.height;
    this.boardW = W - Math.max(SIZES.panelMin, PANEL_W);
    this.board.add(this.add.tileSprite(0, 0, this.boardW, H, 'nest-ground').setOrigin(0).setTileScale(1));
    this.board.add(this.add.rectangle(0, 0, this.boardW, H, 0x101a14, 0.28).setOrigin(0));
    if (this.mode === 'nests') { this.buildNests(); this.panelNests(); }
    else if (this.mode === 'weigh') { this.buildWeigh(); this.panelWeigh(); }
    else { this.buildCamera(); this.panelCamera(); }
  }

  /* ---------- picture helpers ---------- */

  img(c, key, x, y, scale = 1, extra = {}) {
    const im = this.add.image(x, y, 'nest-' + key).setScale(scale);
    if (extra.alpha !== undefined) im.setAlpha(extra.alpha);
    if (extra.flipX) im.setFlipX(true);
    if (extra.angle) im.setAngle(extra.angle);
    c.add(im);
    return im;
  }

  // One nest bowl with whatever you can see of it, at (cx, cy), s times full size.
  drawNest(c, v, cx, cy, s, grey = false) {
    const g = grey ? 'g-' : '';
    const sit = (x, y, k, flip) => this.img(c, g + 'hoiho-sit', x, y, k * s, { flipX: flip });
    this.img(c, g + 'nest-bowl', cx, cy, s);
    const eggAt = n => (n === 1 ? [[0, 6]] : [[-28, 4], [30, 10]]);
    const chickAt = n => (n === 1 ? [[0, 6]] : [[-44, 2], [46, 10]]);
    const eggs = (n) => eggAt(n).forEach(([x, y], i) => this.img(c, g + 'egg', cx + x * s, cy + y * s, 1.15 * s, { angle: i ? 18 : -14 }));
    const chicks = (n) => chickAt(n).forEach(([x, y], i) => this.img(c, g + 'chick-l', cx + x * s, cy + y * s, 1.1 * s, { angle: i ? 14 : -10 }));
    if (!v.look) return;
    const near = v.look === 'near';
    if (!near) {
      if (v.sitting) sit(cx, cy - 8 * s, 0.82);
      else if (v.status === 'chicks') this.img(c, g + 'chick-l', cx + 6 * s, cy + 6 * s, 1.1 * s);
      return;
    }
    // close up: the sitting bird shuffles over so you can see the nest
    if (v.eggs) eggs(Math.min(2, v.eggs));
    const away = v.kids.filter(k => k.decision === 'rehab').length;
    if (v.chicks - away > 0) chicks(Math.min(2, v.chicks - away));
    if (v.sitting) sit(cx + 112 * s, cy - 44 * s, 0.6, false);
  }

  fern(c, x, y, s, flipX = false, flipY = false, key = 'fern') {
    const f = this.add.image(x, y, 'nest-' + key).setOrigin(0, 0).setScale(s);
    f.setFlip(flipX, flipY);
    c.add(f);
    return f;
  }

  bandChip(c, x, y, letter, w = 26, h = 34) {
    const g = this.add.graphics();
    g.fillStyle(BAND_COL[letter] ?? 0x999999, 1).fillRoundedRect(x - w / 2, y - h / 2, w, h, 5);
    g.lineStyle(2, 0x0f1512, 0.8).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 5);
    c.add(g);
    return g;
  }

  /* ---------- the nests ---------- */

  nestWords(v) {
    const ui = this.ui;
    const D = game.data;
    if (!v.look) return [ui.unknown];
    if (v.look === 'far') {
      if (v.sitting) return [ui.farSitting];
      return [v.status === 'chicks' ? ui.farAlone : ui.farEmpty];
    }
    const out = [];
    if (v.disturbed) out.push(ui.disturbed);
    if (v.chicks) out.push(fill(D, ui.chicks, { chicks: v.chicks }));
    else if (v.eggs) out.push(fill(D, ui.eggs, { eggs: v.eggs }));
    else out.push(v.beforeLaying ? ui.noEggsYet : ui.emptyNest);
    const banded = v.kids.filter(k => k.band).length;
    const rehab = v.kids.filter(k => k.decision === 'rehab').length;
    if (banded) out.push(fill(D, ui.bandedN, { n: banded }) + (rehab ? ', ' + fill(D, ui.rehabN, { n: rehab }) : ''));
    return out;
  }

  buildNests() {
    const C = this.C;
    const H = this.scale.height;
    const n = C.nests.length;
    const cols = Math.min(n, n > 4 ? 3 : n > 1 ? 2 : 1);
    const rows = Math.ceil(n / cols);
    const pad = 16;
    const cw = (this.boardW - pad * (cols + 1)) / cols;
    const ch = (H - pad * (rows + 1)) / rows;
    const textH = 96;
    const s = Math.min((cw - 30) / BOWL.w, (ch - textH - 20) / BOWL.h, 1.4);
    const cardH = BOWL.h * s + textH + 28;          // short cards are centred on the board rather than stretched
    this.cards = [];
    C.nests.forEach((v, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x0 = pad + col * (cw + pad);
      const y0 = pad + row * (ch + pad) + (ch - cardH) / 2;
      const c = this.board;
      const selected = i === this.sel;
      const card = this.add.graphics();
      card.fillStyle(0x16201c, 0.86).fillRoundedRect(x0, y0, cw, cardH, 14);
      card.lineStyle(selected ? 5 : 2, selected ? COLOURS.accent : COLOURS.panelEdge, 1).strokeRoundedRect(x0, y0, cw, cardH, 14);
      c.add(card);
      const cx = x0 + cw / 2;
      const cy = y0 + 12 + BOWL.h * s / 2 + 6;
      this.drawNest(c, v, cx, cy, s);
      // under the bush: ferns hang in from the corners; an unseen nest is half hidden
      const fs = s * (v.look ? 0.6 : 0.8);
      this.fern(c, x0 + 4, y0 + 4, fs);
      if (!v.look) this.fern(c, x0 + cw - 4, y0 + 12 + BOWL.h * s, fs * 0.7, true, true).setOrigin(1, 1);
      const words = this.nestWords(v);
      const ty = y0 + 12 + BOWL.h * s + 14;
      c.add(this.add.text(cx, ty, fill(game.data, this.ui.pair, v), { ...TEXT.small, fontStyle: 'bold', align: 'center' }).setOrigin(0.5, 0));
      c.add(this.add.text(cx, ty + 26, words.join('\n'), { ...TEXT.body, fontSize: '19px', align: 'center', wordWrap: { width: cw - 24 }, color: v.disturbed ? hex(WARN) : COLOURS.text }).setOrigin(0.5, 0));
      // badges: a camera on a post, and banded chicks
      if (v.cam) {
        this.img(c, 'cam-icon', x0 + 34, y0 + cardH - 40, 0.7);
        c.add(this.add.text(x0 + 62, y0 + cardH - 40, this.ui.camBadge, TEXT.smallFaint).setOrigin(0, 0.5));
      }
      const banded = v.kids.filter(k => k.band);
      banded.forEach((k, j) => this.bandChip(c, x0 + cw - 30 - j * 32, y0 + cardH - 28, k.band, 22, 28));
      const z = this.add.zone(x0, y0, cw, cardH).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { this.sel = i; this.note = null; this.render(); });
      c.add(z);
    });
  }

  panelShell() {
    const D = game.data;
    const S = game.sim.S;
    const g = SIZES.gap;
    const W = this.scale.width;
    const pw = Math.max(SIZES.panelMin, PANEL_W);
    const x = W - pw + g;
    const w = pw - 2 * g;
    const items = [];
    const st = { y: g + 12 };
    const text = (str, style, after = 8) => {
      const t = this.add.text(x + 18, st.y, str, { ...fitTitle(this, str, style, w - 36), wordWrap: { width: w - 36 } });
      items.push(t);
      st.y += t.height + after;
      return t;
    };
    const btn = (label, opts) => {
      items.push(...button(this, x + 12, st.y, w - 24, label, opts));
      st.y += (opts.height ?? SIZES.buttonHeight) + 8;
    };
    return { D, S, g, x, w, items, st, text, btn };
  }

  endPanel(P) {
    this.panels.add(P.items);
    this.panels.addAt(panel(this, P.x - P.g, P.g, P.w + 2 * P.g - 0, Math.max(P.st.y + 2 - P.g, 200)), 0);
  }

  panelNests() {
    const P = this.panelShell();
    const { D, text, btn } = P;
    const ui = this.ui;
    const C = this.C;
    text(fill(D, ui.title, { zone: C.zone }), TEXT.title, 4);
    text(fill(D, ui.timeUsed, { time: duration(C.minutes) }), TEXT.dim, 12);
    const v = C.nests[this.sel];
    const sim = game.sim;
    const M = D.nests.minutes;
    let stepShown = false;            // a yellow next step for the nest in hand
    if (v) {
      text(fill(D, ui.pair, v), TEXT.heading, 6);
      const early = isDisturbMonth(sim);
      const noDay = which => sim.S.time + M[which] > sim.S.workEnd;
      if (v.look !== 'near' && !C.weigh) {
        if (!v.look) btn(`${ui.peekFar} · ${M.far} min`, { disabled: noDay('far'), onClick: () => this.look('far') });
        text(ui.peekFarNote, TEXT.smallFaint, 8);
        stepShown = !noDay('near');      // the sensible next step, so it gets the yellow
        btn(`${ui.peekNear} · ${M.near} min`, { accent: stepShown, disabled: noDay('near'), onClick: () => this.look('near') });
        text(fill(D, ui.peekNearNote, { risk: early ? ui.riskEarly : ui.riskNone }), early ? TEXT.smallAccent : TEXT.smallFaint, 8);
      } else if (C.weigh && v.look !== 'near') {
        stepShown = !noDay('near');
        btn(`${ui.peekNear} · ${M.near} min`, { accent: stepShown, disabled: noDay('near'), onClick: () => this.look('near') });
      } else {
        const lines = this.nestWords(v);
        text(lines.join('. '), TEXT.body, 8);
      }
      if (this.note) text(this.note, TEXT.smallAccent, 6);
      if (v.cam && v.frames && this.camSummary) text(this.camSummary(v), TEXT.small, 8);
      if (v.cam) {
        btn(v.frames ? ui.cameraDone : `${ui.camera} · ${M.camera} min`, { disabled: !v.frames && noDay('camera'), onClick: () => this.openCam() });
      }
      if (C.weigh && v.look === 'near' && v.kids.length) {
        const left = v.kids.filter(k => !k.weighed).length;
        if (left > 0) stepShown = true;
        btn(left ? `${ui.weigh} · ${plural(left, 'chick')} left` : ui.weighAll, { accent: left > 0, disabled: !left, onClick: () => { this.mode = 'weigh'; this.note = null; this.render(); } });
      }
    }
    P.st.y += 6;
    if (C.weigh) {
      const n = unweighed(sim);
      if (n) text(fill(D, ui.unweighed, { n }), TEXT.smallAccent, 8);
    }
    // Only one yellow button at a time: finishing is the main action once the nest in hand has no next step.
    btn(ui.finish, { center: true, accent: !stepShown && (!C.weigh || unweighed(sim) === 0), onClick: () => this.finish() });
    this.endPanel(P);
  }

  // After the camera: how many of the frames that mattered did you flag?
  camSummary(v) {
    const U = game.data.nests.camUi;
    const matters = v.frames.filter(x => x.matters).length;
    const hits = v.frames.filter(x => x.matters && x.flagged).length;
    return matters ? fill(game.data, U.caught, { n: hits, total: matters }) : U.summaryNone;
  }

  look(how) {
    if (!game.sim.lookAtNest(this.sel, how)) this.note = this.ui.notYet;
    else this.note = null;
    game.save();
    this.render();
  }

  finish() {
    if (!game.sim.finishNestCheck()) return;
    game.save();
    this.scene.start('map');
  }

  /* ---------- weighing ---------- */

  // Where the two chick spots sit on the weigh view.
  weighGeo() {
    const H = this.scale.height;
    const bw = this.boardW;
    const bowl = { x: bw * 0.27, y: H * 0.36, s: Math.min(1.0, (bw * 0.46) / BOWL.w, (H * 0.5) / BOWL.h) };
    const scale = { x: bw * 0.73, y: H * 0.47, s: Math.min(1.0, (bw * 0.4) / 380, (H * 0.66) / 340) };
    const plate = { x: scale.x, y: scale.y + 44 * scale.s, s: scale.s };
    const crate = { x: bw * 0.27, y: H * 0.8, s: Math.min(0.9, (bw * 0.4) / 240) };
    return { bowl, scale, plate, crate };
  }

  chickSpot(geo, ci, n) {
    const o = n === 1 ? [[0, 8]] : [[-58, 2], [58, 12]];
    const [x, y] = o[ci];
    return { x: geo.bowl.x + x * geo.bowl.s * 1.2, y: geo.bowl.y + y * geo.bowl.s };
  }

  buildWeigh() {
    const sim = game.sim;
    const C = this.C;
    const v = C.nests[this.sel];
    const geo = this.weighGeo();
    this.geo = geo;
    const c = this.board;
    const h = C.holding;
    const ui = game.data.nests.weighUi;
    const kk = geo.bowl.s * 1.55;
    // the nest, with the chicks still to weigh
    this.img(c, 'nest-bowl', geo.bowl.x, geo.bowl.y, geo.bowl.s * 1.25);
    this.fern(c, 6, 6, 0.9);
    v.kids.forEach((k, ci) => {
      const p = this.chickSpot(geo, ci, v.kids.length);
      const inHand = h && h.idx === this.sel && h.ci === ci;
      if (!k.weighed && !inHand) {
        const im = this.img(c, 'chick-l', p.x, p.y, kk, { angle: ci ? 12 : -8 });
        const z = this.add.zone(p.x - 70, p.y - 80, 140, 160).setOrigin(0).setInteractive({ useHandCursor: !h });
        z.on('pointerover', () => { if (!h) im.setScale(kk * 1.06); });
        z.on('pointerout', () => im.setScale(kk));
        z.on('pointerdown', () => this.pickUp(ci));
        c.add(z);
      } else if (k.weighed) {
        if (k.decision !== 'rehab') this.img(c, 'chick-l', p.x, p.y + 6, kk * 0.95, { angle: ci ? 12 : -8, alpha: 0.9 });
        c.add(this.add.text(p.x, p.y - 30, fill(game.data, ui.weighed, { g: k.g.toLocaleString('en-NZ'), band: k.band }), { ...TEXT.small, backgroundColor: '#1c2420dd', padding: { x: 8, y: 3 } }).setOrigin(0.5));
        this.bandChip(c, p.x + 40 * geo.bowl.s, p.y + 40 * geo.bowl.s, k.band);
      }
    });
    // the scale and the bag
    this.img(c, 'scale', geo.scale.x, geo.scale.y, geo.scale.s);
    this.img(c, 'bag-back', geo.plate.x, geo.plate.y, geo.plate.s * 0.95);
    // the chick in the bag (drawn between the bag's back and its front lip)
    this.dyn.bagChick = this.add.image(geo.plate.x, geo.plate.y + 4, 'nest-chick-l').setScale(kk * 0.9).setVisible(Boolean(h?.inBag));
    c.add(this.dyn.bagChick);
    this.img(c, 'bag-lip', geo.plate.x, geo.plate.y, geo.plate.s * 0.95);
    this.dyn.lcd = this.add.text(geo.scale.x, geo.scale.y - 118 * geo.scale.s + 4, '', { fontFamily: 'Consolas, "Courier New", monospace', fontSize: '44px', color: '#8fe3a0', fontStyle: 'bold' }).setOrigin(0.5);
    this.dyn.lcdNote = this.add.text(geo.scale.x - 150 * geo.scale.s, geo.scale.y - 140 * geo.scale.s, ui.reading, { fontFamily: FONT, fontSize: '18px', color: '#7fbf8c' }).setOrigin(0, 0.5);
    c.add([this.dyn.lcd, this.dyn.lcdNote]);
    // a click area on the bag, to lower the chick in
    const bz = this.add.zone(geo.plate.x - 100 * geo.plate.s, geo.plate.y - 90 * geo.plate.s, 200 * geo.plate.s, 180 * geo.plate.s).setOrigin(0).setInteractive({ useHandCursor: true });
    bz.on('pointerdown', () => this.dropInBag());
    c.add(bz);
    this.dyn.bagHint = this.add.text(geo.plate.x, geo.plate.y + 110 * geo.plate.s, '', { ...TEXT.small, backgroundColor: '#1c2420dd', padding: { x: 8, y: 3 } }).setOrigin(0.5);
    c.add(this.dyn.bagHint);
    // the rehab crate, with any chicks sent to it
    this.img(c, 'crate', geo.crate.x, geo.crate.y, geo.crate.s);
    const sent = C.nests.flatMap(n => n.kids).filter(k => k.decision === 'rehab').length;
    for (let i = 0; i < sent; i++) this.img(c, 'chick-s', geo.crate.x - 40 + i * 70, geo.crate.y, geo.crate.s * 0.95);
    c.add(this.add.text(geo.crate.x, geo.crate.y + 96 * geo.crate.s, sent ? plural(sent, 'chick') + ' for rehab' : 'Rehab crate', { ...TEXT.small, backgroundColor: '#1c2420dd', padding: { x: 8, y: 2 } }).setOrigin(0.5));
    // the chick in your hand follows the mouse
    this.held = null;
    if (h && !h.inBag) {
      this.held = this.add.image(this.pointer.x || geo.bowl.x, this.pointer.y || geo.bowl.y, 'nest-chick-l').setScale(kk).setDepth(50);
      c.add(this.held);
    }
    this.dyn.kk = kk;
  }

  pickUp(ci) {
    if (!game.sim.pickChick(this.sel, ci)) return;
    this.band = null;
    this.decision = null;
    this.note = null;
    const p = this.input.activePointer;
    this.pointer = { x: p.x, y: p.y };
    this.render();
  }

  dropInBag() {
    if (!game.sim.S.nestCheck.holding || !game.sim.dropChickInBag()) return;
    this.render();
  }

  // Each frame in the weigh view: the held chick follows the mouse, a fast hand
  // startles it, and the scale reads true once it has settled.
  update(time, delta) {
    if (this.mode !== 'weigh' || !this.C) return;
    const sim = game.sim;
    const h = this.C.holding;
    const p = this.input.activePointer;
    const dt = Math.min(0.1, delta / 1000);
    const speed = dt > 0 ? Math.hypot(p.x - this.pointer.x, p.y - this.pointer.y) / dt : 0;
    this.pointer = { x: p.x, y: p.y };
    const ui = game.data.nests.weighUi;
    const K = game.data.nests.calm;
    if (!h) {
      this.dyn.lcd?.setText('--- g');
      const more = this.C.nests[this.sel].kids.some(k => !k.weighed);
      this.dyn.bagHint?.setText(more ? ui.pick : '').setVisible(more);
      return;
    }
    const wasLocked = h.locked;
    sim.steadyChick(speed, dt);
    const shake = (1 - h.calm) * (h.inBag ? 7 : 12);
    if (this.held) {
      this.held.x += (p.x - this.held.x) * 0.35 + Math.sin(time / 34) * shake * 0.3;
      this.held.y += (p.y - this.held.y) * 0.35 + Math.cos(time / 29) * shake * 0.3;
      this.held.setAngle(Math.sin(time / 120) * shake * 1.4);
    }
    if (h.inBag && this.dyn.bagChick) {
      this.dyn.bagChick.setPosition(this.geo.plate.x + Math.sin(time / 41) * shake, this.geo.plate.y + 4 + Math.cos(time / 37) * shake * 0.6);
      this.dyn.bagChick.setAngle(Math.sin(time / 90) * shake * 1.2);
    }
    const r = sim.chickReading();
    if (this.dyn.lcd) {
      this.dyn.lcd.setText(h.inBag ? `${r.toLocaleString('en-NZ')} g` : '--- g');
      this.dyn.lcd.setColor(h.locked ? '#c8ffd0' : '#8fe3a0');
    }
    if (this.dyn.bagHint) this.dyn.bagHint.setVisible(true).setText(h.inBag ? (h.locked ? ui.steady : h.calm > 0.6 ? ui.settling : ui.fidget) : ui.carry);
    if (this.dyn.meter) {
      this.dyn.meter.clear();
      const x = this.dyn.meterX;
      this.dyn.meter.fillStyle(0x0e1512, 1).fillRoundedRect(x, this.dyn.meterY, this.dyn.meterW, 18, 8);
      const f = Math.min(1, h.calm / K.settled);
      this.dyn.meter.fillStyle(h.locked ? GOOD : f > 0.5 ? COLOURS.accent : WARN, 1).fillRoundedRect(x, this.dyn.meterY, Math.max(10, this.dyn.meterW * f), 18, 8);
    }
    if (h.locked && !wasLocked) this.render();       // show the band picker
  }

  panelWeigh() {
    const P = this.panelShell();
    const { D, text, btn } = P;
    const ui = D.nests.weighUi;
    const C = this.C;
    const h = C.holding;
    const v = C.nests[this.sel];
    text(ui.title, TEXT.title, 4);
    text(fill(D, D.nests.ui.timeUsed, { time: duration(C.minutes) }), TEXT.dim, 10);
    if (!h) {
      const left = v.kids.filter(k => !k.weighed).length;
      text(left ? ui.pick : D.nests.ui.weighAll, TEXT.highlight, 10);
      v.kids.forEach((k, i) => {
        if (k.weighed) text(`Chick ${i + 1}: ${fill(D, ui.weighed, { g: k.g.toLocaleString('en-NZ'), band: k.band })}, ${k.light ? ui.light : ui.normal}${k.decision === 'rehab' ? ', to rehab' : k.decision === 'stay' ? ', left with parents' : ''}.`, TEXT.small, 6);
      });
      if (this.note) text(this.note, TEXT.smallAccent, 6);
      P.st.y += 6;
      btn('Back to the nests', { center: true, accent: !left, onClick: () => { this.mode = 'nests'; this.render(); } });
      return this.endPanel(P);
    }
    const K = D.nests.calm;
    text(h.locked ? ui.steady : h.inBag ? ui.settling : ui.carry, TEXT.highlight, 6);
    // the settling meter, redrawn every frame
    this.dyn.meter = this.add.graphics();
    this.dyn.meterX = P.x + 18;
    this.dyn.meterY = P.st.y;
    this.dyn.meterW = P.w - 36;
    this.panels.add(this.dyn.meter);
    P.st.y += 30;
    if (h.locked) {
      const kid = v.kids[h.ci];
      text(`${kid.g.toLocaleString('en-NZ')} g · ${kid.light ? ui.light : ui.normal}`, kid.light ? TEXT.smallAccent : TEXT.body, 10);
      text(ui.bandHeading, TEXT.heading, 6);
      // five band colours in a row
      const sw = Math.floor((P.w - 24 - 4 * 10) / 5);
      D.nests.band.forEach((letter, i) => {
        const x = P.x + 12 + i * (sw + 10);
        const y = P.st.y;
        const g = this.add.graphics();
        g.fillStyle(BAND_COL[letter], 1).fillRoundedRect(x, y, sw, 58, 8);
        g.lineStyle(this.band === letter ? 5 : 2, this.band === letter ? COLOURS.accent : 0x0f1512, 1).strokeRoundedRect(x, y, sw, 58, 8);
        const t = this.add.text(x + sw / 2, y + 29, letter, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: BAND_DARK.includes(letter) ? '#1c2420' : '#ffffff' }).setOrigin(0.5);
        const z = this.add.zone(x, y, sw, 58).setOrigin(0).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => { this.band = letter; this.render(); });
        P.items.push(g, t, z);
      });
      P.st.y += 70;
      if (kid.light) {
        text(ui.decision, TEXT.heading, 6);
        btn(ui.rehab, { selected: this.decision === 'rehab', onClick: () => { this.decision = 'rehab'; this.render(); } });
        text(ui.rehabNote, TEXT.smallFaint, 4);
        btn(ui.stay, { selected: this.decision === 'stay', onClick: () => { this.decision = 'stay'; this.render(); } });
        text(ui.stayNote, TEXT.smallFaint, 8);
      }
      const ready = this.band && (!kid.light || this.decision);
      btn(ready ? fill(D, ui.record, { g: kid.g.toLocaleString('en-NZ') }) : (!this.band ? ui.need : ui.needDecision), { accent: ready, center: true, disabled: !ready, onClick: () => this.record() });
    } else {
      text(h.inBag ? ui.fidget : ui.carry, TEXT.smallFaint, 8);
    }
    if (!h.locked) btn(ui.putBack, { center: true, onClick: () => { game.sim.putChickBack(); this.render(); } });
    this.endPanel(P);
  }

  record() {
    if (!game.sim.recordChick({ band: this.band, decision: this.decision })) { this.note = this.ui.notYet; this.render(); return; }
    this.band = null;
    this.decision = null;
    game.save();
    this.render();
  }

  /* ---------- the trail camera ---------- */

  openCam() {
    if (!game.sim.openCamera(this.sel)) { this.note = this.ui.notYet; this.render(); return; }
    this.mode = 'camera';
    this.frame = 0;
    game.save();
    this.render();
  }

  // Draw one camera frame, k times full size, with its top-left at (ox, oy).
  drawFrame(c, f, ox, oy, k) {
    const cx = ox + CAM.w * k / 2;
    const cy = oy + CAM.h * k * 0.56;
    const put = (key, x, y, s, extra = {}) => this.img(c, 'g-' + key, cx + x * k, cy + y * k, s * k, extra);
    c.add(this.add.image(ox, oy, 'nest-cam-ground').setOrigin(0).setScale(k));
    put('nest-bowl', 0, 0, 1);
    const n = f.eggs, m = f.chicks;
    const eggAt = n === 1 ? [[0, 6]] : [[-28, 4], [30, 10]];
    const chickAt = m === 1 ? [[0, 6]] : [[-44, 2], [46, 10]];
    const showKids = !['sit', 'change'].includes(f.kind);
    if (showKids) {
      if (m) chickAt.slice(0, Math.min(2, m)).forEach(([x, y], i) => put('chick-l', x, y, 1.1, { angle: i ? 14 : -10 }));
      else if (n) eggAt.slice(0, Math.min(2, n)).forEach(([x, y], i) => put('egg', x, y, 1.15, { angle: i ? 18 : -14 }));
    }
    switch (f.kind) {
      case 'sit': put('hoiho-sit', 0, -10, 0.86); if (m) put('chick-s', 40, 52, 0.7); break;
      case 'change':
        put('hoiho-sit', -6, -12, 0.84);
        put('hoiho-front', 150, -12, 0.64);
        break;
      case 'feed': put('hoiho-front', 128, -14, 0.66); break;
      case 'stoat': put('stoat', -62, -40, 1.0, { angle: -14 }); break;
      case 'rat': put('rat', 70, 30, 1.0, { angle: 160 }); break;
      case 'intruder': put('intruder', 150, -50, 0.9); break;
      default: break;
    }
    const fr = this.add.image(ox, oy, 'nest-g-fern').setOrigin(0).setScale(k * 0.9).setAlpha(0.75);
    c.add(fr);
    c.add(this.add.image(ox, oy, 'nest-cam-overlay').setOrigin(0).setScale(k));
  }

  buildCamera() {
    const C = this.C;
    const v = C.nests[this.sel];
    const frames = v.frames;
    const bw = this.boardW;
    const H = this.scale.height;
    const c = this.board;
    const thumbW = Math.min(150, (bw - 40 - 7 * 8) / 8);
    const tk = thumbW / CAM.w;
    const bigK = Math.min((bw - 40) / CAM.w, (H - 40 - 30 - CAM.h * tk) / CAM.h);
    const bx = (bw - CAM.w * bigK) / 2;
    const by = 20;
    const f = frames[this.frame];
    this.drawFrame(c, f, bx, by, bigK);
    c.add(this.add.rectangle(bx, by, CAM.w * bigK, CAM.h * bigK).setOrigin(0).setStrokeStyle(4, f.flagged ? COLOURS.accent : 0x0e1512));
    c.add(this.add.text(bx + 16, by + 12, `${f.t}   CAM ${this.sel + 1}   8°C`, { fontFamily: 'Consolas, "Courier New", monospace', fontSize: '24px', color: '#e8e8e8', stroke: '#000000', strokeThickness: 4 }));
    if (f.flagged) c.add(this.add.text(bx + CAM.w * bigK - 16, by + 12, '⚑ ' + game.data.nests.camUi.flagged, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: hex(COLOURS.accent), stroke: '#000000', strokeThickness: 4 }).setOrigin(1, 0));
    // the strip of all the frames
    const sy = by + CAM.h * bigK + 18;
    const total = frames.length * thumbW + (frames.length - 1) * 8;
    const sx0 = (bw - total) / 2;
    frames.forEach((fr, i) => {
      const x = sx0 + i * (thumbW + 8);
      this.drawFrame(c, fr, x, sy, tk);
      c.add(this.add.rectangle(x, sy, thumbW, CAM.h * tk).setOrigin(0).setStrokeStyle(i === this.frame ? 5 : 2, i === this.frame ? COLOURS.accent : 0x0e1512));
      c.add(this.add.text(x + 4, sy + 2, fr.t, { fontFamily: 'Consolas, monospace', fontSize: '18px', color: '#f0f0f0', stroke: '#000', strokeThickness: 3 }));
      if (fr.flagged) c.add(this.add.text(x + thumbW - 6, sy + CAM.h * tk - 4, '⚑', { fontFamily: FONT, fontSize: '24px', color: hex(COLOURS.accent), stroke: '#000', strokeThickness: 4 }).setOrigin(1, 1));
      const z = this.add.zone(x, sy, thumbW, CAM.h * tk).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => { this.frame = i; this.render(); });
      c.add(z);
    });
  }

  panelCamera() {
    const P = this.panelShell();
    const { D, text, btn } = P;
    const U = D.nests.camUi;
    const C = this.C;
    const v = C.nests[this.sel];
    const f = v.frames[this.frame];
    text(U.title, TEXT.title, 4);
    text(`${fill(D, D.nests.ui.pair, v)} · ${fill(D, D.nests.ui.timeUsed, { time: duration(C.minutes) })}`, TEXT.dim, 10);
    text(U.hint, TEXT.body, 8);
    text(`Frame ${this.frame + 1} of ${v.frames.length} · ${f.t}`, TEXT.heading, 6);
    if (f.flagged) {
      text(U.frame[f.kind][f.variant % U.frame[f.kind].length], f.matters ? TEXT.highlight : TEXT.body, 8);
      if (f.kind === 'stoat') text(U.stoatNote, TEXT.smallAccent, 8);
    } else {
      text('Flag a frame to note what you see.', TEXT.smallFaint, 8);
    }
    btn(f.flagged ? U.unflag : U.flag, { accent: !f.flagged, center: true, onClick: () => { game.sim.flagFrame(this.sel, this.frame); game.save(); this.render(); } });
    const half = (P.w - 24 - 10) / 2;
    const row = P.st.y;
    items(P, button(this, P.x + 12, row, half, '← ' + U.prev, { center: true, disabled: this.frame === 0, onClick: () => { this.frame--; this.render(); } }));
    items(P, button(this, P.x + 12 + half + 10, row, half, U.next + ' →', { center: true, disabled: this.frame >= v.frames.length - 1, onClick: () => { this.frame++; this.render(); } }));
    P.st.y += SIZES.buttonHeight + 14;
    const flags = v.frames.filter(x => x.flagged).length;
    text(flags ? plural(flags, 'frame') + ' flagged.' : '', TEXT.small, 10);
    btn(U.close, { center: true, onClick: () => { this.mode = 'nests'; this.render(); } });
    this.endPanel(P);
  }
}

function items(P, arr) { P.items.push(...arr); }
