// The bait-station round: a close-up of the place with a route of bait
// stations. At each one the station fills the screen: lift the lid, poke the
// pellets for mould, bin bad bait, and tip scoops from the right bag into the
// empty wells. Too few leaves gaps; too many spills and is wasted. Along the
// way: a knocked-over station to stand up, a weta or slug to coax out, a wasp
// nest to flag, and sometimes a live mouse to whack with your boot (click once
// to raise it, again to swing; it may miss the first time). A line along the
// top always says what to do next, and the thing to click is outlined.
// Rules: src/sim/baitrounds.js. Pictures: tools/rounds_sprites.py.
import { COLOURS, TEXT } from '../ui/styles.js';
import { game } from '../game.js';
import { fill, duration } from '../text.js';
import { RoundsScene } from './RoundsScene.js';
import { usable, wrongCount, mouseLeft, todo } from '../sim/baitrounds.js';

const MOVE_MS = 420;           // how long a scoop or the lid takes to move on screen
const WELLS = [[175, 140], [405, 140], [175, 285], [405, 285]];   // well centres in the station picture (8 px margin included below)
const MARGIN = 8;
const CENTRE = [300, 220];     // the box's centre in its picture (580 x 420 plus the margin)
const BOX_Y = 0.405;            // the station's centre, as a share of the square's height
const STRIP_Y = 0.725;          // the row of sign and visitors under the station
const PACK_Y = 0.89;           // the row of bags
const BOOT_MS = 300;           // how long the boot takes to come down
const FX_MS = 650;             // how long a thwack, puff or scarper plays for

export class BaitRoundsScene extends RoundsScene {
  constructor() {
    super('rounds-bait', 'bait', 'baitrounds');
    this.ratesKey = 'baitRounds';
    this.sprites = ['station-box', 'station-lid', 'pellets', 'pellets-mould', 'blocks', 'pellet-spill', 'droppings-rat', 'droppings-mouse',
      'teeth-rat', 'teeth-mouse', 'mouse', 'mouse-flat', 'puff', 'boot', 'weta', 'slug', 'wasp-nest', 'sign-possum', 'bait-bag', 'bait-bag-rat'];
    this.backdropAlpha = 0.97;
    this.windUp = -1;                  // the stop where the boot is raised, or -1
  }

  marker(g, x, y, w, h, here, zoom) {         // a little green box
    g.fillStyle(0x56796a, 1).lineStyle((here ? 5 : 3) / zoom, here ? COLOURS.accent : 0x1c2420, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6 / zoom).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6 / zoom);
  }

  stopMark(i) {
    const s = this.round.stops[i];
    return usable(s) >= game.data.rates.baitRounds.capacity ? '✓' : '–';
  }

  // The thing to do next at this stop (the first in the sim's list), or 'done'.
  goalKey(stop) { return todo(game.sim, stop)[0] ?? 'done'; }

  buildStopView(c, box, stop) {
    const { x: ax, y: ay, side } = box;
    const W = game.data.rates.baitRounds;
    const T = this.T;
    const sim = game.sim;
    const k = this.fit(600, 0.68, 0.95);
    const bx = ax + side / 2;
    const by = ay + side * BOX_Y;
    this.boxScale = k;
    this.boxAt = { x: bx, y: by };
    const at = (x, y) => ({ x: bx + (x + MARGIN - CENTRE[0]) * k, y: by + (y + MARGIN - CENTRE[1]) * k });
    const img = (name, p, s = k) => {
      const im = this.add.image(p.x, p.y, name.startsWith('trap-') ? name : this.tex(name)).setScale(s);
      c.add(im);
      return im;
    };
    const label = (p, str, style = TEXT.smallFaint) => c.add(this.add.text(p.x, p.y, str, style).setOrigin(0.5, 0));
    const goal = this.goalKey(stop);
    const todoList = todo(sim, stop);
    const more = W.capacity - usable(stop);

    // The line along the top: what to do next.
    this.banner(c, box, fill(game.data, T.ui.goal[this.windUp === this.round.at && goal === 'swing' ? 'swingReady' : goal], { more }));

    // The station, with its lid on, or tipped on its side.
    const box0 = stop.tipped ? img('station-box', { x: bx - side * 0.02, y: by + side * 0.02 }).setAngle(-8) : img('station-box', { x: bx, y: by });
    this.boxIm = box0;
    let primary = null;

    // The pack, below: the two bags and the bin bag.
    const packY = ay + side * PACK_Y;
    const pk = this.fit(130, 0.14, 0.95);
    const slots = [-0.3, 0, 0.3].map(f => bx + side * f);
    const bagMouse = img('bait-bag', { x: slots[0], y: packY }, pk);
    const bagRat = img('bait-bag-rat', { x: slots[1], y: packY }, pk);
    const bin = img('trap-bin-bag', { x: slots[2], y: packY }, pk * 1.0);
    this.bagAt = { mouse: { x: bagMouse.x, y: bagMouse.y }, rat: { x: bagRat.x, y: bagRat.y } };
    this.binAt = { x: bin.x, y: bin.y };
    const lblY = packY + bagMouse.displayHeight / 2 + 2;
    label({ x: bagMouse.x, y: lblY }, T.ui.bagMouse);
    label({ x: bagRat.x, y: lblY }, T.ui.bagRat);
    label({ x: bin.x, y: lblY }, T.ui.bin);
    for (const [kind, bag] of [['mouse', bagMouse], ['rat', bagRat]]) {
      this.clickable(bag, {
        can: () => sim.canRoundStep('add', kind),
        text: ok => (ok ? `${T.steps.add.hint}: ${kind === 'rat' ? T.ui.bagRat : T.ui.bagMouse} · ${duration(T.steps.add.min)}`
          : (!stop.opened ? T.ui.closed : !stop.checked ? T.ui.needCheck : (stop.mouldy || wrongCount(stop)) ? T.ui.needBin : T.ui.full)),
        act: () => this.doStep('add', kind),
        cue: goal === 'add',
      });
      if (goal === 'add') this.ring(c, bag, 6);
    }

    // The nest, on the bank beside the station.
    if (stop.nest) {
      const nest = img('wasp-nest', { x: bx + side * 0.36, y: ay + side * STRIP_Y }, k * 0.7);
      c.add(this.add.text(nest.x, nest.y + nest.displayHeight / 2 + 2, T.ui.nestLabel, TEXT.smallFaint).setOrigin(0.5, 0));
      this.clickable(nest, { text: `${T.steps.mark.hint} · ${duration(T.steps.mark.min)}`, act: () => this.doStep('mark') });
      if (goal === 'mark') this.ring(c, nest, 6);
    }

    // Spilled bait on the ground between the station and the pack.
    for (let i = 0; i < Math.min(stop.spilled, 2); i++) {
      img('pellet-spill', { x: bx + side * (i ? 0.3 : -0.33), y: ay + side * (STRIP_Y + 0.03) }, k * 0.55);
    }

    // The mouse: in the station once the lid is up, or on the ground beside it.
    const m = stop.mouse;
    let mouseIm = null;
    const mouseSpot = m?.where === 'by' ? { x: bx - side * 0.36, y: ay + side * STRIP_Y } : at(300, 212);
    this.mouseSpot = mouseSpot;
    if (m && (m.where === 'by' || stop.opened)) {
      if (!m.fate) {
        mouseIm = img('mouse', mouseSpot, k * 0.72).setAngle(m.where === 'by' ? 20 : 70);
        this.mouseIm = mouseIm;
        this.clickable(mouseIm, {
          can: () => sim.canRoundStep('swing'),
          text: () => (this.windUp === this.round.at ? T.mouse.ready : `${T.steps.swing.hint}. Click to raise your boot.`),
          act: () => this.mouseClick(),
        });
        if (this.windUp === this.round.at) {
          const boot = img('boot', { x: mouseSpot.x + side * 0.04, y: mouseSpot.y - side * 0.17 }, k * 0.55).setAngle(-12);
          this.bootIm = boot;
          c.add(this.add.text(boot.x + boot.displayWidth / 2 + 8, boot.y, T.mouse.ready, { ...TEXT.small, backgroundColor: '#1c2420e6', padding: { x: 8, y: 4 }, wordWrap: { width: side * 0.3 } }).setOrigin(0, 0.5));
        } else if (goal === 'swing' || todoList.includes('swing')) this.ring(c, mouseIm, 8);
      } else if (m.fate === 'flat') {
        img('mouse-flat', mouseSpot, k * 0.62).setAngle(m.where === 'by' ? 8 : 0);
      }
    }
    if (this.fx) this.playFx(c, mouseSpot, stop);

    // Tipped over: the lid skewed, muddy possum prints, bait scattered about.
    if (stop.tipped) {
      const lid = img('station-lid', { x: bx + side * 0.13, y: by + side * 0.07 }).setAngle(20);
      img('sign-possum', { x: bx - side * 0.08, y: by + side * 0.26 }, k * 0.6).setAngle(-6);
      img('pellet-spill', { x: bx + side * 0.28, y: by + side * 0.3 }, k * 0.7).setAngle(15);
      img('pellet-spill', { x: bx - side * 0.3, y: by - side * 0.26 }, k * 0.6).setAngle(-20);
      this.lid = [lid, box0];
      for (const im of [lid, box0]) {
        this.clickable(im, { text: `${T.steps.right.hint} · ${duration(T.steps.right.min)}`, act: () => this.doStep('right') });
      }
      return;
    }

    // The lid sits on top until you lift it.
    if (!stop.opened) {
      const lid = img('station-lid', { x: bx, y: by });
      const num = this.add.text(bx, by, String(this.round.at + 1), { ...TEXT.badge, fontSize: Math.round(40 * k) + 'px' }).setOrigin(0.5);
      c.add(num);
      this.lid = [lid, num];
      this.clickable(lid, {
        text: `${T.steps.open.hint} · ${duration(T.steps.open.min)}`,
        act: () => this.doStep('open'),
      });
      if (goal === 'open') this.ring(c, lid, 10);
      return;
    }

    // The wells: pellets or blocks in the first `fill` of them; the rest empty.
    this.heaps = [];
    const showMould = stop.checked && stop.mouldy;
    const old = stop.fill - (stop.added?.length ?? 0);
    const binnable = [];
    for (let i = 0; i < stop.fill; i++) {
      const kind = i < old ? 'old' : stop.added[i - old];
      const wrong = stop.eater && kind !== 'old' && kind !== stop.eater;
      const heap = img(showMould ? 'pellets-mould' : kind === 'rat' ? 'blocks' : 'pellets', at(...WELLS[i]), k * 1.0);
      this.heaps.push(heap);
      const action = stop.checked ? 'bin' : 'check';
      if (!stop.checked || showMould || wrong) {
        binnable.push(heap);
        this.clickable(heap, {
          can: () => sim.canRoundStep(action),
          text: ok => (ok ? (wrong ? T.ui.wrongHover : T.steps[action].hint) : null),
          act: () => this.doStep(action),
        });
      }
    }
    this.binHeaps = binnable.length && stop.checked && !showMould ? binnable : this.heaps;
    if ((goal === 'check' || goal === 'bin') && binnable.length) binnable.forEach(h => this.ring(c, h, 4));

    // Evidence in the strip below: teeth marks and droppings tell you what has been eating.
    if (stop.eater) {
      const card = (x, name, scale, str) => {
        const cy = ay + side * STRIP_Y;
        c.add(this.add.graphics().fillStyle(0xcfc3a0, 1).lineStyle(3, 0x1c2420, 1)
          .fillRoundedRect(x - 70, cy - 42, 140, 84, 10).strokeRoundedRect(x - 70, cy - 42, 140, 84, 10));
        img(name, { x, y: cy }, scale);
        label({ x, y: cy + 44 }, str);
      };
      card(bx - side * 0.13, 'teeth-' + stop.eater, 0.8, T.ui.signTeeth);
      card(bx + side * 0.1, 'droppings-' + stop.eater, 1.5, T.ui.signDroppings);
    }

    // A visitor in the corner.
    if (stop.guest) {
      const g = img(stop.guest, at(300, 372), k * (stop.guest === 'weta' ? 0.62 : 0.6));
      this.guestIm = g;
      this.clickable(g, { text: `${T.steps.shoo.hint} · ${duration(T.steps.shoo.min)}`, act: () => this.doStep('shoo') });
      if (goal === 'shoo') this.ring(c, g, 6);
    }
  }

  /* ---------- the boot ---------- */
  mouseClick() {
    if (this.busy) return;
    if (this.windUp !== this.round.at) {
      this.windUp = this.round.at;
      this.render();
    } else this.doStep('swing');
  }

  // Plays once after a swing: the thwack text, and then what became of the mouse.
  playFx(c, spot, stop) {
    const fx = this.fx;
    this.fx = null;
    this.busy = true;
    const k = this.boxScale;
    const pop = (str, x, y, colour) => {
      x = Math.max(this.mapArea.x + 110, x);
      const t = this.add.text(x, y, str, { ...TEXT.title, fontSize: '40px', fontStyle: 'bold', color: colour, stroke: '#1c2420', strokeThickness: 7 }).setOrigin(0.5).setDepth(30);
      c.add(t);
      this.tweens.add({ targets: t, y: y - 50, scale: { from: 0.6, to: 1.25 }, alpha: { from: 1, to: 0 }, duration: FX_MS + 200, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    };
    const free = () => this.time.delayedCall(FX_MS, () => { this.busy = false; });
    if (fx.miss) {
      pop(Phaser.Utils.Array.GetRandom(['Whiff!', 'Oops!', 'Missed!']), fx.x, fx.y - 80, '#e8e0c0');
      if (this.mouseIm) this.tweens.add({ targets: this.mouseIm, y: this.mouseIm.y - 18, yoyo: true, duration: 180, ease: 'Sine.easeOut' });
      const boot = this.add.image(fx.bootX, fx.bootY, this.tex('boot')).setScale(k * 0.46).setAngle(-12);
      c.add(boot);
      this.tweens.add({ targets: boot, alpha: 0, delay: 250, duration: 400, onComplete: () => boot.destroy() });
      free();
      return;
    }
    pop('THWACK!', spot.x, spot.y - 70, '#f4d27a');
    const fate = stop.mouse?.fate;
    if (fate === 'puff') {
      const p = this.add.image(spot.x, spot.y, this.tex('puff')).setScale(k * 0.3);
      c.add(p);
      this.tweens.add({ targets: p, scale: k * 0.9, alpha: 0, duration: FX_MS, ease: 'Cubic.easeOut', onComplete: () => p.destroy() });
    } else if (fate === 'scarper') {
      const mm = this.add.image(spot.x, spot.y, this.tex('mouse')).setScale(k * 0.72).setAngle(fx.where === 'by' ? 20 : 70);
      c.add(mm);
      const dx = fx.where === 'by' ? -this.mapArea.side * 0.5 : this.mapArea.side * 0.6;
      this.tweens.add({ targets: mm, x: mm.x + dx, duration: FX_MS, ease: 'Cubic.easeIn', onComplete: () => mm.destroy() });
      this.tweens.add({ targets: mm, y: mm.y - 12, yoyo: true, repeat: 3, duration: 80 });
    } else if (fate === 'flat') {
      const flat = this.children.list.find(o => o.texture?.key === this.tex('mouse-flat') && o.visible);
      if (flat) this.tweens.add({ targets: flat, scaleX: { from: flat.scaleX * 1.3, to: flat.scaleX }, scaleY: { from: flat.scaleY * 0.5, to: flat.scaleY }, duration: 300, ease: 'Bounce.easeOut' });
    }
    free();
  }

  animate(step, arg, done) {
    const side = this.mapArea.side;
    const stop = this.round.stops[this.round.at];
    const k = this.boxScale;
    if (step === 'open') {
      this.tweens.add({ targets: this.lid, y: `-=${side * 0.5}`, alpha: 0, duration: MOVE_MS, ease: 'Cubic.easeIn', onComplete: done });
    } else if (step === 'right') {
      const t = this.boxAt;
      const [lid, box] = this.lid;
      this.tweens.add({ targets: box, angle: 0, x: t.x, y: t.y, duration: MOVE_MS, ease: 'Back.easeOut' });
      this.tweens.add({ targets: lid, angle: 0, x: t.x, y: t.y, duration: MOVE_MS, ease: 'Back.easeOut', onComplete: done });
    } else if (step === 'swing') {
      const m = stop.mouse;
      const miss = m.swings + 1 < m.need;
      const spot = this.mouseSpot;
      const target = miss ? { x: spot.x + side * 0.1, y: spot.y + side * 0.02 } : spot;
      this.windUp = -1;
      this.fx = { miss, x: target.x, y: target.y, bootX: target.x, bootY: target.y, where: m.where };
      const boot = this.bootIm;
      if (!boot) { done(); return; }
      this.tweens.add({
        targets: boot, x: target.x, y: target.y, angle: 0, scale: k * 0.46, duration: BOOT_MS, ease: 'Cubic.easeIn',
        onComplete: () => { boot.destroy(); done(); },
      });
    } else if (step === 'shoo') {
      const g = this.guestIm;
      this.tweens.add({ targets: g, x: g.x + side * 0.6, alpha: 0, duration: MOVE_MS * 1.4, ease: 'Cubic.easeIn', onComplete: done });
    } else if (step === 'mark') {
      done();
    } else if (step === 'bin') {
      const hs = this.binHeaps ?? [];
      const n = hs.length;
      hs.forEach((h, i) => this.tweens.add({
        targets: h, x: this.binAt.x, y: this.binAt.y, scale: h.scale * 0.3, alpha: 0.2, duration: MOVE_MS, ease: 'Sine.easeInOut',
        onComplete: i === n - 1 ? done : undefined,
      }));
      if (!n) done();
    } else if (step === 'add') {
      const W = game.data.rates.baitRounds;
      const slot = stop.fill < W.capacity ? WELLS[stop.fill] : null;
      const bx = this.boxAt.x;
      const by = this.boxAt.y;
      const spillX = bx + side * (stop.spilled ? 0.3 : -0.33);
      const to = slot ? { x: bx + (slot[0] + MARGIN - CENTRE[0]) * k, y: by + (slot[1] + MARGIN - CENTRE[1]) * k }
        : { x: spillX, y: this.mapArea.y + side * (STRIP_Y + 0.03) };
      const from = this.bagAt[arg ?? 'mouse'];
      const scoop = this.add.image(from.x, from.y, this.tex(arg === 'rat' ? 'blocks' : 'pellets')).setScale(k * 0.35);
      this.cameras.main.ignore(scoop);
      this.view.add(scoop);
      this.tweens.add({ targets: scoop, x: to.x, y: to.y, scale: k * 1.0, duration: MOVE_MS, ease: 'Sine.easeInOut', onComplete: done });
    } else done();
  }

  stopPanel(ui, stop) {
    const D = game.data;
    const T = this.T;
    const W = D.rates.baitRounds;
    const sim = game.sim;
    ui.text(T.ui.purpose, TEXT.dim, 10);
    const list = todo(sim, stop);
    const goal = list[0] ?? 'done';
    const goalKey = this.windUp === this.round.at && goal === 'swing' ? 'swingReady' : goal;
    const have = usable(stop);
    // What to look for, then what to do.
    ui.text(`Look for: ${T.ui.look[goal]}`, TEXT.small, 4);
    ui.text(`Do: ${fill(D, T.ui.goal[goalKey], { more: W.capacity - have })}`, TEXT.highlight, 10);
    const rest = list.slice(1).filter(g => T.ui.extra[g]);
    if (rest.length) ui.text(fill(D, T.ui.extras, { list: rest.map(g => T.ui.extra[g]).join(', ') }), TEXT.dim, 10);
    if (stop.tipped) {
      ui.text(T.tipped[stop.text % T.tipped.length], TEXT.body, 8);
    } else if (stop.opened) {
      ui.text(T.take[stop.take][stop.text], TEXT.body, 8);
      if (stop.eater) {
        ui.text(T.droppings[stop.eater], TEXT.dim, 4);
        ui.text(T.teeth[stop.eater], TEXT.dim, 6);
      }
      if (stop.checked && stop.take !== 'all') {
        ui.text(stop.wasMouldy ? T.checked.mouldy : T.checked.clean, stop.wasMouldy ? TEXT.highlight : TEXT.dim, 6);
      }
      if (stop.guest) ui.text(T.guests[stop.guest], TEXT.dim, 6);
      ui.text(fill(D, T.ui.wells, { fill: have, cap: W.capacity }), TEXT.heading, 6);
      if (wrongCount(stop)) ui.text(fill(D, T.ui.wrongBait, { eater: stop.eater }), TEXT.highlight, 6);
      if (stop.spilled) ui.text(fill(D, T.ui.spilled, { n: stop.spilled, s: stop.spilled === 1 ? '' : 's' }), TEXT.dim, 6);
    }
    const m = stop.mouse;
    if (m && !m.fate && (m.where === 'by' || stop.opened)) ui.text(T.mouse[m.where], TEXT.dim, 6);
    if (m?.fate) ui.text(T.mouse.fate[m.fate], TEXT.dim, 6);
    else if (m && m.swings > 0) ui.text(T.mouse.miss[0], TEXT.dim, 6);
    if (stop.nest) ui.text(T.nest, TEXT.dim, 6);
    ui.gap(4);
    this.walkOn(ui, T.steps.close.hint, goal === 'done');
  }

  resultPanel(ui, r) {
    const D = game.data;
    const T = this.T;
    const W = D.rates.baitRounds;
    ui.text(T.ui.grade[r.grade], r.grade === 'rough' ? TEXT.body : TEXT.highlight);
    ui.text(fill(D, T.ui.summary, {
      pct: Math.round(100 * r.share) + '%', taken: T.ui.taken[r.taken],
      wasted: r.waste ? fill(D, T.ui.wasteLine, { n: r.waste, s: r.waste === 1 ? '' : 's' }) : T.ui.noWaste,
      time: duration(this.round.minutes),
    }), TEXT.body);
    ui.text(fill(D, T.ui.extrasLine, { mice: r.mice ?? 0, loose: r.loose ?? 0 }), TEXT.dim);
    this.round.stops.forEach((s, i) => {
      const was = s.wasMouldy ? 'mouldy' : s.take;
      const wrong = wrongCount(s) > 0;
      const left = s.mouldy ? 'mouldy' : wrong ? 'wrong' : s.fill < W.capacity ? 'low' : s.spilled ? 'spill' : 'full';
      ui.text(`${left === 'full' || left === 'spill' ? '✓' : '–'} ${fill(D, T.ui.recap, { n: i + 1, what: T.ui.whatIs[was], left: T.ui.left[left] })}`,
        left === 'full' || left === 'spill' ? TEXT.small : TEXT.smallFaint, 2);
    });
    ui.gap(8);
    ui.btn(T.ui.back, { accent: true, center: true, onClick: () => this.back() });
  }
}
