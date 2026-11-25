// The dusk count (build step F): watch and spot. A fixed view from the
// hillside over the landing beach while the light goes, compressed into a
// couple of minutes. Penguins come out of the surf at the times the
// simulation chose (src/sim/count.js) and waddle up into the bush; click
// each one to tally it, and read its leg band if the light and distance let
// you. Kororā, shags, kelp and one very convincing rock are there to fool
// you, gently. Someone sits beside you and says things now and then.
//
// At the end you see your tally against who was really ashore, and the
// simulation remembers which birds you identified (sim.endCount(result)).
// No timer is shown: the fading light is the only clock. Skip ends early.
//
// Pieces: count/view.js draws the sky, sea and land; count/actors.js moves
// the birds and things; the pictures come from tools/count_art.py.
import { COLOURS, TEXT } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { game } from '../game.js';
import { describe, fill } from '../text.js';
import { makeRng, random } from '../sim/rng.js';
import { CountView, ART, LAYERS } from './count/view.js';
import { Bird, Thing, Flyer, Sandflies } from './count/actors.js';
import { countSummary } from '../count-summary.js';
import { lookClarity, speedOf, askState } from '../sim/count.js';

const SPRITES = ['hoiho-0', 'hoiho-1', 'hoiho-stand', 'hoiho-front', 'korora-0', 'korora-1', 'shag', 'shag-fly-0',
  'shag-fly-1', 'titi-0', 'titi-1', 'gull', 'gull-fly-0', 'gull-fly-1', 'sealion', 'sealion-up', 'furseal', 'rock',
  'kelp', 'cloud-0', 'cloud-1', 'cloud-2'];
const FONT = TEXT.body.fontFamily;
const CARD = 0x141c18;            // name cards and captions: a dark see-through backing
const GAP = 16;                   // px between the screen edge and the scene's words

export class CountScene extends Phaser.Scene {
  constructor() {
    super('count');
  }

  preload() {
    for (const k of [...LAYERS, ...SPRITES]) {
      if (!this.textures.exists('cnt-' + k)) this.load.image('cnt-' + k, ART + k + '.png');
    }
    if (!this.cache.json.exists('cnt-layout')) this.load.json('cnt-layout', ART + 'layout.json');
  }

  create() {
    const sim = game.sim;
    if (sim.S.phase === 'day') { sim.toHillside(); game.save(); }
    if (sim.S.phase !== 'count') { this.scene.start('map'); return; }
    const S = sim.S;
    const c = S.count;
    // Dev switches (dev/count.html): ?weather=rain to change the weather,
    // ?evening=0.6 to start with that share of the evening already gone.
    const params = new URLSearchParams(location.search);
    if (game.data.countScene.weather[params.get('weather')]) S.weather = params.get('weather');
    this.D = game.data.countScene;
    this.T = this.D.text;
    this.layout = this.cache.json.get('cnt-layout');
    this.rng = makeRng(c.seed ?? S.v);        // older saves have no seed: any steady number will do
    this.cameras.main.setBackgroundColor(0x0e1424);

    // The stage: everything in the view, scaled to fill the screen.
    this.stage = this.add.container(0, 0);
    this.back = this.add.container(0, 0);
    this.actors = this.add.container(0, 0);
    this.front = this.add.container(0, 0);
    this.stage.add([this.back, this.actors, this.front]);
    // Leg bands live in their own layer (same place and size as the stage) that only the
    // binoculars camera draws: the plain view is too far off to see them.
    this.bands = this.add.container(0, 0).setDepth(1);
    this.view = new CountView(this, this.back, this.front, this.layout, this.D, S.weather, this.rng);
    this.ctx = { view: this.view, layout: this.layout, D: this.D, rng: this.rng, container: this.actors,
      front: this.front, bands: this.bands };

    // The evening's timeline, in minutes after midnight. The light is
    // measured from the end of the working day, so arriving late starts darker.
    const lines = c.lines;
    const lastT = Math.max(...lines.map(l => l.t));
    this.dayEnd = S.workEnd;
    this.minute = lines[0].t;
    this.end = Math.max(lastT + this.D.tailMinutes, this.dayEnd + (lastT - this.dayEnd) / this.D.lastLandingAt);
    this.timeline = lines.map(l => ({ l, fired: false }));
    const skipTo = Number(params.get('evening'));
    if (skipTo > 0) {
      this.minute = Math.max(this.minute, this.dayEnd + skipTo * (this.end - this.dayEnd));
      for (const e of this.timeline.slice(1)) if (e.l.t < this.minute) e.fired = true;
    }
    this.clock = 0;                // real seconds since the scene began
    this.later = [];               // [{ at, fn }]: small things scheduled in real seconds
    this.birds = [];
    this.things = [];
    this.flyers = [];
    // counted: hoiho ids you tallied; identified: those whose band you read;
    // fooled: look-alikes you tallied because the light and distance hid what they were.
    this.tally = { counted: new Set(), identified: new Set(), fooled: new Set() };
    this.binos = false;
    this.overHud = 0;                // how many HUD buttons the mouse is over (the lens steps aside)
    this.hinted = false;
    this.finished = false;
    this.summary = null;

    // What's there when you arrive: the rock, maybe a sea lion, maybe a shag.
    const L = this.layout;
    this.things.push(new Thing(this, this.ctx, { kind: 'rock', key: 'cnt-rock', x: L.rock[0], y: L.rock[1], scale: 0.62 * this.D.lookalikeSize, rock: true }));
    if (S.sealion) this.things.push(new Thing(this, this.ctx, { kind: 'sealion', key: 'cnt-sealion', x: L.sealion[0], y: L.sealion[1], scale: 1.1 }));
    if (this.chance(this.D.shagStays)) {
      const shag = new Thing(this, this.ctx, { kind: 'shag', key: 'cnt-shag', x: L.shagRock[0], y: L.shagRock[1], scale: 0.62 * this.D.lookalikeSize });
      this.things.push(shag);
      this.after(this.seconds() * (0.3 + 0.4 * this.r()), () => {
        if (shag.done) return;
        shag.leave(0.3);
        this.flyers.push(new Flyer(this, this.ctx, { key: 'cnt-shag-fly', from: [shag.x, shag.y - 30], to: [-120, 300], seconds: 8, scale: 0.55 }));
      });
    }
    for (let i = 0; i < this.D.extraShags; i++) {
      if (this.chance(0.6)) this.after(this.seconds() * (0.1 + 0.8 * this.r()), () => this.shagFlies());
    }
    this.sandflies = new Sandflies(this, this.ctx, this.D.sandflies);

    this.dim = this.add.rectangle(0, 0, 10, 10, 0x05080a, 1).setOrigin(0).setDepth(5).setAlpha(0);
    this.ui = this.add.container(0, 0).setDepth(10);
    this.makeLens();
    this.labels = [];
    this.caption = null;
    this.talk = null;              // the companion's current line, if any
    this.talkQueue = [];
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p, over) => {
      if (p.rightButtonDown()) { this.setBinos(!this.binos); return; }
      if (over.length) return;                     // a button or card took the click
      const q = this.toStage(p.x, p.y);
      this.sandflies.flick(q);
      const o = this.pick(q.x, q.y);
      if (o) this.clicked(o);
    });
    // Tonight's question (data/count-asks.js): your companion asks it once you've settled in.
    if (c.ask) {
      const kind = game.data.countAsks.kinds.find(k => k.k === c.ask.k);
      this.after(2, () => this.say(fill(game.data, kind.ask, c.ask)));
    }
    this.fit();
    const onResize = () => this.fit();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => {
      this.scale.off('resize', onResize);
      this.input.setDefaultCursor('default');
    });
  }

  r() { return random(this.rng); }
  chance(p) { return this.r() < p; }
  after(seconds, fn) { this.later.push({ at: this.clock + seconds, fn }); }
  seconds() { return this.D.seconds; }
  // The speed you chose (data/count-scene.js speeds); older saves' "long count" means slow.
  speed() { const S = game.sim.S; return speedOf(this.D, S.countSpeed, S.longCount); }
  // Share of the evening gone, for the light (0 to 1).
  evening() { return Math.max(0, Math.min(1, (this.minute - this.dayEnd) / (this.end - this.dayEnd))); }

  /* ---------- fitting the view to the screen ---------- */
  fit() {
    const W = this.scale.width;
    const H = this.scale.height;
    const [w, h] = this.layout.size;
    const z = this.zoom = Math.max(W / w, H / h);
    // Fill the screen; if something has to be cut off, it's the top of the sky.
    this.stage.setScale(z).setPosition((W - w * z) / 2, H - h * z);
    this.bands.setScale(z).setPosition(this.stage.x, this.stage.y);
    this.dim.setSize(W, H);
    this.uiCam.setSize(W, H);
    this.drawHud();
  }

  toStage(x, y) { return { x: (x - this.stage.x) / this.zoom, y: (y - this.stage.y) / this.zoom }; }
  toScreen(x, y) { return { x: this.stage.x + x * this.zoom, y: this.stage.y + y * this.zoom }; }

  /* ---------- the words on screen ---------- */
  drawHud() {
    this.hud?.forEach(o => o.destroy());
    const W = this.scale.width;
    const T = this.T;
    const objs = [];
    const head = this.add.text(GAP + 14, GAP + 10, T.heading, TEXT.heading);
    objs.push(this.backing(head, 0.6), head);
    this.tallyText = this.add.text(0, GAP + 8, '', TEXT.title);
    this.tallyBack = this.add.graphics();
    objs.push(this.tallyBack, this.tallyText);
    this.overHud = 0;
    const bw = 310;
    const bx = W - GAP - bw;
    const by = GAP + 64;
    const hover = on => { this.overHud = Math.max(0, this.overHud + (on ? 1 : -1)); };
    if (!this.summary) {
      // Binoculars: the big one. Right-click does the same.
      objs.push(...button(this, bx, by, bw, this.binos ? T.binosDown : T.binosUp, {
        center: true, accent: !this.binos, selected: this.binos, height: 60, onClick: () => this.setBinos(!this.binos), onHover: hover,
      }));
      // Speed: three buttons in a row under a small heading, the chosen one outlined.
      const sy = by + 70;
      const label = this.add.text(bx, sy, T.speedHeading, TEXT.small);
      objs.push(this.backing(label, 0.6, 8), label);
      const gap = 6;
      const sw = (bw - gap * 2) / 3;
      const now = this.speed().key;
      this.D.speeds.forEach((sp, i) => {
        objs.push(...button(this, bx + i * (sw + gap), sy + 32, sw, sp.label, {
          center: true, selected: sp.key === now, height: 46, onClick: () => this.setSpeed(sp.key), onHover: hover,
        }));
      });
      objs.push(...button(this, bx, by + 70 + 32 + 46 + 14, bw, T.skip, { center: true, onClick: () => this.showSummary(), onHover: hover }));
      this.askBox = { x: bx, y: by + 70 + 32 + 46 + 14 + 46 + 14, w: bw };
      if (this.binos) {
        const hint = this.add.text(W / 2, GAP + 6, T.binosHint, { ...TEXT.body, align: 'center' }).setOrigin(0.5, 0);
        objs.push(this.backing({ x: hint.x - hint.width / 2, y: hint.y, width: hint.width, height: hint.height }, 0.6), hint);
      }
    }
    for (const o of objs) this.ui.add(o);
    this.hud = objs;
    this.updateTally();
    this.placeCaption();
    if (this.talk) this.showTalk(this.talk.i, this.talk.stage);
    if (this.summary) this.showSummary(true);
  }

  // A dark rounded backing behind a text, so it reads over sky or sea.
  backing(text, alpha = 0.72, pad = 10) {
    return this.add.graphics().fillStyle(CARD, alpha)
      .fillRoundedRect(text.x - pad, text.y - pad * 0.6, text.width + pad * 2, text.height + pad * 1.2, 10);
  }

  updateTally() {
    this.drawAsk();
    if (!this.tallyText?.active) return;
    const W = this.scale.width;
    this.tallyText.setText(fill(game.data, this.T.tally, { n: this.tally.counted.size + this.tally.fooled.size }));
    this.tallyText.setX(W - GAP - 14 - this.tallyText.width);
    this.tallyBack.clear().fillStyle(CARD, 0.6).fillRoundedRect(this.tallyText.x - 14, GAP, this.tallyText.width + 28, 50, 10);
  }

  // The card with tonight's question, under the buttons; ticks over to "Done" as soon as it's answered.
  drawAsk() {
    this.askObjs?.forEach(o => o.destroy());
    this.askObjs = null;
    const ask = game.sim.S.count?.ask;
    if (!ask || this.summary || !this.askBox) return;
    const A = game.data.countAsks;
    const kind = A.kinds.find(k => k.k === ask.k);
    const state = askState(ask, this.result());
    const { x, y, w } = this.askBox;
    const head = this.add.text(x + 14, y + 10, A.heading, { ...TEXT.smallAccent, fontStyle: 'bold' });
    const right = state === 'met' ? `${A.met} ✓` : state === 'missed' ? A.missed : A.notYet;
    const mark = this.add.text(x + w - 14, y + 10, right, {
      ...TEXT.small, color: state === 'met' ? '#9ed8a0' : COLOURS.textFaint, fontStyle: state === 'met' ? 'bold' : 'normal',
    }).setOrigin(1, 0);
    const body = this.add.text(x + 14, y + 36, fill(game.data, kind.card, ask), { ...TEXT.small, wordWrap: { width: w - 28 } });
    const h = 36 + body.height + 12;
    const bg = this.add.graphics().fillStyle(CARD, 0.78).fillRoundedRect(x, y, w, h, 10);
    if (state === 'met') bg.lineStyle(3, 0x7cc47f, 1).strokeRoundedRect(x, y, w, h, 10);
    this.askObjs = [bg, head, mark, body];
    this.ui.add(this.askObjs);
  }

  setSpeed(key) {
    const S = game.sim.S;
    S.countSpeed = key;              // a viewing preference, kept with the save; the count itself doesn't change
    delete S.longCount;
    game.save();
    this.drawHud();
  }

  // A line about what's happening around you, under the heading.
  say(text) {
    this.caption = { text, until: this.clock + this.D.captionSeconds };
    this.placeCaption();
  }

  placeCaption() {
    this.captionObjs?.forEach(o => o.destroy());
    this.captionObjs = null;
    if (!this.caption) return;
    const W = this.scale.width;
    const t = this.add.text(GAP + 14, GAP + 70, this.caption.text,
      { ...TEXT.body, fontStyle: 'italic', wordWrap: { width: Math.min(560, W - 300) } });
    const b = this.backing(t, 0.66);
    this.captionObjs = [b, t];
    this.ui.add(this.captionObjs);
  }

  /* ---------- the evening going by ---------- */
  update(time, delta) {
    if (!this.view) return;
    // Real time since the last frame (Phaser's own delta is smoothed, which
    // runs slow when frames are few), at most a quarter of a second.
    const now = performance.now();
    const real = Math.min(0.25, Math.max(0, (now - (this.lastFrame ?? now)) / 1000));
    const dt = real * this.speed().pace;      // the speed you chose: birds, light and words all run at this pace
    this.frames = (this.frames ?? 0) + 1;
    this.lastFrame = now;
    this.clock += dt;
    if (!this.summary) this.minute += dt * (this.end - this.dayEnd) / this.seconds();
    const f = this.evening();
    this.view.update(dt, f);
    const light = this.view.light;
    for (const e of this.timeline) {
      if (!e.fired && e.l.t <= this.minute && !this.summary) { e.fired = true; this.fire(e.l); }
    }
    const due = this.later.filter(x => x.at <= this.clock);
    this.later = this.later.filter(x => x.at > this.clock);
    for (const x of due) x.fn();
    for (const list of [this.birds, this.things, this.flyers]) {
      for (const o of list) o.update(dt, light);
      for (const o of list.filter(o => o.done)) { this.leaving(o); o.destroy(); }
    }
    this.birds = this.birds.filter(o => !o.done);
    this.things = this.things.filter(o => !o.done);
    this.flyers = this.flyers.filter(o => !o.done);
    this.sandflies.update(dt, light);
    this.actors.sort('depth');
    this.updateHover();
    this.updateLens(real);
    this.updateLabels();
    if (!this.hinted && !this.binosTried && this.clock > this.D.hintAfter && !this.summary) {
      this.hinted = true;
      this.say(this.T.hint);
    }
    if (this.caption && this.clock > this.caption.until) {
      const a = Math.max(0, 1 - (this.clock - this.caption.until));
      this.captionObjs?.forEach(o => o.setAlpha(a));
      if (a <= 0) { this.caption = null; this.placeCaption(); }
    }
    if (this.talk && this.clock > this.talk.until) this.endTalk();
    if (!this.summary && this.minute >= this.end && !this.birds.length) this.showSummary();
  }

  fire(l) {
    const L = this.layout;
    const D = game.data;
    switch (l.k) {
      case 'ashore':
        this.birds.push(new Bird(this, this.ctx, { kind: 'hoiho', line: l, x: this.landingX() }));
        break;
      case 'korora':
        this.birds.push(new Bird(this, this.ctx, { kind: 'korora', x: this.landingX() }));
        break;
      case 'talk':
        this.talkQueue.push(l.i);
        if (!this.talk) this.nextTalk();
        break;
      case 'sandflies':
        this.say(describe(D, l));
        this.sandflies.start();
        break;
      case 'titi':
        this.say(describe(D, l));
        for (let i = 0; i < this.D.titiFlock; i++) {
          const y = 120 + this.r() * 160;
          this.after(i * 0.35 + this.r() * 0.6, () => this.flyers.push(new Flyer(this, this.ctx, {
            key: 'cnt-titi', from: [1680, y], to: [-100, y + 60 + this.r() * 60], seconds: 9 + this.r() * 4,
            scale: 0.35 + this.r() * 0.2, flap: 0.12,
          })));
        }
        break;
      case 'furseal':
        this.say(describe(D, l));
        this.things.push(new Thing(this, this.ctx, { kind: 'furseal', key: 'cnt-furseal', x: L.farRocks[0], y: L.farRocks[1], scale: 0.5, fadeIn: 3 }));
        break;
      case 'ambient':
        this.say(describe(D, l));
        this.ambient(l.i);
        break;
      default:              // arrive, arriveLate, nobody
        this.say(describe(D, l));
    }
  }

  landingX() {
    const [a, b] = game.sim.S.sealion ? this.layout.landingSealion : this.layout.landing;
    return a + this.r() * (b - a);
  }

  // The visual side of the sim's ambient lines (data/count-lines.js ambient, by index).
  ambient(i) {
    const v = this.view;
    if (i === 0) this.shagFlies();
    if (i === 1) v.fx.gold = 1;
    if (i === 2) v.fx.squall = 1;
    if (i === 5) {
      const x = 700 + this.r() * 450;
      this.flyers.push(new Flyer(this, this.ctx, { key: 'cnt-gull', from: [1700, 260], land: [x, v.shoreY(x) + 60], to: [-100, 280],
        seconds: 10, stay: 7, scale: 0.8 }));
    }
    if (i === 6) v.fx.gust = 1;
    if (i === 7) {
      const x = 640 + this.r() * 500;
      const kelp = new Thing(this, this.ctx, { kind: 'kelp', key: 'cnt-kelp', x, y: v.shoreY(x) + 10, scale: 0.75 * this.D.lookalikeSize, fadeIn: 2 });
      this.things.push(kelp);
      this.after(25, () => kelp.leave(3));
    }
  }

  shagFlies() {
    const y = 300 + this.r() * 120;
    const rtl = this.chance(0.5);
    this.flyers.push(new Flyer(this, this.ctx, { key: 'cnt-shag-fly', from: [rtl ? 1700 : -100, y], to: [rtl ? -100 : 1700, y + 30],
      seconds: 9 + this.r() * 3, scale: 0.5 }));
  }

  leaving(o) {
    if (o instanceof Bird && o.line?.tent) this.say(fill(game.data, this.T.tent, o.line));
    this.labels = this.labels.filter(lb => {
      if (lb.obj !== o) return true;
      lb.objs.forEach(x => x.destroy());
      return false;
    });
  }

  /* ---------- clicking ---------- */
  // What's under the mouse (stage pixels). Plain view: the thing whose click area you're in.
  // Binoculars up: the nearest thing to the middle of the lens, if it's close enough, so a
  // click never has to be fussy. Hoiho win ties, so a bird walking past the rock is the bird.
  pick(x, y) {
    const reach = this.binos ? this.D.pickReach : 0;
    let best = null;
    let bestScore = Infinity;
    for (const o of [...this.birds, ...this.things]) {
      if (!o.live) continue;
      const r = o.rect;
      const dx = Math.max(0, Math.abs(x - r.x) - r.w / 2);
      const dy = Math.max(0, Math.abs(y - r.y) - r.h / 2);
      const d = Math.hypot(dx, dy);
      if (d > reach) continue;
      const score = d - (o.kind === 'hoiho' ? 10 : 0) - o.y / 10000;
      if (score < bestScore) { best = o; bestScore = score; }
    }
    return best;
  }

  updateHover() {
    const p = this.input.activePointer;
    const q = this.toStage(p.x, p.y);
    const hit = this.summary || this.overHud ? null : this.pick(q.x, q.y);
    for (const o of [...this.birds, ...this.things]) o.hover = o === hit;
    this.input.setDefaultCursor(hit ? 'pointer' : 'default');
  }

  clicked(o) {
    if (this.summary) return;
    const T = this.T;
    const D = this.D;
    const shaped = ['hoiho', 'korora', 'shag', 'rock', 'kelp'].includes(o.kind);
    const hoiho = o instanceof Bird && o.kind === 'hoiho';
    // Seals are plainly seals. Anything penguin-shaped is only "something there" until
    // you've got the binoculars on it (or already worked out what it is).
    if (shaped && !o.known && !this.binos) {
      this.label(o, [{ text: T.plainShape, style: TEXT.body }]);
      return;
    }
    const read = this.view.light.read;
    // Things that aren't birds (kelp, the rock) are judged by how near they sit to the water too.
    const near = o.nearness ? o.nearness() : Math.max(0, Math.min(1, (o.y - 500) / 190));
    const sure = !shaped || o.known || lookClarity(D, { read, near, binos: this.binos }) >= D.readNeed;
    const why = read * D.binoBoost < D.readNeed ? T.unread : T.unreadFar;
    if (hoiho) {
      const l = o.line;
      const already = o.counted;
      o.counted = true;
      this.tally.counted.add(l.id);
      if (sure && !o.identified) { o.identified = true; o.known = true; this.tally.identified.add(l.id); }
      const rows = [{ text: already ? T.already : T.counted, style: TEXT.highlight }];
      if (o.identified) {
        rows.push({ text: l.name, band: l.band });
        if (l.quirk !== null) rows.push({ text: game.data.penguins.quirks[l.quirk].line, style: { ...TEXT.small, fontStyle: 'italic' } });
        if (l.thin) rows.push({ text: T.thin, style: TEXT.small });
      } else {
        rows.push({ text: why, style: TEXT.small });
      }
      this.label(o, rows);
      this.updateTally();
      return;
    }
    const note = { korora: T.korora, shag: T.shag, rock: T.rock, kelp: T.kelp, sealion: T.sealion, furseal: T.furseal }[o.kind];
    if (!shaped) { this.label(o, [{ text: note, style: TEXT.body }]); return; }
    if (sure) {
      // Now you can tell. If you'd tallied it when you couldn't, it comes off again.
      o.known = true;
      const rows = [{ text: note, style: TEXT.body }];
      if (this.tally.fooled.delete(o)) rows.unshift({ text: T.takenOff, style: TEXT.highlight });
      this.label(o, rows);
    } else {
      // Too dark or far to tell even through the binoculars: it goes on the tally like any penguin-shape.
      this.tally.fooled.add(o);
      this.label(o, [{ text: T.counted, style: TEXT.highlight }, { text: why, style: TEXT.small }]);
    }
    this.updateTally();
  }

  // A name card above something you clicked. rows: [{ text, style, band }].
  label(obj, rows) {
    this.labels = this.labels.filter(lb => {
      if (lb.obj !== obj) return true;
      lb.objs.forEach(x => x.destroy());
      return false;
    });
    const texts = [];
    let y = 0;
    let w = 0;
    for (const row of rows) {
      let x = 0;
      if (row.band) {
        const col = this.D.bandColours[row.band[0]] ?? 0xffffff;
        const chip = this.add.text(0, y, ` ${row.band} `, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold',
          color: ['Y', 'W'].includes(row.band[0]) ? '#1c2420' : '#ffffff', backgroundColor: '#' + col.toString(16).padStart(6, '0') });
        texts.push(chip);
        x = chip.width + 10;
      }
      const t = this.add.text(x, y, row.text, { ...(row.style ?? TEXT.body), wordWrap: { width: 340 } });
      texts.push(t);
      w = Math.max(w, x + t.width);
      y += Math.max(t.height, row.band ? 28 : 0) + 4;
    }
    const pad = 12;
    const bg = this.add.graphics().fillStyle(CARD, 0.84).fillRoundedRect(-pad, -pad, w + pad * 2, y + pad * 2 - 4, 10)
      .lineStyle(2, COLOURS.accent, 0.5).strokeRoundedRect(-pad, -pad, w + pad * 2, y + pad * 2 - 4, 10);
    const box = this.add.container(0, 0, [bg, ...texts]);
    box.w = w + pad * 2;
    box.h = y + pad * 2;
    this.ui.add(box);
    this.labels.push({ obj, objs: [box], box, until: this.clock + this.D.labelSeconds });
    this.updateLabels();
  }

  updateLabels() {
    const W = this.scale.width;
    this.labels = this.labels.filter(lb => {
      const a = Math.min(1, Math.max(0, lb.until + 0.8 - this.clock) / 0.8);
      if (a <= 0) { lb.objs.forEach(x => x.destroy()); return false; }
      const top = lb.obj.top();
      const p = this.toScreen(top.x, top.y);
      const x = Math.max(GAP + 12, Math.min(W - lb.box.w, p.x - lb.box.w / 2 + 12));
      let y = Math.max(GAP + 12, p.y - lb.box.h);
      if (this.binos && !this.overHud) {
        // With the lens up, the card sits above it rather than over what you're looking at.
        const q = this.input.activePointer;
        const R = this.D.binos.radius;
        if (Math.abs(p.x - q.x) < this.D.binos.spread + R + 60) y = Math.max(GAP + 12, Math.min(y, q.y - R - 20 - lb.box.h));
      }
      lb.box.setPosition(x, y).setAlpha(a);
      return true;
    });
  }

  /* ---------- the binoculars ---------- */
  // A second camera, zoomed in and masked to two round lenses, that follows the mouse. The
  // middle of the lens is always the point under the mouse, so what you click is what's in
  // the middle. The plain camera is darkened round about, and the lens rims are drawn by a
  // third camera that only draws the words and buttons (so name cards stay on top).
  makeLens() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cams = this.cameras;
    this.uiCam = cams.add(0, 0, W, H);
    this.lens = cams.add(0, 0, 10, 10);
    this.lens.setVisible(false);
    this.maskG = this.make.graphics({}, false);
    this.lens.setMask(new Phaser.Display.Masks.GeometryMask(this, this.maskG), true);
    this.rim = this.add.graphics();
    this.ui.add(this.rim);
    cams.main.ignore([this.ui, this.bands]);
    this.lens.ignore([this.ui, this.dim]);
    this.uiCam.ignore([this.stage, this.bands, this.dim]);
    this.lensAt = { x: W / 2, y: H / 2 };
  }

  setBinos(on) {
    if (this.summary) on = false;
    this.binos = on;
    if (on) this.binosTried = true;
    this.lens.setVisible(on);
    this.rim.clear();
    this.maskG.clear();
    this.dim.setAlpha(0);
    this.drawHud();
  }

  updateLens() {
    if (!this.binos) return;
    const B = this.D.binos;
    const W = this.scale.width;
    const H = this.scale.height;
    const p = this.input.activePointer;
    const px = Phaser.Math.Clamp(p.x, 0, W);
    const py = Phaser.Math.Clamp(p.y, 0, H);
    const show = !this.overHud && !this.summary;
    this.lens.setVisible(show);
    this.dim.setAlpha(this.binos && !this.summary ? B.surround * (show ? 1 : 0.35) : 0);
    this.rim.clear();
    this.maskG.clear();
    if (!show) return;
    const R = B.radius;
    const sp = B.spread;
    // The lens camera covers just the box round both lenses (kept on screen).
    const x0 = Math.max(0, Math.round(px - sp - R));
    const y0 = Math.max(0, Math.round(py - R));
    const x1 = Math.min(W, Math.round(px + sp + R));
    const y1 = Math.min(H, Math.round(py + R));
    const vw = Math.max(2, x1 - x0);
    const vh = Math.max(2, y1 - y0);
    const lens = this.lens;
    lens.setViewport(x0, y0, vw, vh);
    lens.setZoom(B.zoom);
    // Put the point under the mouse back at the mouse, magnified.
    const mx = px - (px - x0 - vw / 2) / B.zoom;
    const my = py - (py - y0 - vh / 2) / B.zoom;
    lens.setScroll(mx - vw / 2, my - vh / 2);
    this.maskG.fillStyle(0xffffff, 1).fillCircle(px - sp, py, R).fillCircle(px + sp, py, R);
    // Rims, the bridge between the lenses, a little shading inside, and a small sight mark.
    const g = this.rim;
    g.fillStyle(B.rim, 1).fillRect(px - sp, py - 12, sp * 2, 24);
    for (const cx of [px - sp, px + sp]) {
      for (let k = 0; k < 5; k++) g.lineStyle(10 - k * 2, 0x000000, 0.1 + k * 0.05).strokeCircle(cx, py, R - 6 - k * 5);
      g.lineStyle(12, B.rim, 1).strokeCircle(cx, py, R + 4);
      g.lineStyle(2, 0x4a5a54, 0.8).strokeCircle(cx, py, R - 3);
    }
    for (const [w, c, a] of [[5, 0x10161a, 0.6], [2, B.reticle, 1]]) {
      g.lineStyle(w, c, a).strokeCircle(px, py, 9).lineBetween(px - 20, py, px - 12, py).lineBetween(px + 12, py, px + 20, py);
    }
  }

  /* ---------- the companion ---------- */
  nextTalk() {
    if (this.summary) return;
    const i = this.talkQueue.shift();
    if (i === undefined) return;
    this.showTalk(i, 'ask');
  }

  // stage: 'ask' (their line and your choices) or 'reply' (what you said and
  // their answer). reply: which of your replies (a number), or a nod (text).
  showTalk(i, stage, reply = this.talk?.reply) {
    this.talkObjs?.forEach(o => o.destroy());
    this.talkObjs = null;
    const line = game.data.countLines.talk[i];
    if (!line) { this.talk = null; return; }
    const keep = this.talk?.i === i && this.talk.stage === stage;
    const until = keep ? this.talk.until : this.clock + (stage === 'ask' ? this.D.companionSeconds : this.D.replySeconds);
    this.talk = { i, stage, reply, until };
    const W = this.scale.width;
    const H = this.scale.height;
    const w = Math.min(660, W - 2 * GAP);
    const x = GAP;
    const inner = w - 40;
    const big = { ...TEXT.body, fontSize: '22px', fontStyle: 'italic', wordWrap: { width: inner } };
    const quote = this.add.text(x + 20, 0, `“${line.say}”`, big);
    const objs = [quote];
    let h = quote.height + 32;
    const choices = [];
    let you = null;
    let back = null;
    if (stage === 'ask') {
      const bw = (inner - 16) / 3;
      const labels = [...line.replies.map(r => r.you), this.T.keepWatching];
      labels.forEach((t, k) => {
        const text = this.add.text(0, 0, t, { ...TEXT.small, align: 'center', wordWrap: { width: bw - 16 } }).setOrigin(0.5);
        choices.push({ k, text, x: x + 20 + k * (bw + 8), w: bw });
      });
      const bh = Math.max(46, ...choices.map(ch => ch.text.height + 18));
      choices.forEach(ch => { ch.h = bh; });
      h += bh + 12;
    } else {
      const r = typeof reply === 'number' ? line.replies[reply] : null;
      if (r) { you = this.add.text(x + 20, 0, r.you, { ...TEXT.dim, wordWrap: { width: inner } }); objs.push(you); h += you.height + 8; }
      back = this.add.text(x + 20, 0, `“${r ? r.back : reply}”`, big);
      objs.push(back);
      h += back.height + 8;
    }
    const y = H - GAP - h;
    objs.unshift(this.add.graphics().fillStyle(CARD, 0.74).fillRoundedRect(x, y, w, h, 12));
    quote.setY(y + 16);
    let yy = y + 16 + quote.height + 12;
    for (const ch of choices) {
      const g = this.add.graphics();
      const draw = hover => g.clear().fillStyle(hover ? COLOURS.buttonHover : COLOURS.button, 1).fillRoundedRect(ch.x, yy, ch.w, ch.h, 8);
      draw(false);
      ch.text.setPosition(ch.x + ch.w / 2, yy + ch.h / 2);
      const z = this.add.zone(ch.x, yy, ch.w, ch.h).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerover', () => draw(true));
      z.on('pointerout', () => draw(false));
      z.on('pointerdown', () => this.answer(ch.k));
      objs.push(g, ch.text, z);
    }
    if (you) { you.setY(yy); yy += you.height + 8; }
    if (back) back.setY(yy);
    this.talkObjs = objs;
    this.ui.add(objs);
  }

  answer(k) {
    const t = this.talk;
    if (!t) return;
    const line = game.data.countLines.talk[t.i];
    if (k < line.replies.length) { this.talk = null; this.showTalk(t.i, 'reply', k); return; }
    // Keep watching: now and then they say something small.
    if (this.chance(this.D.nodChance)) {
      const nods = game.data.countLines.nods;
      this.talk = null;
      this.showTalk(t.i, 'reply', nods[Math.floor(this.r() * nods.length)]);
      return;
    }
    this.endTalk();
  }

  endTalk() {
    this.talkObjs?.forEach(o => o.destroy());
    this.talkObjs = null;
    this.talk = null;
    this.after(4, () => { if (!this.talk) this.nextTalk(); });
  }

  /* ---------- the end ---------- */
  result() {
    return { counted: [...this.tally.counted], identified: [...this.tally.identified], lookalikes: this.tally.fooled.size };
  }

  showSummary(redraw = false) {
    if (this.summary && !redraw) return;
    if (!this.summary) {
      if (this.binos) this.setBinos(false);
      const early = this.timeline.some(e => !e.fired && e.l.kind === 'penguin');
      this.summary = countSummary(game.sim, game.sim.scoreCount(this.result()), early);
      this.endTalk();
      this.labels.forEach(lb => lb.objs.forEach(x => x.destroy()));
      this.labels = [];
      this.drawHud();
      return;
    }
    this.summaryObjs?.forEach(o => o.destroy());
    const W = this.scale.width;
    const H = this.scale.height;
    const s = this.summary;
    const w = Math.min(820, W - 2 * GAP);
    const x = (W - w) / 2;
    const shade = this.add.rectangle(0, 0, W, H, 0x0a0e14, 0.45).setOrigin(0).setInteractive();
    const head = this.add.text(x + 30, 0, s.heading, { ...TEXT.title, color: COLOURS.accentText });
    const body = this.add.text(x + 30, 0, s.lines.join('\n'), { ...TEXT.body, lineSpacing: 10, wordWrap: { width: w - 60 } });
    const h = 28 + head.height + 18 + body.height + 30 + 52 + 26;
    const y = Math.max(GAP, (H - h) / 2);
    head.setY(y + 28);
    body.setY(y + 28 + head.height + 18);
    const by = body.y + body.height + 30;
    const bw = 340;
    const btn = button(this, x + w - bw - 30, by, bw, this.T.summary.done, { accent: true, center: true, onClick: () => this.finish() });
    this.summaryObjs = [shade, panel(this, x, y, w, h), head, body, ...btn];
    this.ui.add(this.summaryObjs);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const sim = game.sim;
    sim.endCount(this.result());
    game.save();
    this.scene.start(sim.S.phase === 'report' ? 'report' : 'map');
  }
}
