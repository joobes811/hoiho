// The shared part of the three "rounds" scenes (fence walk, bait round, torch
// round). Like the trap line: a close-up of one place on the map with a route
// of stops; at each stop a big hands-on picture opens up over the map, and a
// panel on the right says what you are looking at. The rules are in
// src/sim/rounds.js and the kind's own file; a scene only draws them and
// passes on clicks. Mouse only, no timer.
//
// A kind's scene extends this and fills in:
//   sprites            the picture names to load (assets/sprites/rounds/<name>.png)
//   marker(g, x, y, w, h, here)   draws a stop's mark on the map route
//   buildStopView(c, box)         draws the close-up into container c
//   stopPanel(ui)                 the panel's words and buttons at a stop
//   resultPanel(ui, result)       the panel's words and buttons at the end
//   animate(step, arg, done)      (optional) tween for a step, then call done()
import { COLOURS, SIZES, TEXT, fitTitle } from '../ui/styles.js';
import { panel, button, clickCue } from '../ui/panel.js';
import { preloadMap, buildMap } from '../ui/map.js';
import { game } from '../game.js';
import { fill, clock, duration } from '../text.js';
import { terrainCorners, closeUpView, planRoute } from '../ui/trap-route.js';
import { hashSeed } from '../sim/rng.js';
import UI from '../../data/ui-text.js';

const SPREAD = 2.2;            // how long the route is (times the place's width)
const WALK_MS = 900;           // how long the walking dot takes between stops on screen
const SPRITES = 'assets/sprites/rounds/';

export class RoundsScene extends Phaser.Scene {
  constructor(key, kind, dataKey) {
    super(key);
    this.kind = kind;
    this.dataKey = dataKey;
    this.sprites = [];
  }

  get T() { return game.data[this.dataKey]; }
  get round() { return game.sim.S.rounds; }
  tex(name) { return 'rounds-' + name; }

  preload() {
    preloadMap(this);
    for (const p of [...this.sprites, 'torch-dark']) {
      if (!this.textures.exists(this.tex(p))) this.load.image(this.tex(p), SPRITES + p + '.png');
    }
    if (!this.textures.exists('trap-bin-bag')) this.load.image('trap-bin-bag', 'assets/sprites/trap/bin-bag.png');
    if (!this.textures.exists('trap-catch-bag')) this.load.image('trap-catch-bag', 'assets/sprites/trap/catch-bag.png');
  }

  create() {
    const S = game.sim.S;
    if (S.phase !== 'rounds' || S.rounds.kind !== this.kind) { this.scene.start('map'); return; }
    const { world, places, size } = buildMap(this);
    this.mapSize = size;
    const r = this.round;
    this.place = places.find(p => p.zone === r.zone) ?? places[0];
    this.stops = this.route(this.place, r.stops.length);
    this.routeShapes = this.add.graphics();
    this.stopLabels = this.stops.map((s, i) => this.add.text(s.x, s.y, String(i + 1), TEXT.badge).setOrigin(0.5));
    this.marks = this.stops.map(s => this.add.text(s.x, s.y, '', TEXT.mapLabel).setOrigin(0, 1));
    this.walker = this.add.circle(0, 0, 10, COLOURS.accent).setStrokeStyle(3, 0x1c2420).setVisible(false);
    world.push(this.routeShapes, ...this.stopLabels, ...this.marks, this.walker);
    this.ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.ui.ignore(world);
    this.panels = null;
    this.view = null;
    this.busy = false;             // true while something is sliding about; clicks wait
    this.walking = false;
    this.setup?.();
    this.layout();
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  // Stops along a route over real ground, planned the same way as the trap line's
  // (src/ui/trap-route.js, tuning in data/trapline.js). A new route each visit; the
  // seed comes from the visit, place and kind, so a reload keeps the same one.
  route(p, n) {
    const R = game.data.trapline.route;
    const r = this.round;
    const ground = this.ground ??= terrainCorners(this.cache.tilemap.get('map').data);
    const planned = planRoute({ ground, view: closeUpView(p, this.mapSize, R.closeUp), place: p, n,
      seed: hashSeed(`${r.kind}:${r.zone}:${game.sim.S.v}`), tuning: R });
    if (planned) {
      this.routePath = planned.path;
      this.pointAt = planned.pointAt;
      return planned.stops;
    }
    // No room on the ground (shouldn't happen): a gentle curve through the place.
    this.routePath = null;
    const phase = (p.x + p.y) % 3;      // each place's route bends its own way
    return Array.from({ length: n }, (_, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      return { x: p.x + (t - 0.5) * p.w * SPREAD, y: p.y + Math.sin(t * Math.PI * 1.3 + phase) * p.h * 0.8 };
    });
  }

  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    const side = Math.max(200, Math.min(H, W - SIZES.panelMin));
    const cam = this.cameras.main;
    const top = Math.max(0, (H - side) / 2);
    cam.setViewport(0, top, side, side);
    // Centre on the place, but never show past the map's edge (the same view the route was planned in).
    const view = closeUpView(this.place, this.mapSize, game.data.trapline.route.closeUp);
    const zoom = side / view.w;
    cam.setZoom(zoom);
    cam.centerOn(view.x + view.w / 2, view.y + view.h / 2);
    this.ui.setSize(W, H);
    this.mapArea = { x: 0, y: top, side };
    this.panelArea = { x: side, w: W - side, h: H };
    this.render();
  }

  render() {
    this.drawRoute();
    this.buildView();
    this.buildPanel();
    this.afterRender?.();
  }

  // The stop you are at (0-based); equals the number of stops when finished.
  stopIndex() { return this.round.at; }
  atStop() { return this.round.at < this.round.stops.length && !this.walking; }

  /* ---------- the route on the map ---------- */
  drawRoute() {
    const zoom = this.cameras.main.zoom;
    const r = this.round;
    const g = this.routeShapes.clear();
    g.lineStyle(4 / zoom, 0xfffbea, 0.55);
    const pts = this.routePath ?? this.stops;
    g.beginPath().moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    this.stops.forEach((s, i) => {
      const here = i === r.at && !this.walking && !r.result;
      const w = 36 / zoom;
      const h = 26 / zoom;
      this.marker(g, s.x, s.y, w, h, here, zoom, i);
      this.stopLabels[i].setScale(1 / zoom).setColor(COLOURS.text);
      this.marks[i].setText(r.result ? this.stopMark(i) : '').setScale(1 / zoom).setPosition(s.x + w / 2, s.y - h / 2);
    });
    this.walker.setScale(1 / zoom);
  }

  // A round rounded box for a stop; kinds can draw something else.
  marker(g, x, y, w, h, here, zoom) {
    g.fillStyle(0x3b5a66, 1).lineStyle((here ? 5 : 3) / zoom, here ? COLOURS.accent : 0x1c2420, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4 / zoom).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4 / zoom);
  }

  stopMark() { return ''; }

  /* ---------- the close-up ---------- */
  buildView() {
    this.view?.destroy();
    this.view = null;
    this.tip?.destroy();
    this.tip = null;
    this.clearLayers?.();
    if (!this.atStop()) return;
    const { x: ax, y: ay, side } = this.mapArea;
    const c = this.view = this.add.container(0, 0).setDepth(1);
    this.cameras.main.ignore(c);
    c.add(this.add.rectangle(ax, ay, side, side, this.backdrop ?? 0x0e1512, this.backdropAlpha ?? 0.72).setOrigin(0));
    this.buildStopView(c, { x: ax, y: ay, side }, this.round.stops[this.round.at]);
    this.tip = this.add.text(0, 0, '', TEXT.hint).setDepth(20).setVisible(false);
    this.cameras.main.ignore(this.tip);
  }

  // Make a picture clickable. can(): whether the click would do anything now;
  // text: what the hover tip says; act(): what a click does. area: an
  // optional [x, y, w, h] click area in the picture's own pixels.
  clickable(im, { can = () => true, text, act, area = null, cue = null }) {
    if (area) im.setInteractive({ hitArea: new Phaser.Geom.Rectangle(...area), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    else im.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 20 });
    im.on('pointerover', p => {
      if (this.busy) return;
      const ok = can();
      im.setTint(ok ? 0xfff2c8 : 0xffffff);
      this.showTip(p, typeof text === 'function' ? text(ok) : (ok ? text : null));
    });
    im.on('pointermove', p => this.moveTip(p));
    im.on('pointerout', () => { im.clearTint(); this.showTip(null, null); });
    im.on('pointerdown', () => act());
    if (cue === null ? can() : cue) clickCue(this, im);
    return im;
  }

  // The "what to do" line along the top of a close-up (a dark band with big words), kept in container c.
  banner(c, box, text) {
    const pad = 14;
    const t = this.add.text(box.x + box.side / 2, box.y + 10 + pad, text, {
      ...TEXT.highlight, fontSize: '22px', align: 'center', wordWrap: { width: box.side - 80 },
    }).setOrigin(0.5, 0);
    const h = t.height + pad * 2;
    const bg = this.add.graphics().fillStyle(0x1c2420, 0.92).fillRoundedRect(box.x + 14, box.y + 10, box.side - 28, h, 10)
      .lineStyle(3, COLOURS.accent, 1).strokeRoundedRect(box.x + 14, box.y + 10, box.side - 28, h, 10);
    c.add([bg, t]);
    return h + 10;
  }

  // A calm, breathing outline around a picture: "this is the one to click".
  ring(c, im, pad = 8) {
    const w = im.displayWidth + pad * 2;
    const h = im.displayHeight + pad * 2;
    const g = this.add.graphics().lineStyle(5, COLOURS.accent, 1).strokeRoundedRect(im.x - w / 2, im.y - h / 2, w, h, 14);
    c.add(g);
    this.tweens.add({ targets: g, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return g;
  }

  showTip(p, text) {
    if (!this.tip) return;
    this.tip.setVisible(Boolean(text)).setText(text ?? '');
    if (p) this.moveTip(p);
  }

  moveTip(p) {
    if (!this.tip?.visible) return;
    const x = Math.min(p.x + 18, this.mapArea.side - this.tip.width - 8);
    this.tip.setPosition(Math.max(8, x), Math.min(p.y + 22, this.mapArea.y + this.mapArea.side - this.tip.height - 6));
  }

  // A scale that fits a picture of this size nicely in the map square.
  fit(width, share, max = 1.2) { return Math.min(this.mapArea.side * share / width, max); }

  /* ---------- doing things ---------- */
  doStep(step, arg) {
    if (this.busy) return;
    const sim = game.sim;
    if (!sim.canRoundStep(step, arg)) return;
    this.busy = true;
    this.showTip(null, null);
    const finish = () => {
      sim.roundStep(step, arg);
      game.save();
      this.busy = false;
      this.render();
    };
    if (this.animate) this.animate(step, arg, finish);
    else finish();
  }

  // Walk on to the next stop (or finish the round).
  closeStop() {
    if (this.busy) return;
    const sim = game.sim;
    const r = this.round;
    const from = this.stops[r.at];
    sim.roundStep('close');
    if (r.at >= r.stops.length) {
      sim.finishRounds();
      game.save();
      this.render();
      return;
    }
    game.save();
    this.walk(from, this.stops[r.at]);
  }

  walk(from, to) {
    this.walking = true;
    this.busy = true;
    this.render();
    this.walker.setPosition(from.x, from.y).setVisible(true);
    // Along the route's curve if there is one, otherwise straight across.
    const go = { t: 0 };
    const place = () => {
      const p = this.routePath && from.s !== undefined ? this.pointAt(from.s + (to.s - from.s) * go.t)
        : { x: from.x + (to.x - from.x) * go.t, y: from.y + (to.y - from.y) * go.t };
      this.walker.setPosition(p.x, p.y);
    };
    this.tweens.add({
      targets: go, t: 1, duration: WALK_MS, ease: 'Sine.easeInOut', onUpdate: place,
      onComplete: () => {
        this.walker.setVisible(false);
        this.walking = false;
        this.busy = false;
        this.render();
      },
    });
  }

  /* ---------- the side panel ---------- */
  buildPanel() {
    this.panels?.destroy();
    const c = this.panels = this.add.container(0, 0).setDepth(10);
    this.cameras.main.ignore(c);
    const D = game.data;
    const T = this.T;
    const S = game.sim.S;
    const r = this.round;
    const g = SIZES.gap;
    const x = this.panelArea.x + g;
    const w = this.panelArea.w - 2 * g;
    const wrap = style => ({ ...style, wordWrap: { width: w - 36 } });
    const items = [];
    let y = g + 12;
    const ui = {
      w,
      text: (str, style, after = 8) => {
        const t = this.add.text(x + 18, y, str, wrap(fitTitle(this, str, style, w - 36)));
        items.push(t);
        y += t.height + after;
        return t;
      },
      btn: (label, opts = {}) => {
        const h = opts.height ?? SIZES.buttonHeight;
        items.push(...button(this, x + 12, y, w - 24, label, opts));
        y += h + 6;
      },
      // Buttons side by side, e.g. a row of choices.
      row: (labels, opts = {}) => {
        const h = opts.height ?? SIZES.buttonHeight;
        const bw = (w - 24 - (labels.length - 1) * 8) / labels.length;
        labels.forEach((l, i) => items.push(...button(this, x + 12 + i * (bw + 8), y, bw, l.label, { height: h, center: true, ...l.opts })));
        y += h + 6;
      },
      gap: v => { y += v; },
    };

    ui.text(fill(D, T.ui.title, { zone: r.zone }), TEXT.title, 4);
    ui.text(`${clock(S.time)} · ${fill(D, T.ui.timeUsed, { time: duration(r.minutes) })}`, TEXT.dim, 16);
    if (this.walking) {
      ui.text(fill(D, T.ui.stop, { n: r.at + 1, total: r.stops.length }), TEXT.heading);
      ui.text(fill(D, T.ui.walkNote, { walk: duration(D.rates[this.ratesKey].walkMinutes) }), TEXT.dim);
    } else if (!r.result) {
      ui.text(fill(D, T.ui.stop, { n: r.at + 1, total: r.stops.length }), TEXT.heading);
      this.stopPanel(ui, r.stops[r.at]);
      // "Finish the rest quickly": the rest of the round done the Quick button's way.
      ui.gap(10);
      ui.btn(UI.finishQuick, { height: SIZES.smallButtonHeight, center: true, onClick: () => this.finishQuick() });
      ui.text(UI.finishQuickNote, TEXT.smallFaint);
    } else {
      this.resultPanel(ui, r.result);
    }
    c.add(panel(this, x, g, w, Math.max(y + 6 - g, 200)));
    c.add(items);
  }

  // The "walk on" button, and a note of how long the walk takes.
  walkOn(ui, label, accent = true) {
    const r = this.round;
    ui.btn(`${label} · ${duration(this.T.steps.close.min)}`, { accent, onClick: () => this.closeStop() });
    if (r.at < r.stops.length - 1) {
      ui.text(fill(game.data, this.T.ui.walkNote, { walk: duration(game.data.rates[this.ratesKey].walkMinutes) }), TEXT.smallFaint);
    }
  }

  finishQuick() {
    if (this.busy || !game.sim.finishQuick()) return;
    game.save();
    this.render();
  }

  back() {
    game.sim.closeRounds();
    game.save();
    this.scene.start('map');
  }
}
