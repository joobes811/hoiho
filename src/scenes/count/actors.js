// The things that move in the dusk count: penguins (hoiho and kororā),
// shags, a gull, tītī, seals, kelp, the rock, and sandflies. Each is a small
// object with update(dt, light) and, if you can click it, a big invisible
// click area (`hit`). They live in the scene's actor container and are
// sorted by height on screen so nearer things draw in front.
//
// Movement is plain code; all the small luck (where a bird lands, whether
// it dips back into the surf) comes from the count's own seeded generator.
import { random } from '../../sim/rng.js';
import { lerp, mix, curveY } from './view.js';

const between = (rng, [a, b]) => a + random(rng) * (b - a);

// A soft ring on the ground round whatever the mouse is over, so it's clear
// what a click will pick. Pale yellow, like the game's highlights.
const RING = 0xf2c94c;
function hoverRing(scene) {
  return scene.add.ellipse(0, 0, 10, 10, RING, 0.16).setStrokeStyle(2.5, RING, 0.75).setVisible(false);
}
function placeRing(ring, x, y, w, on, alpha) {
  ring.setVisible(on);
  if (on) ring.setPosition(x, y - 2).setSize(w, w * 0.32).setAlpha(Math.min(1, alpha));
  // Ellipse shapes keep their geometry in step with setSize only after updateDisplayOrigin.
  if (on) ring.updateDisplayOrigin?.();
}

// A penguin walking a planned route: come out of the surf, maybe turn back
// in once or twice, then waddle up the beach and the track into the bush.
export class Bird {
  constructor(scene, ctx, opts) {
    const { kind, line, x } = opts;
    this.scene = scene;
    this.ctx = ctx;               // { view, layout, D, rng, container, onClick }
    this.kind = kind;
    this.line = line ?? null;
    const D = ctx.D;
    this.res = ctx.layout.res ?? 1;      // the pictures are drawn at this many times their size in the view
    const move = (kind === 'hoiho' && line?.quirk != null ? D.quirkMoves[line.quirk] : null) ?? {};
    this.move = move;
    this.speed = (kind === 'hoiho' ? D.walkSpeed : D.kororaSpeed) * (move.speed ?? 1);
    this.shadow = scene.add.ellipse(0, 0, 40, 9, 0x1a2018, 0.28);
    this.sprite = scene.add.image(0, 0, kind === 'korora' ? 'cnt-korora-0' : `cnt-${kind}-stand`).setOrigin(0.5, 1);
    this.pic = { w: this.sprite.width, h: this.sprite.height };
    this.band = kind === 'hoiho' ? scene.add.rectangle(0, 0, 5, 3, D.bandColours[line.band[0]] ?? 0xffffff) : null;
    this.ring = hoverRing(scene);
    this.hover = false;
    // The click area is worked out by the scene (CountScene.pick), which asks each thing for its rect.
    this.rect = { x: x, y: 0, w: D.hitWidth, h: D.hitHeight };
    this.live = false;
    ctx.container.add([this.ring, this.shadow, this.sprite]);
    // The leg band is only drawn in the binocular view (the plain view is too far off to see it).
    if (this.band) ctx.bands.add(this.band);
    this.x = x;
    this.y = ctx.view.shoreY(x) + 4;
    this.flip = false;
    this.steps = this.plan();
    this.step = null;
    this.stepTime = 0;
    this.walkClock = 0;
    this.visible = 0;             // share of the bird above the water (0 to 1)
    this.alpha = 1;
    this.done = false;
    this.counted = false;
    this.identified = false;
    this.nextStep();
  }

  plan() {
    const { D, layout: L, rng } = this.ctx;
    const r = () => random(rng);
    const steps = [{ type: 'emerge' }];
    const shore = this.ctx.view.shoreY(this.x);
    if (this.move.shore) steps.push({ type: 'pause', s: this.move.shore, pose: 'stand' });
    const dips = this.move.dips ?? (this.kind === 'hoiho' && r() < D.dipChance ? 1 : 0);
    for (let i = 0; i < dips; i++) {
      steps.push({ type: 'walk', to: [this.x + (r() - 0.5) * 30, shore + 14 + r() * 8] });
      steps.push({ type: 'pause', s: 0.6 + r() * 0.8, pose: 'stand' });
      steps.push({ type: 'dip', s: between(rng, D.dipSeconds), dx: (r() - 0.5) * 90 });
    }
    if (this.kind === 'korora') {
      // Kororā scurry up the left of the beach and into the tussock.
      const tx = 180 + r() * 260;
      steps.push({ type: 'walk', to: [lerp(this.x, tx, 0.5), curveY(L.slope, lerp(this.x, tx, 0.5)) - 10] });
      steps.push({ type: 'walk', to: [tx, curveY(L.slope, tx) + 40 + r() * 30] });
      steps.push({ type: 'leave', to: [tx - 20, curveY(L.slope, tx) + 80] });
      return steps;
    }
    const pause = () => { if (r() < D.pauseChance) steps.push({ type: 'pause', s: between(rng, D.pauseSeconds), pose: 'stand' }); };
    const [tx0, ty0] = L.track[0];
    // Up the beach towards the start of the track.
    const mid = [lerp(this.x, tx0, 0.45) + (r() - 0.5) * 60, lerp(shore, ty0, 0.5) + (r() - 0.5) * 20];
    if (this.move.detour) mid[1] = Math.min(mid[1] + this.move.detour * 0.4, ty0 + 20), mid[0] -= this.move.detour * 0.5;
    steps.push({ type: 'walk', to: mid });
    pause();
    if (this.move.nosy) {
      // Comes over for a look at you first.
      steps.push({ type: 'walk', to: [mid[0] - 40, 760] });
      steps.push({ type: 'pause', s: 4, pose: 'front' });
    }
    steps.push({ type: 'walk', to: [tx0 + (r() - 0.5) * 30, ty0 + (r() - 0.5) * 8] });
    pause();
    for (let i = 1; i < L.track.length - 1; i++) {
      const [x, y] = L.track[i];
      steps.push({ type: 'walk', to: [x + (r() - 0.5) * 16, y + (r() - 0.5) * 8] });
      if (i === 2 && this.move.stop) steps.push({ type: 'pause', s: this.move.stop, pose: 'stand' });
      else if (i === 2) pause();
    }
    const e = L.entries[Math.floor(r() * L.entries.length)];
    steps.push({ type: 'walk', to: e });
    steps.push({ type: 'leave', to: [e[0] + 46, e[1] - 6] });
    return steps;
  }

  nextStep() {
    this.step = this.steps.shift() ?? null;
    this.stepTime = 0;
    if (!this.step) { this.done = true; return; }
    if (this.step.type === 'emerge') this.ctx.view.splash(this.x, this.ctx.view.shoreY(this.x) + 2);
  }

  // How near the bird is: 0 at the waterline, 1 at the bush edge.
  nearness() {
    const shore = 500;
    const bush = 690;
    return Math.max(0, Math.min(1, (this.y - shore) / (bush - shore)));
  }

  scale() {
    return lerp(this.ctx.D.sizeFar, this.ctx.D.sizeNear, this.nearness()) * (this.kind === 'korora' ? 0.95 : 1) / this.res;
  }

  update(dt, light) {
    if (this.done) return;
    const s = this.step;
    this.stepTime += dt;
    let pose = 'walk';
    const { D, view } = this.ctx;
    if (s.type === 'emerge') {
      const t = Math.min(1, this.stepTime / D.emergeSeconds);
      this.visible = t >= 1 ? 1 : 0.35 + 0.65 * t;
      this.alpha = Math.min(1, t * 2.5);
      pose = 'stand';
      if (t >= 1) this.nextStep();
    } else if (s.type === 'dip') {
      // Back into the surf, gone a while, then out again a little way along.
      const out = 0.9;
      if (this.stepTime < out) {
        this.visible = 1 - 0.65 * (this.stepTime / out);
        this.alpha = 1 - this.stepTime / out;
        this.y = lerp(this.y, view.shoreY(this.x) + 2, dt * 3);
      } else if (this.stepTime < s.s) {
        this.alpha = 0;
      } else {
        this.x += s.dx;
        this.y = view.shoreY(this.x) + 4;
        this.steps.unshift({ type: 'emerge' });
        this.nextStep();
      }
      pose = 'walk';
    } else if (s.type === 'pause') {
      pose = s.pose;
      if (this.stepTime >= s.s) this.nextStep();
    } else {
      const [tx, ty] = s.to;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      const v = this.speed * (0.7 + 0.3 * this.scale() / D.sizeNear) * dt;
      if (Math.abs(dx) > 1) this.flip = dx < 0;
      if (s.type === 'leave') this.alpha = Math.max(0, this.alpha - dt * 0.9);
      if (d <= v || (s.type === 'leave' && this.alpha <= 0)) {
        this.x = tx; this.y = ty;
        this.nextStep();
      } else {
        this.x += dx / d * v;
        this.y += dy / d * v;
      }
    }
    this.draw(pose, dt, light);
  }

  draw(pose, dt, light) {
    const sc = this.scale();
    const { w, h } = this.pic;
    const sp = this.sprite;
    let bob = 0;
    if (pose === 'walk') {
      this.walkClock += dt;
      const frame = Math.floor(this.walkClock / this.ctx.D.stepSeconds) % 2;
      sp.setTexture(`cnt-${this.kind}-${frame}`);
      bob = Math.abs(Math.sin(this.walkClock / this.ctx.D.stepSeconds * Math.PI)) * 1.6;
      sp.setRotation((frame ? 0.06 : -0.06) * (this.flip ? -1 : 1));
    } else {
      sp.setTexture(this.kind === 'korora' ? 'cnt-korora-0' : pose === 'front' ? 'cnt-hoiho-front' : 'cnt-hoiho-stand');
      sp.setRotation(0);
    }
    sp.setScale(sc).setFlipX(this.flip).setTint(light.actor).setAlpha(this.alpha);
    if (this.line?.thin) sp.setScale(sc * 0.88, sc);
    // In the surf only the top of the bird shows: crop it at the water line.
    const vis = this.visible;
    const water = this.ctx.view.shoreY(this.x) + 4;
    if (vis < 1) {
      sp.setCrop(0, 0, w, h * vis);
      sp.setPosition(this.x, Math.min(this.y, water) + h * (1 - vis) * sc);
    } else {
      sp.isCropped = false;
      sp.setPosition(this.x, this.y - bob);
    }
    const shown = vis >= 1 && this.alpha > 0;
    const k = sc * this.res;                // size against the old 1x pictures
    this.shadow.setPosition(this.x, this.y).setScale(k * 0.9, k).setVisible(shown).setAlpha(0.28 * this.alpha);
    placeRing(this.ring, this.x, this.y, this.pic.w * sc * 0.95, this.hover && shown, this.alpha);
    if (this.band) {
      const L = this.ctx.layout;
      const bx = this.x + (L.band[0] - 0.5) * w * sc * (this.flip ? -1 : 1);
      const by = this.y - bob - (1 - L.band[1]) * h * sc;
      this.band.setPosition(bx, by).setSize(Math.max(4, 9 * k), Math.max(2.5, 5.5 * k)).setVisible(shown)
        .setAlpha(this.alpha * Math.min(1, light.read + 0.2));
    }
    // A generous click area: never smaller than hitWidth x hitHeight, and always covering the bird.
    const D = this.ctx.D;
    const hw = Math.max(D.hitWidth, w * sc * 0.9);
    const hh = Math.max(D.hitHeight, h * sc + 14);
    this.rect = { x: this.x, y: this.y + 6 - hh / 2, w: hw, h: hh };
    this.live = this.alpha > 0.3;
    const depth = this.y;
    this.shadow.depth = depth - 0.2;
    this.ring.depth = depth - 0.3;
    sp.depth = depth;
    if (this.band) this.band.depth = depth + 0.1;
  }

  // The top of the bird on the stage, for name cards.
  top() {
    return { x: this.x, y: this.y - this.pic.h * this.scale() - 6 };
  }

  destroy() {
    for (const o of [this.ring, this.shadow, this.sprite, this.band]) o?.destroy();
  }
}

// Something that sits still and can be clicked: the rock, a standing shag,
// the sea lion, the fur seal, kelp in the shore break.
export class Thing {
  constructor(scene, ctx, { kind, key, x, y, scale = 1, fadeIn = 0, rock = false }) {
    this.scene = scene;
    this.ctx = ctx;
    this.kind = kind;
    this.x = x;
    this.y = y;
    const res = ctx.layout.res ?? 1;       // the pictures are drawn at this many times their size in the view
    this.sprite = scene.add.image(x, y, key).setOrigin(0.5, 1).setScale(scale / res);
    this.base = scale / res;
    this.ring = hoverRing(scene);
    this.hover = false;
    const hw = Math.max(64, this.sprite.displayWidth + 16);
    const hh = Math.max(64, this.sprite.displayHeight + 16);
    this.rect = { x, y: y - this.sprite.displayHeight / 2, w: hw, h: hh };
    this.live = true;
    ctx.container.add([this.ring, this.sprite]);
    this.alpha = fadeIn ? 0 : 1;
    this.fadeIn = fadeIn;
    this.fadeOut = 0;
    this.time = 0;
    this.rock = rock;
    this.done = false;
    this.sprite.depth = y;
    this.ring.depth = y - 0.3;
  }

  leave(seconds) { this.fadeOut = seconds; }

  update(dt, light) {
    this.time += dt;
    if (this.fadeIn && this.alpha < 1) this.alpha = Math.min(1, this.alpha + dt / this.fadeIn);
    if (this.fadeOut) {
      this.alpha -= dt / this.fadeOut;
      if (this.alpha <= 0) { this.done = true; return; }
    }
    if (this.kind === 'sealion') this.sprite.setTexture(Math.sin(this.time * 0.25) > 0.85 ? 'cnt-sealion-up' : 'cnt-sealion');
    if (this.kind === 'kelp') {
      // Rolls in and out with the waves.
      this.sprite.y = this.y + Math.sin(this.time * 0.9) * 6;
      this.sprite.rotation = Math.sin(this.time * 0.6) * 0.3;
    }
    // The rock only looks like a penguin once the light goes.
    const tint = this.rock ? light.land : light.actor;
    this.sprite.setTint(tint).setAlpha(this.alpha);
    placeRing(this.ring, this.x, this.y, Math.min(this.sprite.displayWidth * 0.95, 150), this.hover, this.alpha);
    this.live = this.alpha > 0.3;
  }

  top() { return { x: this.x, y: this.y - this.sprite.displayHeight - 6 }; }

  destroy() { this.sprite.destroy(); this.ring.destroy(); }
}

// Birds flying across: a shag low over the water, a gull dropping in for a
// look, or a stream of tītī coming in out of the dark. Not clickable.
export class Flyer {
  constructor(scene, ctx, { key, from, to, seconds, scale = 1, flap = 0.18, land = null, stay = 0 }) {
    this.ctx = ctx;
    this.key = key;
    this.from = from;
    this.to = to;
    this.seconds = seconds;
    this.flap = flap;
    this.land = land;              // a gull: [x, y] to stand at for `stay` seconds
    this.stay = stay;
    this.time = 0;
    this.done = false;
    this.sprite = scene.add.image(from[0], from[1], `${key}-0`).setScale(scale / (ctx.layout.res ?? 1)).setFlipX(to[0] < from[0]);
    ctx.container.add(this.sprite);
  }

  update(dt, light) {
    this.time += dt;
    const sp = this.sprite;
    sp.setTint(mix(light.land, 0x000000, 0.15));
    if (this.land) {
      const half = this.seconds / 2;
      if (this.time < half) {
        const t = this.time / half;
        sp.setPosition(lerp(this.from[0], this.land[0], t), lerp(this.from[1], this.land[1], t) - Math.sin(t * Math.PI) * 30);
        sp.setTexture(`${this.key}-fly-${Math.floor(this.time / this.flap) % 2}`).setOrigin(0.5);
      } else if (this.time < half + this.stay) {
        sp.setPosition(this.land[0], this.land[1]).setTexture(this.key).setOrigin(0.5, 1);
      } else {
        const t = (this.time - half - this.stay) / half;
        if (t >= 1) { this.done = true; return; }
        sp.setFlipX(this.to[0] < this.land[0]).setOrigin(0.5);
        sp.setPosition(lerp(this.land[0], this.to[0], t), lerp(this.land[1], this.to[1], t) - Math.sin(t * Math.PI) * 20);
        sp.setTexture(`${this.key}-fly-${Math.floor(this.time / this.flap) % 2}`);
      }
      sp.depth = sp.y;
      return;
    }
    const t = this.time / this.seconds;
    if (t >= 1) { this.done = true; return; }
    sp.setPosition(lerp(this.from[0], this.to[0], t), lerp(this.from[1], this.to[1], t) + Math.sin(this.time * 2) * 3);
    sp.setTexture(`${this.key}-${Math.floor(this.time / this.flap) % 2}`);
    sp.depth = 0;
  }

  destroy() { this.sprite.destroy(); }
}

// Sandflies on a still evening: a small pooled swarm near you. Click near
// them to flick them away; a few more come back after a while. Optional.
export class Sandflies {
  constructor(scene, ctx, n) {
    this.ctx = ctx;
    this.g = scene.add.graphics();
    ctx.front.add(this.g);
    this.flies = Array.from({ length: n }, () => ({ x: 0, y: 0, vx: 0, vy: 0, on: false, away: 0 }));
    this.active = false;
    this.time = 0;
  }

  start() {
    this.active = true;
    for (const f of this.flies) this.spawn(f);
  }

  spawn(f) {
    const r = () => random(this.ctx.rng);
    Object.assign(f, { x: 200 + r() * 1000, y: 690 + r() * 140, vx: 0, vy: 0, on: true, away: 0 });
  }

  // Wave them off: any fly near the click (stage pixels) darts away.
  flick(p) {
    if (!this.active) return;
    for (const f of this.flies) {
      if (f.on && !f.away && Math.hypot(f.x - p.x, f.y - p.y) < 140) {
        f.away = 1;
        const a = Math.atan2(f.y - p.y, f.x - p.x);
        f.vx = Math.cos(a) * 600;
        f.vy = Math.sin(a) * 600 - 200;
      }
    }
  }

  update(dt, light) {
    const g = this.g.clear();
    if (!this.active) return;
    this.time += dt;
    const r = () => random(this.ctx.rng);
    for (const f of this.flies) {
      if (!f.on) {
        if (r() < dt * 0.05) this.spawn(f);     // they always come back, slowly
        continue;
      }
      if (f.away) {
        f.away -= dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.away <= 0) f.on = false;
      } else {
        f.vx += (r() - 0.5) * 900 * dt;
        f.vy += (r() - 0.5) * 900 * dt;
        f.vx *= 0.92;
        f.vy *= 0.92;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
      g.fillStyle(mix(0x2a2622, light.land, 0.2), 0.9).fillCircle(f.x, f.y, 2.2);
      g.fillStyle(0xe8e8e0, 0.25).fillEllipse(f.x + (Math.sin(this.time * 60 + f.x) > 0 ? 2 : -2), f.y - 2, 4, 2);
    }
  }
}
