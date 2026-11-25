// The possum and rabbit round by torchlight: the same engine as the other
// rounds, but at night. The map and every close-up are dark except for a pool
// of torchlight that follows the mouse. At each trap site, sweep the beam
// around to pick out shining eyes and sign (browsed seedlings, droppings,
// claw marks) and click what you find to note it; then deal with the trap in
// the middle: bag any catch, reset the spring, add fresh lure.
// Rules: src/sim/torchrounds.js. Pictures: tools/rounds_sprites.py.
import { COLOURS, TEXT } from '../ui/styles.js';
import { game } from '../game.js';
import { fill, duration } from '../text.js';
import { button } from '../ui/panel.js';
import { RoundsScene } from './RoundsScene.js';
import { isWorking } from '../sim/torchrounds.js';

const MOVE_MS = 420;           // how long a catch or a dab of lure takes to move on screen
const BEAM = 0.8;             // the dark picture's scale: the clear pool is about 150 px times this
const BEAM_SIZE = 1024;        // the dark picture's size in pixels
const LIT = 150 * BEAM;        // px from the mouse that count as lit
const DARK = 0x060a14;         // the darkness's colour...
const DARK_ALPHA = 242 / 255;  // ...and how thick it is outside the beam
const EYES_SCALE = 1.5;        // eyes are drawn a bit big so they are easy to see and click

export class TorchRoundsScene extends RoundsScene {
  constructor() {
    super('rounds-browse', 'browse', 'torchrounds');
    this.ratesKey = 'torchRounds';
    this.sprites = ['ground-night', 'ptrap-set', 'ptrap-sprung', 'lure', 'lure-tub', 'eyes-possum', 'eyes-rabbit', 'eyes-morepork',
      'sign-nibble', 'sign-rabbit', 'sign-scratch', 'sign-chewed', 'sign-pdung', 'possum', 'rabbit', 'torch-glow'];
    this.backdrop = 0x060a14;
    this.backdropAlpha = 1;
  }

  marker(g, x, y, w, h, here, zoom) {         // a yellow lantern dot
    g.fillStyle(COLOURS.accent, 1).lineStyle((here ? 5 : 3) / zoom, here ? 0xffffff : 0x1c2420, 1);
    g.fillCircle(x, y, 15 / zoom).strokeCircle(x, y, 15 / zoom);
  }

  stopMark(i) {
    return isWorking(this.round.stops[i]) ? '✓' : '–';
  }

  // The darkness and the beam live for the whole scene; they follow the mouse.
  setup() {
    this.lamp = { x: this.scale.width * 0.25, y: this.scale.height * 0.5 };
    this.dark = this.add.graphics().setDepth(5);
    this.beam = this.add.image(0, 0, this.tex('torch-dark')).setScale(BEAM).setDepth(5);
    this.glow = this.add.image(0, 0, this.tex('torch-glow')).setScale(BEAM).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this.cameras.main.ignore([this.dark, this.beam, this.glow]);
    this.items = [];
    this.input.on('pointermove', p => { this.lamp = { x: p.x, y: p.y }; });     // clamped to the map square in updateBeam
    this.hasLamp = false;
    this.introDone = false;
  }

  afterRender() {
    // Until the mouse moves, the beam rests on the middle of the picture.
    if (!this.hasLamp) this.lamp = { x: this.mapArea.x + this.mapArea.side / 2, y: this.mapArea.y + this.mapArea.side * 0.45 };
    this.updateBeam();
  }

  update() {
    if (!this.dark || !this.mapArea) return;
    if (this.input.activePointer.x || this.input.activePointer.y) this.hasLamp = true;
    this.updateBeam();
    if (!this.lampAt) return;
    for (const it of this.items) {
      const lit = Math.hypot(it.im.x - this.lampAt.x, it.im.y - this.lampAt.y) < LIT * 1.1;
      it.im.setAlpha(lit ? 1 : 0.03);
    }
  }

  // Slide the clear pool under the mouse and darken everything else in the map square.
  updateBeam() {
    const { x: ax, y: ay, side } = this.mapArea;
    const x = Phaser.Math.Clamp(this.lamp.x, ax, ax + side);        // the beam rests at the edge when the mouse is over the panel
    const y = Phaser.Math.Clamp(this.lamp.y, ay, ay + side);
    this.lampAt = { x, y };
    const h = BEAM_SIZE * BEAM / 2;
    const ix0 = x - h;
    const iy0 = y - h;
    const ix1 = x + h;
    const iy1 = y + h;
    const cx0 = Math.max(ax, ix0);
    const cy0 = Math.max(ay, iy0);
    const cx1 = Math.min(ax + side, ix1);
    const cy1 = Math.min(ay + side, iy1);
    this.beam.setPosition(x, y).setCrop((cx0 - ix0) / BEAM, (cy0 - iy0) / BEAM, Math.max(0, cx1 - cx0) / BEAM, Math.max(0, cy1 - cy0) / BEAM);
    const gh = 700 * BEAM / 2;                                         // the glow picture is 700 px; crop it to the square too
    const gx0 = Math.max(ax, x - gh);
    const gy0 = Math.max(ay, y - gh);
    this.glow.setPosition(x, y).setCrop((gx0 - (x - gh)) / BEAM, (gy0 - (y - gh)) / BEAM,
      Math.max(0, Math.min(ax + side, x + gh) - gx0) / BEAM, Math.max(0, Math.min(ay + side, y + gh) - gy0) / BEAM);
    const g = this.dark.clear().fillStyle(DARK, DARK_ALPHA);
    const fillRect = (rx, ry, rw, rh) => { if (rw > 0 && rh > 0) g.fillRect(rx, ry, rw, rh); };
    fillRect(ax, ay, side, cy0 - ay);                                  // above the pool
    fillRect(ax, cy1, side, ay + side - cy1);                          // below
    fillRect(ax, cy0, cx0 - ax, cy1 - cy0);                            // left
    fillRect(cx1, cy0, ax + side - cx1, cy1 - cy0);                    // right
  }

  clearLayers() {
    this.layer?.destroy();
    this.layer = null;
    this.items = [];
  }

  buildStopView(c, box, stop) {
    const { x: ax, y: ay, side } = box;
    const T = this.T;
    // The ground: a picture filling the top of the square.
    const gw = side * 0.96;
    const gh = side * 0.76;          // the ground picture is stretched a little to fill the square above the pack
    const gx = ax + (side - gw) / 2;
    const gy = ay;
    const k = gw / 800;
    const ky = gh / 560;
    c.add(this.add.image(gx, gy, this.tex('ground-night')).setOrigin(0).setScale(k, ky).setTint(T.settings[stop.setting ?? 'fern'].tint));
    const layer = this.layer = this.add.container(0, 0).setDepth(6);     // above the darkness: things you have found, and your pack
    this.cameras.main.ignore(layer);
    if (this.round.at === 0 && !this.introDone) this.buildIntro(layer, box);
    const at = f => ({ x: gx + f[0] * gw, y: gy + f[1] * gh });

    // The trap, in the middle at the bottom.
    const tk = k * 1.5;
    const tp = at([T.trap.x, T.trap.y]);
    const has = stop.has;
    const trap = this.add.image(tp.x, tp.y, this.tex(has.set ? 'ptrap-set' : 'ptrap-sprung')).setScale(tk);
    c.add(trap);
    if (has.lure) c.add(this.add.image(tp.x + 30 * tk, tp.y - 6 * tk, this.tex('lure')).setScale(tk * 0.9));
    if (!has.animal && !has.set) {
      this.clickable(trap, {
        text: `${T.steps.set.hint} · ${duration(T.steps.set.min)}`,
        act: () => this.doStep('set'),
        area: [0, 0, trap.width, trap.height],
      });
    }
    if (has.animal) {
      const catchIm = this.add.image(tp.x + 20 * tk, tp.y, this.tex(has.animal)).setScale(tk * 0.95).setOrigin(0.6, 0.5);
      c.add(catchIm);
      this.catchIm = catchIm;
      this.clickable(catchIm, {
        text: `${T.steps.clear.hint} · ${duration(T.steps.clear.min)}`,
        act: () => this.doStep('clear'),
      });
    }

    // Finds in the dark: eyes only show in the beam; sign is dimly there; anything noted stays lit.
    stop.finds.forEach((f, i) => {
      const p = at([f.x, f.y]);
      const def = T.finds[f.kind];
      const eyes = def.kind === 'eyes';
      const target = f.spotted ? layer : c;
      const im = this.add.image(p.x, p.y, this.tex(def.sprite)).setScale(k * def.scale);
      target.add(im);
      if (f.spotted) {
        layer.add(this.add.graphics().lineStyle(4, COLOURS.accent, 1).strokeCircle(p.x, p.y, Math.max(im.displayWidth, im.displayHeight) * 0.55));
        return;
      }
      this.items.push({ im, find: f });
      this.clickable(im, {
        text: `${T.steps.spot.hint} · ${duration(T.steps.spot.min)}`,
        act: () => this.doStep('spot', i),
        area: [0, 0, im.width, im.height],
      });
    });

    // Your pack, along the bottom, in the light of your headlamp.
    const packY = ay + side * 0.88;
    layer.add(this.add.rectangle(ax, ay + side * 0.78, side, side * 0.22, 0x0a1018, 0.9).setOrigin(0));
    const pk = this.fit(130, 0.15, 1);
    const tub = this.add.image(ax + side * 0.28, packY, this.tex('lure-tub')).setScale(pk * 1.15);
    const bag = this.add.image(ax + side * 0.72, packY, 'trap-catch-bag').setScale(pk);
    layer.add([tub, bag,
      this.add.text(tub.x, packY + tub.displayHeight / 2 + 2, T.ui.lureTub, TEXT.smallFaint).setOrigin(0.5, 0),
      this.add.text(bag.x, packY + bag.displayHeight / 2 + 2, T.ui.bag, TEXT.smallFaint).setOrigin(0.5, 0)]);
    this.tubAt = { x: tub.x, y: tub.y };
    this.bagAt = { x: bag.x, y: bag.y };
    this.trapAt = { x: tp.x + 30 * tk, y: tp.y - 6 * tk };
    this.tk = tk;
    if (!has.animal && !has.lure) {
      layer.add(this.add.graphics().lineStyle(5, COLOURS.accent, 1)
        .strokeRoundedRect(tub.x - tub.displayWidth / 2 - 6, tub.y - tub.displayHeight / 2 - 6, tub.displayWidth + 12, tub.displayHeight + 12, 14));
    }
    this.clickable(tub, {
      can: () => game.sim.canRoundStep('lure'),
      text: ok => (ok ? `${T.steps.lure.hint} · ${duration(T.steps.lure.min)}` : (has.animal ? T.ui.noLure : T.ui.freshLure)),
      act: () => this.doStep('lure'),
    });
  }

  // The card that opens the first stop: what the round is for and how to play it.
  buildIntro(layer, box) {
    const T = this.T;
    const { x: ax, y: ay, side } = box;
    const w = side * 0.86;
    const x = ax + (side - w) / 2;
    const blocker = this.add.rectangle(ax, ay, side, side, 0x000000, 0.0).setOrigin(0).setInteractive();
    const title = this.add.text(x + 24, ay + side * 0.14, T.ui.introTitle, { ...TEXT.title });
    const body = this.add.text(x + 24, title.y + title.height + 12, T.ui.intro.join('\n\n'), { ...TEXT.body, fontSize: '22px', wordWrap: { width: w - 48 } });
    const h = title.height + body.height + 24 + 80;
    const bg = this.add.graphics().fillStyle(0x1c2420, 0.97).fillRoundedRect(x, ay + side * 0.14 - 18, w, h, 14)
      .lineStyle(3, COLOURS.accent, 1).strokeRoundedRect(x, ay + side * 0.14 - 18, w, h, 14);
    const btn = button(this, x + 24, body.y + body.height + 18, w - 48, T.ui.introGo, {
      accent: true, center: true, onClick: () => { this.introDone = true; this.render(); },
    });
    layer.add([blocker, bg, title, body, ...btn]);
  }

  animate(step, arg, done) {
    if (step === 'clear' && this.catchIm) {
      this.tweens.add({ targets: this.catchIm, x: this.bagAt.x, y: this.bagAt.y, scale: this.catchIm.scale * 0.35, alpha: 0.2, duration: MOVE_MS, ease: 'Sine.easeInOut', onComplete: done });
    } else if (step === 'lure') {
      const dab = this.add.image(this.tubAt.x, this.tubAt.y, this.tex('lure')).setScale(this.tk * 0.5).setDepth(6);
      this.cameras.main.ignore(dab);
      this.tweens.add({ targets: dab, x: this.trapAt.x, y: this.trapAt.y, scale: this.tk * 0.9, duration: MOVE_MS, ease: 'Sine.easeInOut', onComplete: () => { dab.destroy(); done(); } });
    } else if (step === 'set') {
      this.tweens.add({ targets: this.view, alpha: 0.85, duration: 100, yoyo: true, onComplete: done });
    } else done();
  }

  stopPanel(ui, stop) {
    const D = game.data;
    const T = this.T;
    const found = stop.finds.filter(f => f.spotted);
    ui.text(T.settings[stop.setting ?? 'fern'].text, TEXT.dim, 6);
    ui.text(this.round.at === 0 ? T.ui.purpose : T.ui.goal, TEXT.small, 8);
    ui.text(T.ui.sweep, TEXT.highlight, 8);
    if (stop.finds.length) ui.text(fill(D, T.ui.spotted, { n: found.length, total: stop.finds.length }), TEXT.heading, 6);
    else ui.text(T.ui.nothing, TEXT.dim, 6);
    for (const f of found) ui.text(`• ${T.finds[f.kind].text}`, TEXT.small, 4);
    ui.gap(8);
    const states = stop.state === 'catch' ? T.states.catch.text[stop.animal] : T.states[stop.state].text;
    ui.text(states[stop.text], TEXT.body, 8);
    const h = stop.has;
    const hint = h.animal ? 'clear' : !h.set ? 'set' : !h.lure ? 'lure' : 'done';
    ui.text(T.ui.hint[hint], TEXT.highlight, 12);
    this.walkOn(ui, this.round.at === this.round.stops.length - 1 ? 'Finish the round' : T.steps.close.hint, hint === 'done');
  }

  resultPanel(ui, r) {
    const D = game.data;
    const T = this.T;
    ui.text(T.ui.grade[r.grade], r.grade === 'rough' ? TEXT.body : TEXT.highlight);
    ui.text(fill(D, T.ui.summary, { ...r, time: duration(this.round.minutes) }), TEXT.body);
    ui.text(fill(D, T.ui.effect, r), TEXT.dim);
    this.round.stops.forEach((s, i) => {
      const ok = isWorking(s);
      const what = s.state === 'catch' ? T.ui.stateNames[s.animal] : T.ui.stateNames[s.state];
      const left = ok ? 'working' : s.has.animal ? 'catch' : !s.has.set ? 'sprung' : 'nolure';
      ui.text(`${ok ? '✓' : '–'} ${fill(D, T.ui.recap, { n: i + 1, what, left: T.ui.left[left] })}`, ok ? TEXT.small : TEXT.smallFaint, 2);
    });
    ui.gap(8);
    ui.btn(T.ui.back, { accent: true, center: true, onClick: () => this.back() });
  }
}
