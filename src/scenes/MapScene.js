// The main screen: the whole map fixed on the left, panels on the right.
//   - Click a place on the map to walk there (it costs daylight).
//   - The "here" panel lists the jobs where you are; click one to do it.
//   - "Head to the count" ends the day and opens the dusk count.
// The simulation does the work (src/sim/); this scene only draws it and passes
// on clicks. The game is saved after every action.
//
// Two cameras: `cameras.main` shows the map (its viewport is the square on the
// left, zoomed so the whole map fits); `this.ui` shows the panels at full size.
import { COLOURS, SIZES, TEXT } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { game } from '../game.js';
import { areaNotes } from '../sightings.js';
import { describe, fill, clock, duration, zoneName } from '../text.js';
import { jobsAt, MINI_JOBS } from '../sim/jobs.js';
import { ROUND_JOBS } from '../sim/rounds.js';
import { preloadMap, buildMap } from '../ui/map.js';
import { weatherIcon, calendarIcon } from '../ui/draw.js';
import UI from '../../data/ui-text.js';
import T from '../../data/screens.js';

const QUICK_W = 96;            // px: width of the "Quick" button beside a mini-game job

const DEV_ROUNDS = {          // ?scene=<name> opens one of the rounds mini-games (see dev/*.html)
  fencewalk: { kind: 'fence', zone: 'boundary' },
  baitrounds: { kind: 'bait', zone: 'gully' },
  torchrounds: { kind: 'browse', zone: 'paddock' },
};
const WALK_TWEEN_MS = 600;     // how long the marker takes to slide to a new place
const FOUND_ROW = 27;          // px: the row kept for a find ("A few stoat prints...") under the place name
const MAP_CROP = 1.08;         // the most the map zooms past fitting its square on a narrow window (1 = never)
const ROW_MIN = 470;
const JOB_GAP = 10;           // px: space between job buttons
const JOB_MIN_H = SIZES.minButtonHeight;   // px: job buttons never shrink below this           // px: a panel narrower than this puts the bottom buttons on two rows

export class MapScene extends Phaser.Scene {
  constructor() {
    super('map');
    this.firstStart = true;
  }

  preload() {
    preloadMap(this);
  }

  create() {
    const first = this.firstStart;
    this.firstStart = false;          // only once: coming back from a scene mustn't redirect again
    if (first && this.redirect()) return;
    this.hovered = null;
    this.hint = null;
    this.confirmNew = false;
    this.panels = null;
    this.card = null;
    this.buildMap();
    this.buildSky();
    this.ui = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.ui.ignore(this.world);
    this.hintText = this.add.text(0, 0, '', TEXT.hint).setOrigin(0, 1).setVisible(false);
    this.cameras.main.ignore(this.hintText);
    const params = new URLSearchParams(location.search);
    if (params.get('fps') === '1') {
      this.fpsText = this.add.text(8, 8, '', { ...TEXT.dim, backgroundColor: '#1c2420' });
      this.cameras.main.ignore(this.fpsText);
    }
    this.layout();
    // Back from a mini-game with a busy place card the diary may have no room: say what happened over the map.
    const log = game.sim.S.log.filter(e => e.k !== 'notebook');
    if (!this.diaryShown && log.length) this.showHint(describe(game.data, log[log.length - 1]));
    this.placeMarker(false);
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  // On the first start, jump to the right screen for a saved game (or ?scene=).
  redirect() {
    const S = game.sim.S;
    const want = new URLSearchParams(location.search).get('scene');
    if (want === 'count' && S.phase === 'day') { game.sim.toHillside(); game.save(); }
    if (want === 'trapline' && S.phase === 'day') {    // dev switch: straight to a trap line in the old bush
      game.sim.goTo('bush');
      if (game.sim.startTrapLine()) game.save();
    }
    if (want === 'notebook' || want === 'colony') { this.scene.start(want); return true; }
    if (want === 'planting' && S.phase === 'day') {    // dev switch: straight to a planting plot in the restoration paddock (needs a planting month: use ?month=6)
      if (game.sim.goTo('paddock') || S.loc === 'paddock') { if (game.sim.startPlanting()) game.save(); }
    }
    const dev = DEV_ROUNDS[want];     // dev switches: straight into a rounds mini-game
    if (dev && S.phase === 'day') {
      const params = new URLSearchParams(location.search);
      game.sim.goTo(dev.zone);
      if (dev.kind === 'fence') {     // ?cond=40 sets the fence's condition; ?intruder=pig|deer|cow|sheep puts one in the area
        const z = game.sim.z(dev.zone);
        z.fence = Number(params.get('cond') ?? (z.fence > 85 ? 40 : z.fence));
        const who = params.get('intruder');
        if (who === 'pig' || who === 'deer') S[who] = dev.zone;
        if (who === 'cow' || who === 'sheep') S.stock = { zone: dev.zone, kind: who, age: 0, seen: true };
      }
      if (game.sim.startRounds(dev.kind)) game.save();
    }
    if (S.phase === 'rounds') { this.scene.start('rounds-' + S.rounds.kind); return true; }
    if (want === 'nests' && S.phase === 'day') {       // dev switch: straight to the nests in the old bush (try ?month=3&year=3, or month=6 to weigh)
      if (game.sim.goTo('bush') || S.loc === 'bush') { if (game.sim.startNestCheck()) game.save(); }
    }
    if (['cow', 'cattle', 'sheep'].includes(want) && S.phase === 'day') {    // dev switch: force the stock situation (cow in the gully mud, cattle or sheep in the paddock)
      const zone = want === 'cow' ? 'gully' : 'paddock';
      if (S.loc !== zone) game.sim.goTo(zone);
      S.stock = { zone, kind: want === 'sheep' ? 'sheep' : 'cow', age: 0, seen: true };
      S.mud = want === 'cow';
      if (game.sim.startStock()) game.save();
    }
    if (S.phase === 'count') { this.scene.start('count'); return true; }
    if (S.phase === 'report') { this.scene.start('report'); return true; }
    if (S.phase === 'trapline') { this.scene.start('trapline'); return true; }
    if (S.phase === 'planting') { this.scene.start('planting'); return true; }
    if (S.phase === 'nests') { this.scene.start('nests'); return true; }
    if (S.phase === 'stock') { this.scene.start('stock'); return true; }
    return false;
  }

  update(time, delta) {
    this.fpsText?.setText(`${window.__game.fps} fps`);
    this.stepWeather(delta);
  }

  /* ---------- time-of-day tint and weather streaks (drawn over the map only) ---------- */
  buildSky() {
    this.tintG = this.add.graphics().setDepth(1);
    this.fxG = this.add.graphics().setDepth(2);
    this.drops = [];                     // the pool: made once, reused for every kind of weather
    const most = Math.max(...Object.values(T.fx).map(f => f.n));
    for (let i = 0; i < most; i++) this.drops.push({ x: Math.random() * this.mapSize.w, y: Math.random() * this.mapSize.h });
    this.world.push(this.tintG, this.fxG);
  }

  // How far through the working day (0 at the start, 1 at sunset).
  dayFraction() {
    const S = game.sim.S;
    const day = game.data.rates.day;
    const start = Math.max(day.earliestStart, S.workEnd - day.length) - (S.weather === 'fine' ? day.fineBonus : 0) - (S.early ?? 0);
    return Phaser.Math.Clamp((S.time - start) / (S.workEnd + day.workBeforeSunset - start), 0, 1);
  }

  drawTint() {
    const S = game.sim.S;
    const K = T.tint;
    const f = this.dayFraction();
    const g = this.tintG.clear();
    const { w, h } = this.mapSize;
    let c = K.midday.colour;
    let a = 0;
    if (f < K.morning.until) { c = K.morning.colour; a = K.morning.alpha * (1 - f / K.morning.until); }
    else if (f > K.midday.until) { c = K.evening.colour; a = K.evening.alpha * (f - K.midday.until) / (1 - K.midday.until); }
    if (a > 0.005) g.fillStyle(c, a).fillRect(0, 0, w, h);
    const wa = K.weather[S.weather] ?? 0;
    if (wa > 0) g.fillStyle(K.weatherColour, wa).fillRect(0, 0, w, h);
    this.fx = T.fx[S.weather] ?? null;
  }

  stepWeather(delta = 16) {
    const g = this.fxG;
    if (!g) return;
    g.clear();
    const fx = this.fx;
    if (!fx) return;
    const { w, h } = this.mapSize;
    const norm = Math.hypot(fx.dir[0], fx.dir[1]);
    const dx = fx.dir[0] / norm;
    const dy = fx.dir[1] / norm;
    const step = Math.min(delta, 50) * fx.speed;
    g.lineStyle(fx.width, fx.colour, fx.alpha).fillStyle(fx.colour, fx.alpha);
    for (let i = 0; i < fx.n; i++) {
      const d = this.drops[i];
      d.x += dx * step;
      d.y += dy * step;
      if (d.y > h + fx.len) { d.y = -fx.len; d.x = Math.random() * w; }
      if (d.x > w + fx.len) { d.x = -fx.len; d.y = Math.random() * h; }
      if (fx.flakes) g.fillCircle(d.x + Math.sin(d.y / 90) * 20, d.y, fx.width);
      else g.lineBetween(d.x, d.y, d.x - dx * fx.len, d.y - dy * fx.len);
    }
  }

  /* ---------- the map ---------- */
  buildMap() {
    const { world, places, size } = buildMap(this);
    this.world = world;
    this.places = places;
    this.mapSize = size;
    this.pinShapes = this.add.graphics();
    this.pinLabels = this.places.map(p => {
      const label = this.add.text(0, 0, p.name, TEXT.mapLabel).setInteractive({ useHandCursor: true });
      this.hookPlace(label, p);
      return label;
    });
    const zones = this.places.map(p => {
      const zone = this.add.zone(p.x, p.y, p.w, p.h)
        .setInteractive(new Phaser.Geom.Ellipse(p.w / 2, p.h / 2, p.w, p.h), Phaser.Geom.Ellipse.Contains);
      zone.input.cursor = 'pointer';
      this.hookPlace(zone, p);
      return zone;
    });
    // Job count badges: one per area, on its first place (Tent spot and Car park share one).
    this.badges = this.places.map((p, i) => (this.places.findIndex(q => q.zone === p.zone) === i
      ? this.add.text(0, 0, '', TEXT.badge).setOrigin(0.5) : null));
    this.marker = this.add.graphics();
    this.world.push(this.pinShapes, ...this.pinLabels, ...zones, ...this.badges.filter(Boolean), this.marker);
  }

  hookPlace(obj, p) {
    obj.on('pointerover', () => { this.hovered = p.name; this.drawPins(); this.showHint(null); this.showCard(p); });
    obj.on('pointerout', () => {
      if (this.hovered === p.name) { this.hovered = null; this.showCard(null); }
      this.drawPins();
    });
    obj.on('pointerdown', () => this.walkTo(p));
  }

  walkTo(p) {
    const sim = game.sim;
    if (p.zone === sim.S.loc) return;
    if (!sim.goTo(p.zone)) {
      this.showHint(fill(game.data, UI.tooFar, { place: p.name }));
      return;
    }
    game.save();
    this.placeMarker(true);
    this.drawPins();
    this.buildPanels();
    this.showCard(p);
  }

  // The jobs at an area, as they'd be if you walked there now.
  // available: not done today, and there's daylight for the walk and the job.
  jobsFor(zone) {
    const sim = game.sim;
    const S = sim.S;
    const walk = zone === S.loc ? 0 : sim.walkCost(S.loc, zone);
    return jobsAt(sim, zone).map(job => {
      const def = game.data.jobs.find(j => j.id === job.id);
      return { ...job, name: this.jobName(def, job), minor: Boolean(def.minor),
        available: job.blocked !== 'done' && S.time + walk + job.minutes <= S.workEnd };
    });
  }

  jobName(def, job) {
    const v = job.vars;
    if (job.id !== 'stock') return def.name;
    return v.stock === 'sheep' ? def.nameSheep : v.bogged ? def.nameCow : def.name;
  }

  // A card next to a hovered place: how far, and what you could do there.
  showCard(p) {
    this.card?.destroy();
    this.card = null;
    if (!p) return;
    const D = game.data;
    const S = game.sim.S;
    const cam = this.cameras.main;
    const w = 330;
    const items = [];
    let y = 12;
    const line = (str, style) => {
      const t = this.add.text(14, y, str, { ...style, wordWrap: { width: w - 28 } });
      items.push(t);
      y += t.height + 4;
    };
    line(p.name, TEXT.heading);
    line(p.zone === S.loc ? UI.card.here
      : fill(D, UI.card.walk, { walk: duration(game.sim.walkCost(S.loc, p.zone)) }), TEXT.dim);
    y += 4;
    const jobs = p.zone === S.loc ? null : this.jobsFor(p.zone);     // where you are, the jobs are already in the panel
    for (const j of jobs ?? []) {
      line(`${j.available ? '•' : '–'} ${j.name}${j.available ? '' : ` (${UI.blocked[j.blocked ?? 'daylight']})`}`,
        j.available ? TEXT.small : TEXT.smallFaint);
    }
    if (jobs && !jobs.length) line(UI.card.nothing, TEXT.smallFaint);
    // your pest notes for this area, newest first
    const notes = areaNotes(D, S, p.zone);
    if (notes.length) {
      y += 6;
      line(D.sightings.card.heading, { ...TEXT.small, color: COLOURS.accentText });
      for (const n of notes) {
        const dotY = y + 13;
        items.push(this.add.circle(22, dotY, 6, n.colour).setStrokeStyle(1.5, 0x0e1512));
        const t = this.add.text(36, y, n.line, { ...TEXT.small, wordWrap: { width: w - 50 } });
        items.push(t);
        y += t.height + 4;
      }
    }
    if (p.zone !== S.loc) { y += 4; line(UI.card.click, TEXT.smallAccent); }
    const h = y + 8;
    const bg = this.add.graphics().fillStyle(COLOURS.panel, 0.96).fillRoundedRect(0, 0, w, h, 10)
      .lineStyle(2, COLOURS.accent, 0.8).strokeRoundedRect(0, 0, w, h, 10);
    // Beside the place, kept inside the map square, and clear of the place and its label if it can be.
    const vx = cam.x;
    const vy = cam.y;
    const view = this.viewRect();
    const toScreen = (wx, wy) => ({ x: vx + (wx - view.x) * cam.zoom, y: vy + (wy - view.y) * cam.zoom });
    const c0 = toScreen(p.x - p.w / 2, p.y - p.h / 2);
    const c1 = toScreen(p.x + p.w / 2, p.y + p.h / 2);
    const lb = this.pinLabels[this.places.indexOf(p)].getBounds();
    const l0 = toScreen(lb.x, lb.y);
    const l1 = toScreen(lb.right, lb.bottom);
    const keep = { x0: Math.min(c0.x, l0.x) - 10, y0: Math.min(c0.y, l0.y) - 10, x1: Math.max(c1.x, l1.x) + 10, y1: Math.max(c1.y, l1.y) + 10 };
    const midY = (keep.y0 + keep.y1) / 2 - h / 2;
    const midX = (keep.x0 + keep.x1) / 2 - w / 2;
    const fits = (x, y) => x >= vx + 8 && y >= vy + 8 && x + w <= vx + cam.width - 8 && y + h <= vy + cam.height - 8;
    const clampY = y => Phaser.Math.Clamp(y, vy + 8, vy + cam.height - h - 8);
    const clampX = x => Phaser.Math.Clamp(x, vx + 8, vx + cam.width - w - 8);
    const tries = [[keep.x1, clampY(midY)], [keep.x0 - w, clampY(midY)], [clampX(midX), keep.y1], [clampX(midX), keep.y0 - h]];
    const overlaps = (x, y) => x < keep.x1 && x + w > keep.x0 && y < keep.y1 && y + h > keep.y0;
    const [x, top] = tries.find(([tx, ty]) => fits(tx, ty) && !overlaps(tx, ty))
      ?? [clampX(keep.x1), clampY(midY)];
    this.card = this.add.container(x, top, [bg, ...items]);
    cam.ignore(this.card);
  }

  // The part of the map the camera shows, in map pixels. (The camera's own
  // worldView only catches up at the next frame, which is too late after a resize.)
  viewRect() {
    const cam = this.cameras.main;
    const w = cam.width / cam.zoom;
    const h = cam.height / cam.zoom;
    const x = cam.scrollX + cam.width / 2 - w / 2;
    const y = cam.scrollY + cam.height / 2 - h / 2;
    return { x, y, width: w, height: h, right: x + w, bottom: y + h };
  }

  // The first place on the map for the zone you're in.
  herePlace() {
    return this.places.find(p => p.zone === game.sim.S.loc) ?? this.places[0];
  }

  placeMarker(animate) {
    const p = this.herePlace();
    if (!p) return;
    if (animate) this.tweens.add({ targets: this.marker, x: p.x, y: p.y, duration: WALK_TWEEN_MS, ease: 'Sine.easeInOut' });
    else this.marker.setPosition(p.x, p.y);
  }

  drawPins() {
    const zoom = this.cameras.main.zoom;
    const here = game.sim.S.loc;
    const g = this.pinShapes.clear();
    this.places.forEach((p, i) => {
      const on = p.zone === here || p.name === this.hovered;
      g.lineStyle((on ? 4 : 2.5) / zoom, on ? COLOURS.accent : 0xfffbea, on ? 1 : 0.7);
      g.strokeEllipse(p.x, p.y, p.w, p.h);
      // Labels keep the same size on screen, just outside the place on the side set in data/places.js.
      const pad = 6 / zoom;
      const spot = {
        above: [p.x, p.y - p.h / 2 - pad, 0.5, 1], below: [p.x, p.y + p.h / 2 + pad, 0.5, 0],
        left: [p.x - p.w / 2 - pad, p.y, 1, 0.5], right: [p.x + p.w / 2 + pad, p.y, 0, 0.5],
      }[p.side] ?? [p.x, p.y - p.h / 2 - pad, 0.5, 1];
      const label = this.pinLabels[i].setPosition(spot[0], spot[1]).setOrigin(spot[2], spot[3])
        .setScale(1 / zoom).setColor(on ? COLOURS.accentText : COLOURS.text);
      // never clipped by the edge of the map square
      const view = this.viewRect();
      const b = label.getBounds();
      const m = 4 / zoom;
      if (view.width > 0) {
        if (b.x < view.x + m) label.x += view.x + m - b.x;
        if (b.right > view.right - m) label.x -= b.right - (view.right - m);
        if (b.y < view.y + m) label.y += view.y + m - b.y;
        if (b.bottom > view.bottom - m) label.y -= b.bottom - (view.bottom - m);
      }
    });
    // Badges: how many jobs you could still do at each area today.
    this.places.forEach((p, i) => {
      const badge = this.badges[i];
      if (!badge) return;
      const jobs = this.jobsFor(p.zone).filter(j => !j.minor);
      const n = jobs.filter(j => j.available).length;
      // Every main job here done today: a green tick instead of a number.
      const allDone = jobs.length > 0 && jobs.every(j => j.blocked === 'done');
      const bx = p.x + p.w / 2 * 0.72;
      const by = p.y - p.h / 2 * 0.72;
      badge.setVisible(n > 0).setText(String(n)).setPosition(bx, by).setScale(1 / zoom);
      if (n > 0) {
        g.fillStyle(COLOURS.accent, 1).lineStyle(3 / zoom, 0x1c2420, 1)
          .fillCircle(bx, by, 15 / zoom).strokeCircle(bx, by, 15 / zoom);
      } else if (allDone) {
        const u = 1 / zoom;
        g.fillStyle(COLOURS.done, 1).lineStyle(3 * u, 0x1c2420, 1)
          .fillCircle(bx, by, 15 * u).strokeCircle(bx, by, 15 * u);
        g.lineStyle(4 * u, 0x1c2420, 1).beginPath()
          .moveTo(bx - 7 * u, by + 1 * u).lineTo(bx - 2 * u, by + 6 * u).lineTo(bx + 8 * u, by - 6 * u).strokePath();
      }
    });
    // Pest notes: a small paper note at the lower left of each area with recent notes,
    // with one coloured dot per kind of animal (bright if fresh, faded if older).
    const N = game.data.sightings;
    this.places.forEach((p, i) => {
      if (!this.badges[i]) return;
      const notes = areaNotes(game.data, game.sim.S, p.zone).slice(0, N.dotsMax);
      if (!notes.length) return;
      const u = 1 / zoom;
      const nx = p.x - p.w / 2 * 0.72;
      const ny = p.y + p.h / 2 * 0.72;
      const nw = (14 + notes.length * 19) * u;
      const nh = 28 * u;
      g.fillStyle(0xf4ecd4, 0.95).lineStyle(2 * u, 0x1c2420, 1)
        .fillRoundedRect(nx - nw / 2, ny - nh / 2, nw, nh, 4 * u).strokeRoundedRect(nx - nw / 2, ny - nh / 2, nw, nh, 4 * u);
      notes.forEach((n, j) => {
        g.fillStyle(n.colour, n.fresh ? 1 : 0.45).lineStyle(1.5 * u, 0x1c2420, n.fresh ? 1 : 0.5)
          .fillCircle(nx - nw / 2 + (16 + j * 19) * u, ny, 7.5 * u).strokeCircle(nx - nw / 2 + (16 + j * 19) * u, ny, 7.5 * u);
      });
    });
    // You: a yellow dot with a dark ring, the same size on screen at any map scale.
    this.marker.clear().fillStyle(COLOURS.accent, 1).lineStyle(4 / zoom, 0x1c2420, 1)
      .fillCircle(0, 0, 11 / zoom).strokeCircle(0, 0, 11 / zoom);
    this.drawTint();
  }

  // The reserve health card: each part with a little bar and what helps it.
  showHealthCard(on) {
    this.healthCard?.destroy();
    this.healthCard = null;
    if (!on) return;
    const D = game.data;
    const H = D.health;
    const sim = game.sim;
    const hs = sim.health();
    const c = this.healthCard = this.add.container(0, 0).setDepth(1000);    // above the morning card's dimming
    this.cameras.main.ignore(c);
    const w = 400;
    const items = [];
    const g = this.add.graphics();
    let y = 14;
    const line = (str, style, after = 4) => {
      const t = this.add.text(16, y, str, { ...style, wordWrap: { width: w - 32 } });
      items.push(t);
      y += t.height + after;
    };
    line(H.card.heading, TEXT.heading);
    line(H.card.intro, TEXT.smallFaint, 4);
    const gain = Math.round(hs.score - (sim.S.healthStart ?? hs.score));
    line(fill(D, gain > 0 ? H.card.up : gain < 0 ? H.card.down : H.card.same, { n: Math.abs(gain) }), TEXT.highlight, 10);
    for (const k of Object.keys(H.weights)) {
      const v = Math.round(hs.parts[k]);
      const P = H.card.parts[k];
      items.push(this.add.text(16, y, P.name, TEXT.body));
      const bx = 180;
      const bw = w - bx - 16;
      const band = H.bands.find(b => v < b.below) ?? H.bands[H.bands.length - 1];
      g.fillStyle(0x0f1512, 1).fillRoundedRect(bx, y + 6, bw, 14, 7);
      g.fillStyle(band.colour, 1).fillRoundedRect(bx, y + 6, Math.max(14, bw * v / 100), 14, 7);
      y += 30;
      line(P.tip, TEXT.smallFaint, 10);
    }
    line(fill(D, H.card.colony, { adults: sim.S.adults.length, nests: sim.S.nests.length }), TEXT.small);
    const bg = panel(this, 0, 0, w, y + 10);
    c.add([bg, g, ...items]);
    // over the map, at its top-right corner, beside the panel
    c.setPosition(Math.max(8, this.panelArea.x - w - 12), 12);
  }

  showHint(text) {
    this.hint = text;
    this.hintText.setText(text ?? '').setVisible(Boolean(text));
  }

  /* ---------- layout ---------- */
  // Map square on the left, as big as the window allows; panels fill the rest.
  layout() {
    const W = this.scale.width;
    const H = this.scale.height;
    const side = Math.max(200, Math.min(H, W - SIZES.panelMin));
    // On a narrow window the map may be a little taller than wide: it zooms in
    // up to MAP_CROP to fill more of the height, trimming a sliver off the sides.
    const tall = Math.min(H, side * MAP_CROP);
    const top = Math.max(0, (H - tall) / 2);
    const cam = this.cameras.main;
    cam.setViewport(0, top, side, tall);
    cam.setZoom(tall / this.mapSize.w);
    cam.centerOn(this.mapSize.w / 2, this.mapSize.h / 2);
    this.ui.setSize(W, H);
    this.hintText.setPosition(12, top + tall - 12).setWordWrapWidth(Math.max(200, side - 48));   // wrap inside the map, never under the panels
    this.panelArea = { x: side, w: W - side, h: H };
    this.drawPins();
    this.buildPanels();
    this.showEvent();
  }

  // Today's event (data/events.js), on a card over the map until you've read it.
  // A dimmed backdrop stops clicks reaching the map underneath.
  showEvent() {
    this.eventCard?.destroy();
    this.eventCard = null;
    const S = game.sim.S;
    if (S.phase !== 'day' || !S.event || S.event.seen) return;
    const D = game.data;
    const E = D.events;
    const c = this.eventCard = this.add.container(0, 0).setDepth(50);
    this.cameras.main.ignore(c);
    const mw = this.panelArea.x;
    const H = this.scale.height;
    const w = Math.min(560, mw - 48);
    const text = this.add.text(0, 0, describe(D, { k: 'event', event: S.event.k, zone: S.event.zone }),
      { ...TEXT.body, wordWrap: { width: w - 56 } });
    const h = 22 + 36 + text.height + 22 + SIZES.buttonHeight + 24;
    const x = (mw - w) / 2;
    const y = Math.max(16, (H - h) / 2);
    const veil = this.add.rectangle(0, 0, mw, H, 0x0e1512, 0.45).setOrigin(0).setInteractive();
    const head = this.add.text(x + 28, y + 22, E.heading, TEXT.heading);
    text.setPosition(x + 28, y + 22 + 40);
    const ok = button(this, x + w - 28 - 160, y + h - 24 - SIZES.buttonHeight, 160, E.ok, {
      accent: true, center: true,
      onClick: () => { game.sim.seenEvent(); game.save(); this.showEvent(); },
    });
    c.add([veil, panel(this, x, y, w, h), head, text, ...ok]);
  }

  /* ---------- the panels ---------- */
  buildPanels() {
    this.panels?.destroy();
    this.showHealthCard(false);
    const c = this.panels = this.add.container(0, 0);
    this.cameras.main.ignore(c);
    const sim = game.sim;
    const S = sim.S;
    const D = game.data;
    if (sim.checkGoal()) game.save();      // a job or mini-game just finished may have met today's goal
    const g = SIZES.gap;
    const x = this.panelArea.x + g;
    const w = this.panelArea.w - 2 * g;
    const inner = w - 36;
    const wrap = style => ({ ...style, wordWrap: { width: inner } });
    let y = g;

    // Each section adds its texts and buttons, then a panel is drawn behind them.
    const section = build => {
      const top = y;
      const items = [];
      let cy = top + 12;
      const text = (str, style, after = 6) => {
        const t = this.add.text(x + 18, cy, str, wrap(style));
        items.push(t);
        cy += t.height + after;
        return t;
      };
      // opts.side: a second, narrower button on the same row (the "Quick" button).
      const btn = (label, opts) => {
        const h = opts.height ?? SIZES.buttonHeight;
        const sw = opts.side ? QUICK_W : 0;
        items.push(...button(this, x + 12, cy, w - 24 - (sw ? sw + 8 : 0), label, opts));
        if (sw) items.push(...button(this, x + w - 12 - sw, cy, sw, opts.side.label, { height: h, center: true, ...opts.side }));
        cy += h + (opts.gap ?? 6);
      };
      build({ text, btn, at: () => cy, skip: v => { cy += v; } });
      const h = cy - top + 6;
      c.add(panel(this, x, top, w, h));
      c.add(items);
      y = top + h + g;
    };

    // Status: month (calendar icon), weather (icon) and a daylight bar.
    {
      const top = y;
      const short = this.panelArea.h < 700;          // squeeze the status panel a little on short windows
      const ix = x + 18;
      const month = D.calendar.months[S.mi];
      const g2 = this.add.graphics();
      const items = [g2];
      calendarIcon(g2, ix, top + 10, short ? 42 : 48, short ? 42 : 48);
      items.push(this.add.text(ix + (short ? 21 : 24), top + 10 + (short ? 31 : 36), month.slice(0, 3).toUpperCase(),
        { ...TEXT.badge, fontSize: short ? '15px' : '17px' }).setOrigin(0.5));
      items.push(this.add.text(ix + 64, top + (short ? 4 : 8), fill(D, UI.date, { month, year: S.year }), short ? { ...TEXT.title, fontSize: '27px' } : TEXT.title));
      items.push(this.add.text(ix + 64, top + (short ? 34 : 44), D.calendar.stages[S.mi], TEXT.dim));
      let cy = top + (short ? 62 : 76);
      weatherIcon(g2, S.weather, ix + 22, cy + 18, short ? 38 : 44);
      const wt = this.add.text(ix + 64, cy + 18, D.weather.weather.find(w2 => w2.k === S.weather).t + '.' + (S.mud ? T.map.mud : ''),
        { ...TEXT.body, wordWrap: { width: inner - 64 } }).setOrigin(0, 0.5);
      items.push(wt);
      cy += Math.max(short ? 38 : 44, wt.height) + (short ? 4 : 10);
      // Daylight bar: time used (grey-green), time left to work (yellow), then the dusk walk to the count.
      const day = D.rates.day;
      const start = Math.max(day.earliestStart, S.workEnd - day.length) - (S.weather === 'fine' ? day.fineBonus : 0) - (S.early ?? 0);
      const sunset = S.workEnd + day.workBeforeSunset;
      const bx = ix + 100;
      const bwid = inner - 100 - 130;
      const frac = t => Phaser.Math.Clamp((t - start) / (sunset - start), 0, 1);
      const bh = 16;
      g2.fillStyle(0x0f1512, 1).fillRoundedRect(bx, cy + 4, bwid, bh, bh / 2);
      g2.fillStyle(0x56685c, 1).fillRoundedRect(bx, cy + 4, Math.max(bh, bwid * frac(S.time)), bh, bh / 2);
      const xl = bx + bwid * frac(S.time);
      const xw = bx + bwid * frac(S.workEnd);
      if (xw > xl) g2.fillStyle(COLOURS.accent, 1).fillRect(xl, cy + 4, xw - xl, bh);
      g2.fillStyle(0xd9824a, 1).fillRoundedRect(Math.max(xw, xl), cy + 4, bx + bwid - Math.max(xw, xl), bh, { tl: 0, bl: 0, tr: bh / 2, br: bh / 2 });
      g2.fillStyle(0xfffbea, 1).fillRect(xl - 2, cy, 4, bh + 8);                // you are here
      items.push(this.add.text(ix, cy + 12, clock(S.time), TEXT.body).setOrigin(0, 0.5));
      const left = S.workEnd - S.time;
      items.push(this.add.text(x + w - 18, cy + 12, left > 0 ? fill(D, T.map.left, { left: duration(left) }) : T.map.headHome,
        { ...TEXT.body, color: left > 0 ? COLOURS.text : COLOURS.accentText }).setOrigin(1, 0.5));
      cy += 34;
      // Today's goal (data/goals.js): the note pinned to the tent, with how far along it is.
      const goal = S.goal;
      const gp = sim.goalProgress();
      if (goal && gp) {
        const GD = D.goals;
        const kind = GD.kinds.find(k => k.k === goal.k);
        const right = goal.met ? GD.done : fill(D, GD.progress, gp);
        const rt = this.add.text(x + w - 18, cy + 2, right,
          { ...TEXT.body, color: goal.met ? '#9ed8a0' : COLOURS.accentText, fontStyle: 'bold' }).setOrigin(1, 0);
        const gt = this.add.text(ix + 64, cy + 2, `${GD.label} ${fill(D, kind.text, { n: gp.need, zone: goal.zone })}`,
          { ...(short ? TEXT.small : TEXT.body), wordWrap: { width: inner - 64 - rt.width - 12 } });
        // a little flag, or a tick once it's done
        const fx = ix + 22;
        const fy = cy + 14;
        if (goal.met) {
          g2.fillStyle(COLOURS.done, 1).fillCircle(fx, fy, 15);
          g2.lineStyle(4, 0x1c2420, 1).beginPath().moveTo(fx - 7, fy + 1).lineTo(fx - 2, fy + 6).lineTo(fx + 8, fy - 6).strokePath();
        } else {
          g2.lineStyle(3, 0xfffbea, 1).lineBetween(fx - 8, fy - 14, fx - 8, fy + 15);
          g2.fillStyle(COLOURS.accent, 1).fillTriangle(fx - 7, fy - 14, fx + 13, fy - 7, fx - 7, fy);
        }
        items.push(gt, rt);
        cy += Math.max(30, gt.height) + 8;
      }
      // Reserve health (src/sim/health.js): a bar with its word, and a tick where you started today.
      {
        const H = D.health;
        const hs = sim.health();
        items.push(this.add.text(ix, cy + 12, H.label, TEXT.body).setOrigin(0, 0.5));
        g2.fillStyle(0x0f1512, 1).fillRoundedRect(bx, cy + 4, bwid, bh, bh / 2);
        g2.fillStyle(hs.band.colour, 1).fillRoundedRect(bx, cy + 4, Math.max(bh, bwid * hs.score / 100), bh, bh / 2);
        const gain = S.healthStart === undefined ? 0 : hs.score - S.healthStart;
        if (S.healthStart !== undefined) {
          const sx = bx + bwid * Phaser.Math.Clamp(S.healthStart, 0, 100) / 100;
          const ex = bx + bwid * hs.score / 100;
          if (ex - sx >= 1) g2.fillStyle(H.gainColour, 1).fillRect(sx, cy + 4, ex - sx, bh);    // today's work, bright
          g2.fillStyle(0xfffbea, 1).fillRect(sx - 2, cy, 4, bh + 8);
        }
        const hex = '#' + hs.band.colour.toString(16).padStart(6, '0');
        const arrow = gain >= H.arrowFrom ? ' ▲' : gain <= -H.arrowFrom ? ' ▼' : '';
        items.push(this.add.text(x + w - 18, cy + 12, hs.band.word + arrow, { ...TEXT.body, color: hex, fontStyle: 'bold' }).setOrigin(1, 0.5));
        const zone = this.add.zone(x, cy - 4, w, 32).setOrigin(0).setInteractive();
        zone.on('pointerover', () => this.showHealthCard(true));
        zone.on('pointerout', () => this.showHealthCard(false));
        items.push(zone);
        cy += 34;
      }
      const h = cy - top + 4;
      c.add(panel(this, x, top, w, h));
      c.add(items);
      y = top + h + g;
    }

    // Here: what you found and the jobs. Job buttons shrink if they'd push
    // the bottom row off a short screen.
    const jobs = sim.jobsHere();
    // Finds listed under the place name (e.g. three lines at the boundary fence) take room from the
    // job buttons, so the diary below them isn't squeezed out.
    const foundNow = S.found[S.loc] ?? [];
    let foundH = 0;
    for (const f of foundNow) {
      const probe = this.add.text(0, 0, describe(D, f), wrap(TEXT.dim));
      foundH += probe.height + 4;
      probe.destroy();
    }
    const spare = this.panelArea.h - y - 200 - SIZES.smallButtonHeight - 3 * g - Math.max(0, foundH - FOUND_ROW);
    // Roomy buttons when there's space; on a short window, smaller gaps first, then shorter buttons.
    const per = spare / (jobs.length + 1);
    const jobH = Math.round(Phaser.Math.Clamp(per - JOB_GAP, JOB_MIN_H, SIZES.buttonHeight));
    const jobGap = Math.round(Phaser.Math.Clamp(per - jobH, 4, JOB_GAP));
    section(({ text, btn, skip }) => {
      text(zoneName(D, S.loc), TEXT.heading);
      const found = S.found[S.loc] ?? [];
      for (const f of found) text(describe(D, f), TEXT.dim, 4);
      if (!found.length) skip(FOUND_ROW);       // keep a row for what you find, so the buttons don't jump
      for (const job of jobs) {
        const def = D.jobs.find(j => j.id === job.id);
        const v = job.vars;
        const name = job.id === 'stock'
          ? (v.stock === 'sheep' ? def.nameSheep : v.bogged ? def.nameCow : def.name) : def.name;
        let label = name;
        if (job.blocked) label += ` (${UI.blocked[job.blocked]})`;
        btn(label, {
          height: jobH,
          gap: jobGap,
          right: duration(job.minutes),
          disabled: Boolean(job.blocked),
          onClick: () => this.doJob(job.id),
          onHover: on => this.showHint(on ? this.jobDescription(def, job) : null),
          side: MINI_JOBS.includes(job.id) && !job.blocked ? {
            label: UI.quick,
            onClick: () => this.quickJob(job.id),
            onHover: on => this.showHint(on ? UI.quickHint : null),
          } : null,
        });
      }
      btn(UI.toCount, { height: Math.max(jobH, 40), accent: true, center: true, onClick: () => this.toCount() });
    });

    // Diary: today's events, newest last; the oldest drop off if they don't fit.
    const twoRows = w < ROW_MIN;
    const rowY = this.panelArea.h - (SIZES.smallButtonHeight + g) * (twoRows ? 2 : 1);    // the button row sits at the bottom
    const room = rowY - y - g;
    const lines = S.log.map(e => describe(D, e));
    this.diaryShown = false;
    if (room > 70) {
      const top = y;
      const heading = this.add.text(x + 18, top + 12, UI.diaryHeading, TEXT.heading);
      const texts = (lines.length ? lines : [UI.diaryEmpty]).map(s => this.add.text(x + 18, 0, s,
        wrap(lines.length ? TEXT.body : TEXT.dim)));
      let used = 0;
      const keep = new Set();
      // Newest first. When room is short, "new notebook entry" lines go before real events do.
      const order = lines.length ? [...texts.keys()].reverse() : [0];
      const important = i => !lines.length || S.log[i].k !== 'notebook';
      let full = false;
      for (const group of [order.filter(important), order.filter(i => !important(i))]) {
        for (const i of group) {
          if (full || used + texts[i].height + 4 > room - 52) { full = true; break; }      // never skip a newer line to keep an older one
          used += texts[i].height + 4;
          keep.add(i);
        }
      }
      const shown = texts.filter((t, i) => keep.has(i));
      texts.forEach((t, i) => { if (!keep.has(i)) t.destroy(); });
      let cy = top + 46;
      for (const t of shown) { t.setY(cy); cy += t.height + 4; }
      if (shown.length || !lines.length) {
        c.add(panel(this, x, top, w, room));
        c.add([heading, ...shown]);
      } else heading.destroy();      // nothing fits: no empty "Today" box; the hint over the map says it instead
      const newest = order.find(important);
      this.diaryShown = !lines.length || (newest === undefined ? shown.length > 0 : keep.has(newest));
      y = top + room + g;
    }
    y = Math.max(y, rowY);

    // Notebook, colony, save, load, new game: one row of five.
    const small = { height: SIZES.smallButtonHeight, center: true };
    const weights = [1.25, 1.05, 1, 1, 1.1];
    const total = weights.reduce((n, v) => n + v, 0);
    const avail = w - 4 * 8;
    const labels = [T.map.notebook, T.map.colony, T.map.saveFile, T.map.loadFile, this.confirmNew ? T.map.newGameConfirm : T.map.newGame];
    const clicks = [() => this.scene.start('notebook'), () => this.scene.start('colony'),
      () => game.exportSave(), () => this.loadFile(), () => this.newGame()];
    let bx = x;
    labels.forEach((label, i) => {
      // on a narrow panel: notebook, colony on the first row; save, load, new game on the second
      if (twoRows && i === 2) { bx = x; y += SIZES.smallButtonHeight + g; }
      const bw = twoRows ? (w - 8 * (i < 2 ? 1 : 2)) / (i < 2 ? 2 : 3) : avail * weights[i] / total;
      c.add(button(this, bx, y, bw, label, { ...small, selected: i === 4 && this.confirmNew, onClick: clicks[i] }));
      bx += bw + 8;
    });
  }

  jobDescription(def, job) {
    let desc = def.desc;
    if (job.id === 'nests') desc = job.vars.weigh ? def.descWeigh : job.vars.early ? def.descEarly : def.desc;
    if (job.id === 'stock' && job.vars.stock === 'sheep') desc = def.descSheep;
    if (job.id === 'plant' && job.vars.exposed) desc += def.descExposed;
    return fill(game.data, desc, job.vars);
  }

  /* ---------- actions ---------- */
  doJob(id) {
    if (ROUND_JOBS.includes(id)) {      // the fence walk, bait round and torch round are mini-games
      if (!game.sim.startRounds(id)) return;
      game.save();
      this.scene.start('rounds-' + id);
      return;
    }
    if (id === 'traps') {               // the trap line is a mini-game (TrapLineScene)
      if (!game.sim.startTrapLine()) return;
      game.save();
      this.scene.start('trapline');
      return;
    }
    if (id === 'nests') {               // the nest check too (NestScene)
      if (!game.sim.startNestCheck()) return;
      game.save();
      this.scene.start('nests');
      return;
    }
    if (id === 'plant') {               // so is planting (PlantingScene)
      if (!game.sim.startPlanting()) return;
      game.save();
      this.scene.start('planting');
      return;
    }
    if (id === 'stock') {               // so is the stock job (StockScene: cow, cattle or sheep)
      if (!game.sim.startStock()) return;
      game.save();
      this.scene.start('stock');
      return;
    }
    if (!game.sim.doJob(id)) return;
    game.save();
    this.showCard(null);
    // The diary can be squeezed out on short screens, so show the result here too.
    const log = game.sim.S.log;
    this.showHint(log.length ? describe(game.data, log[log.length - 1]) : null);
    this.drawPins();
    this.buildPanels();
  }

  // The "Quick" button: the job done in one click, no mini-game.
  quickJob(id) {
    if (!game.sim.quickJob(id)) return;
    game.save();
    this.showCard(null);
    const log = game.sim.S.log;
    this.showHint(log.length ? describe(game.data, log[log.length - 1]) : null);
    this.drawPins();
    this.buildPanels();
  }

  toCount() {
    if (!game.sim.toHillside()) return;
    game.save();
    this.scene.start('count');
  }

  loadFile() {
    game.importSave(ok => {
      if (!ok) { this.showHint(UI.notASave); return; }
      this.firstStart = true;
      this.scene.restart();
    });
  }

  newGame() {
    if (!this.confirmNew) {
      this.confirmNew = true;
      this.buildPanels();
      return;
    }
    game.newGame(Math.floor(Date.now() % 1e9));
    this.scene.restart();
  }
}
