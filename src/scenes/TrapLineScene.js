// The trap line mini-game (build step D): a close-up of one place on the map
// with its traps along a route. Stop at the tracking tunnel, then at each
// trap the box opens up big over the map and you handle it: lift the lid,
// bag any catch, set the jaws, bin the old egg, put in a fresh one, shut the
// lid. The rules are in src/sim/trapline.js; this scene only draws them and
// passes on clicks. Mouse only, no timer: each step just uses a little daylight.
//
// The pictures are drawn by tools/trap_sprites.py.
import { COLOURS, SIZES, TEXT, fitTitle } from '../ui/styles.js';
import { panel, button, clickCue } from '../ui/panel.js';
import { preloadMap, buildMap } from '../ui/map.js';
import { game } from '../game.js';
import { fill, clock, duration } from '../text.js';
import { isWorking, leftAs } from '../sim/trapline.js';
import { terrainCorners, closeUpView, planRoute } from '../ui/trap-route.js';
import { hashSeed } from '../sim/rng.js';
import UI from '../../data/ui-text.js';

const SPREAD = 2.2;            // fallback line length (times the place's width), if no route fits the ground
const WALK_MS = 900;           // how long the walking dot takes between stops on screen
const MOVE_MS = 420;           // how long an egg or a catch takes to slide into or out of a bag
const SPRITES = 'assets/sprites/trap/';
const PICTURES = ['box', 'lid', 'trap-base', 'jaws-open', 'jaws-shut', 'egg-fresh', 'egg-stale',
  'rat', 'stoat', 'ferret', 'catch-bag', 'bin-bag', 'egg-tray'];

// Where things sit in the box picture, measured from its centre (box pixels).
const IN_BOX = { trap: { x: -70, y: 0 }, egg: { x: 240, y: 0 } };
// The shut jaws' click area in their picture's pixels (x, y, width, height).
const JAWS_AREA = [80, 24, 80, 192];
// Each animal's shoulders, as a share of its picture's width: they go under the jaws.
const SHOULDERS = { rat: 0.72, stoat: 0.68, ferret: 0.68 };

export class TrapLineScene extends Phaser.Scene {
  constructor() {
    super('trapline');
  }

  preload() {
    preloadMap(this);
    for (const p of PICTURES) if (!this.textures.exists('trap-' + p)) this.load.image('trap-' + p, SPRITES + p + '.png');
  }

  create() {
    if (game.sim.S.phase !== 'trapline') { this.scene.start('map'); return; }
    const { world, places, size } = buildMap(this);
    this.mapSize = size;
    const line = game.sim.S.trapLine;
    this.place = places.find(p => p.zone === line.zone) ?? places[0];
    this.stops = this.route(this.place, line.traps.length + 1, line);
    this.routeShapes = this.add.graphics();
    this.stopLabels = this.stops.map((s, i) => this.add.text(s.x, s.y, i === 0 ? 'T' : String(i), TEXT.badge).setOrigin(0.5));
    this.marks = this.stops.map(s => this.add.text(s.x, s.y, '', TEXT.mapLabel).setOrigin(0, 1));
    this.walker = this.add.circle(0, 0, 10, COLOURS.accent).setStrokeStyle(3, 0x1c2420).setVisible(false);
    world.push(this.routeShapes, ...this.stopLabels, ...this.marks, this.walker);
    this.ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.ui.ignore(world);
    this.panels = null;
    this.view = null;
    this.busy = false;             // true while something is sliding about; clicks wait
    this.walking = false;
    this.layout();
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  // Stops along a route over real ground (src/ui/trap-route.js): the tunnel first, then the
  // traps. A new route each time the line is walked; the seed is saved, so a reload keeps it.
  route(p, n, line) {
    const R = game.data.trapline.route;
    const ground = this.ground ??= terrainCorners(this.cache.tilemap.get('map').data);
    const planned = planRoute({ ground, view: closeUpView(p, this.mapSize, R.closeUp), place: p, n,
      seed: line.seed ?? hashSeed(line.zone + game.sim.S.v), tuning: R });
    if (planned) {
      this.routePath = planned.path;
      this.pointAt = planned.pointAt;
      return planned.stops;
    }
    // No room on the ground (shouldn't happen): a gentle curve through the place, straight between stops.
    this.routePath = null;
    const phase = (p.x + p.y) % 3;
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
  }

  // 0 = the tunnel, 1..n = traps, n+1 = finished.
  currentStop() {
    const line = game.sim.S.trapLine;
    if (!line.tunnel.read) return 0;
    return line.at + 1;
  }

  atTrap() {
    const line = game.sim.S.trapLine;
    return line.tunnel.read && line.at < line.traps.length && !this.walking;
  }

  // The path, trap boxes, the tunnel, and a mark on each trap once the line's done.
  drawRoute() {
    const zoom = this.cameras.main.zoom;
    const line = game.sim.S.trapLine;
    const stop = this.currentStop();
    const g = this.routeShapes.clear();
    g.lineStyle(4 / zoom, 0xfffbea, 0.55);
    const pts = this.routePath ?? this.stops;
    g.beginPath().moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();
    this.stops.forEach((s, i) => {
      const here = i === stop && !this.walking;
      const w = (i === 0 ? 44 : 34) / zoom;
      const h = 24 / zoom;
      g.fillStyle(i === 0 ? 0x3b5a66 : 0x6b4f33, 1).lineStyle((here ? 5 : 3) / zoom, here ? COLOURS.accent : 0x1c2420, 1);
      g.fillRoundedRect(s.x - w / 2, s.y - h / 2, w, h, 4 / zoom).strokeRoundedRect(s.x - w / 2, s.y - h / 2, w, h, 4 / zoom);
      this.stopLabels[i].setScale(1 / zoom).setColor(COLOURS.text);
      const mark = i > 0 && line.result ? (isWorking(line.traps[i - 1]) ? '✓' : '–') : '';
      this.marks[i].setText(mark).setScale(1 / zoom).setPosition(s.x + w / 2, s.y - h / 2);
    });
    this.walker.setScale(1 / zoom);
  }

  /* ---------- the box, big over the map ---------- */

  buildView() {
    this.view?.destroy();
    this.view = null;
    this.tip?.destroy();
    this.tip = null;
    if (!this.atTrap()) return;
    const { x: ax, y: ay, side } = this.mapArea;
    const c = this.view = this.add.container(0, 0);
    this.cameras.main.ignore(c);
    c.add(this.add.rectangle(ax, ay, side, side, 0x0e1512, 0.72).setOrigin(0));

    const line = game.sim.S.trapLine;
    const t = line.traps[line.at];
    const boxImg = this.textures.get('trap-box').getSourceImage();
    const k = Math.min(side * 0.92 / boxImg.width, 1.2);      // picture scale
    const bx = ax + side / 2;
    const by = ay + side * 0.38;
    this.boxScale = k;
    const at = p => ({ x: bx + p.x * k, y: by + p.y * k });
    const img = (key, p) => this.add.image(p.x, p.y, 'trap-' + key).setScale(k);

    c.add(img('box', { x: bx, y: by }));
    const trapAt = at(IN_BOX.trap);
    const eggAt = at(IN_BOX.egg);
    this.eggAt = eggAt;
    c.add(img('trap-base', trapAt));
    if (t.has.animal) {
      c.add(this.clickable(img(t.has.animal, trapAt).setOrigin(SHOULDERS[t.has.animal], 0.5), 'clear', 'catchBag'));
    }
    // Shut jaws can be set once the trap is empty. The click area is a solid
    // strip around both bars (they're thin, with a gap between them).
    const jaws = img(t.has.set ? 'jaws-open' : 'jaws-shut', trapAt);
    c.add(t.has.set || t.has.animal ? jaws : this.clickable(jaws, 'set', null, JAWS_AREA));
    if (t.has.bait !== 'none') c.add(this.clickable(img(t.has.bait === 'fresh' ? 'egg-fresh' : 'egg-stale', eggAt), 'bin', 'binBag'));

    // Your pack, below the box: the egg tray and two bags.
    const T = game.data.trapline;
    const packY = ay + side * 0.82;
    const pk = Math.min(k * 1.1, 1);
    const pack = (key, x, label) => {
      const im = this.add.image(x, packY, 'trap-' + key).setScale(pk);
      const tx = this.add.text(x, packY + im.displayHeight / 2 + 4, label, TEXT.smallFaint).setOrigin(0.5, 0);
      c.add([im, tx]);
      return im;
    };
    const tray = pack('egg-tray', bx - side * 0.28, T.ui.freshEggs);
    this.trayAt = { x: tray.x, y: tray.y };
    this.catchBag = pack('catch-bag', bx + side * 0.06, T.ui.sacks);
    this.binBag = pack('bin-bag', bx + side * 0.3, T.ui.binBag);
    this.clickable(tray, 'bait');

    // The lid sits on top until you lift it.
    if (!t.opened) {
      const lid = img('lid', { x: bx, y: by });
      const num = this.add.text(bx, by, String(line.at + 1), { ...TEXT.badge, fontSize: Math.round(40 * k) + 'px' }).setOrigin(0.5);
      c.add([lid, num]);
      this.lid = [lid, num];
      this.clickable(lid, 'open');
    }

    this.tip = this.add.text(0, 0, '', TEXT.hint).setDepth(10).setVisible(false);
    this.cameras.main.ignore(this.tip);
  }

  // Make a picture clickable for a step. It brightens and names the step
  // (and its minutes) on hover. bag: where the thing goes when clicked.
  // area: an optional [x, y, w, h] click area instead of the picture's shape.
  clickable(im, step, bag = null, area = null) {
    const T = game.data.trapline;
    if (area) im.setInteractive({ hitArea: new Phaser.Geom.Rectangle(...area), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    else im.setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 20 });
    im.on('pointerover', p => {
      if (this.busy) return;
      const can = game.sim.canStep(step);
      im.setTint(can ? 0xfff2c8 : 0xffffff);
      this.showTip(p, can ? `${T.steps[step].hint} · ${duration(T.steps[step].min)}` : null);
    });
    im.on('pointermove', p => this.moveTip(p));
    im.on('pointerout', () => { im.clearTint(); this.showTip(null, null); });
    im.on('pointerdown', () => this.doStep(step, im, bag));
    if (game.sim.canStep(step)) clickCue(this, im);
    return im;
  }

  showTip(p, text) {
    if (!this.tip) return;
    this.tip.setVisible(Boolean(text)).setText(text ?? '');
    if (p) this.moveTip(p);
  }

  moveTip(p) {
    if (!this.tip?.visible) return;
    const x = Math.min(p.x + 18, this.mapArea.side - this.tip.width - 8);
    this.tip.setPosition(Math.max(8, x), p.y + 22);
  }

  /* ---------- doing things ---------- */

  doStep(step, im, bag) {
    if (this.busy) return;
    const sim = game.sim;
    if (!sim.canStep(step)) return;
    this.busy = true;
    this.showTip(null, null);
    const finish = () => {
      sim.trapStep(step);
      game.save();
      this.busy = false;
      this.render();
    };
    if (step === 'open') {
      this.tweens.add({ targets: this.lid, y: `-=${this.mapArea.side * 0.5}`, alpha: 0, duration: MOVE_MS, ease: 'Cubic.easeIn', onComplete: finish });
    } else if (step === 'clear' || step === 'bin') {
      const to = this[bag];
      this.tweens.add({ targets: im, x: to.x, y: to.y, scale: im.scale * 0.35, alpha: 0.2, duration: MOVE_MS, ease: 'Sine.easeInOut', onComplete: finish });
    } else if (step === 'bait') {
      const egg = this.add.image(this.trayAt.x, this.trayAt.y, 'trap-egg-fresh').setScale(this.boxScale * 0.6);
      this.cameras.main.ignore(egg);
      this.view.add(egg);
      this.tweens.add({ targets: egg, x: this.eggAt.x, y: this.eggAt.y, scale: this.boxScale, duration: MOVE_MS, ease: 'Sine.easeInOut', onComplete: finish });
    } else if (step === 'set') {
      this.tweens.add({ targets: im, scaleX: im.scaleX * 1.25, duration: 120, yoyo: true, onComplete: finish });
    } else finish();
  }

  // Shut the lid and walk on: the dot walks the path to the next stop.
  closeLid() {
    if (this.busy) return;
    const sim = game.sim;
    const line = sim.S.trapLine;
    const from = this.stops[line.at + 1];
    sim.trapStep('close');
    if (line.at >= line.traps.length) {
      sim.finishTrapLine();
      game.save();
      this.render();
      return;
    }
    game.save();
    this.walk(from, this.stops[line.at + 1]);
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
    const c = this.panels = this.add.container(0, 0);
    this.cameras.main.ignore(c);
    const D = game.data;
    const T = D.trapline;
    const S = game.sim.S;
    const line = S.trapLine;
    const g = SIZES.gap;
    const x = this.panelArea.x + g;
    const w = this.panelArea.w - 2 * g;
    const wrap = style => ({ ...style, wordWrap: { width: w - 36 } });
    const items = [];
    let y = g + 12;
    const text = (str, style, after = 8) => {
      const t = this.add.text(x + 18, y, str, wrap(fitTitle(this, str, style, w - 36)));
      items.push(t);
      y += t.height + after;
    };
    const btn = (label, opts) => {
      const h = opts.height ?? SIZES.buttonHeight;
      items.push(...button(this, x + 12, y, w - 24, label, opts));
      y += h + 6;
    };

    // "Finish the rest quickly": the rest of the line done the Quick button's way.
    const quick = () => {
      y += 10;
      btn(UI.finishQuick, { height: SIZES.smallButtonHeight, center: true, onClick: () => this.finishQuick() });
      text(UI.finishQuickNote, TEXT.smallFaint);
    };

    text(fill(D, T.ui.title, { zone: line.zone }), TEXT.title, 4);
    text(`${clock(S.time)} · ${fill(D, T.ui.timeUsed, { time: duration(line.minutes) })}`, TEXT.dim, 16);

    const stop = this.currentStop();
    if (stop === 0) {
      text(T.tunnel.heading, TEXT.heading);
      text(T.tunnel.stoat[line.tunnel.stoat], TEXT.body);
      text(T.tunnel.rat[line.tunnel.rat], TEXT.body, 16);
      btn(`${T.tunnel.action} · ${duration(D.rates.trapLine.tunnelMinutes)}`, { accent: true, onClick: () => this.readTunnel() });
      quick();
    } else if (this.walking) {
      text(fill(D, T.ui.stopTrap, { n: line.at + 1, total: line.traps.length }), TEXT.heading);
      text(fill(D, T.ui.walkNote, { walk: duration(D.rates.trapLine.walkMinutes) }), TEXT.dim);
    } else if (!line.result) {
      const trap = line.traps[line.at];
      text(fill(D, T.ui.stopTrap, { n: line.at + 1, total: line.traps.length }), TEXT.heading);
      if (!trap.opened) {
        text(T.ui.closed, TEXT.body, 16);
      } else {
        const texts = trap.state === 'catch' ? T.states.catch.text[trap.animal] : T.states[trap.state].text;
        text(texts[trap.text], TEXT.body, 12);
        text(T.ui.doNext, TEXT.dim, 16);
        btn(`${T.steps.close.hint} · ${duration(T.steps.close.min)}`, { accent: true, onClick: () => this.closeLid() });
        if (line.at < line.traps.length - 1) text(fill(D, T.ui.walkNote, { walk: duration(D.rates.trapLine.walkMinutes) }), TEXT.smallFaint);
      }
      quick();
    } else {
      const r = line.result;
      text(T.ui.grade[r.grade], r.grade === 'rough' ? TEXT.body : TEXT.highlight);
      text(fill(D, T.ui.summary, { ...r, time: duration(r.minutes) }) + (r.ferret ? ' ' + T.ui.ferret : ''), TEXT.body);
      // What each trap had and how you left it, so the next line goes better.
      line.traps.forEach((t, i) => {
        const what = t.state === 'catch' ? T.ui.stateNames[t.animal] : T.ui.stateNames[t.state];
        const ok = isWorking(t);
        text(`${ok ? '✓' : '–'} ${fill(D, T.ui.trapRecap, { n: i + 1, what, left: T.ui.left[leftAs(t)] })}`, ok ? TEXT.small : TEXT.smallFaint, 2);
      });
      y += 8;
      if (r.overdone) text(T.ui.overdone, TEXT.dim);
      if (line.moveHint) text(T.ui.moveHint, TEXT.dim);
      btn(T.ui.back, { accent: true, center: true, onClick: () => this.back() });
    }
    c.add(panel(this, x, g, w, Math.max(y + 6 - g, 200)));
    c.add(items);
  }

  readTunnel() {
    if (this.busy) return;
    game.sim.readTunnel();
    game.save();
    this.walk(this.stops[0], this.stops[1]);
  }

  finishQuick() {
    if (this.busy || !game.sim.finishQuick()) return;
    game.save();
    this.render();
  }

  back() {
    game.sim.closeTrapLine();
    game.save();
    this.scene.start('map');
  }
}
