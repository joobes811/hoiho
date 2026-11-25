// The dusk count's view: sky, clouds, stars, the sea and its waves, the
// drawn landscape layers (tools/count_art.py), rain and mist, and the light
// going from late afternoon to dark. CountScene owns one of these and calls
// update() each frame with the share of the evening gone (0 to 1).
//
// Everything is drawn in "stage" pixels (the view is 1600 x 840) inside
// containers the scene scales to fit the screen.
import { random } from '../../sim/rng.js';

export const ART = 'assets/sprites/count/';
export const LAYERS = ['far', 'beach', 'slope', 'bush', 'fore'];

/* ---------- colour helpers ---------- */
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const pack = ([r, g, b]) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
export const lerp = (a, b, t) => a + (b - a) * t;
export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return pack(A.map((v, i) => lerp(v, B[i], t)));
}
export function multiply(a, b) {
  const A = rgb(a);
  const B = rgb(b);
  return pack(A.map((v, i) => v * B[i] / 255));
}
function greyOf(c) {
  const [r, g, b] = rgb(c);
  const l = 0.3 * r + 0.55 * g + 0.15 * b;
  return pack([l * 0.98, l * 1.0, l * 1.04]);       // a faintly cool grey
}

// The light at share f of the evening, in this weather, with any passing
// effects (gold: the cloud lifting; squall: a shower going through).
export function lightAt(D, f, look, fx = {}) {
  const keys = D.light;
  let i = 0;
  while (i < keys.length - 2 && f > keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = Math.max(0, Math.min(1, (f - a.at) / (b.at - a.at)));
  const grey = Math.min(1, look.grey + (fx.squall ?? 0) * 0.3);
  const dim = look.dim + (fx.squall ?? 0) * 0.12;
  const sky = a.sky.map((c, k) => {
    const m = mix(c, b.sky[k], t);
    return mix(mix(m, greyOf(m), grey), 0x000000, dim * 0.8);
  });
  const sea = a.sea.map((c, k) => {
    const m = mix(c, b.sea[k], t);
    return mix(mix(m, greyOf(m), grey * 0.8), 0x000000, dim * 0.6);
  });
  let land = mix(a.land, b.land, t);
  land = mix(land, greyOf(land), grey * 0.55);
  land = mix(land, 0x000000, dim);
  if (fx.gold) land = mix(land, 0xffd08a, fx.gold * 0.45 * (1 - f * 0.5));
  return {
    f, sky, sea, land,
    glow: lerp(a.glow, b.glow, t) * (1 - grey * 0.85) + (fx.gold ?? 0) * 0.5,
    read: lerp(a.read, b.read, t) * look.read * (1 - (fx.squall ?? 0) * 0.3),
    stars: lerp(a.stars, b.stars, t) * Math.max(0, 1 - grey * 1.4),
    actor: mix(land, 0xffffff, D.penguinLift),
  };
}

// A curve given as [[x, y], ...] sorted by x: its height at x.
export function curveY(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (x <= x1) {
      const [x0, y0] = pts[i - 1];
      return y0 + (y1 - y0) * (x - x0) / Math.max(1e-6, x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

export class CountView {
  // back, front: containers (behind and in front of the birds).
  constructor(scene, back, front, layout, D, weatherKey, rng) {
    this.scene = scene;
    this.L = layout;
    this.D = D;
    this.look = D.weather[weatherKey] ?? D.weather.fine;
    this.rng = rng;
    this.fx = { gold: 0, squall: 0, gust: 0 };
    this.time = 0;
    const [W, H] = layout.size;
    this.W = W;
    this.H = H;
    const r = () => random(rng);

    this.sky = scene.add.graphics();
    this.stars = scene.add.graphics();
    this.starList = Array.from({ length: D.maxStars }, () => ({ x: r() * W, y: -40 + r() * (layout.horizon + 10), s: 0.6 + r() * 1.3, p: r() * 6 }));
    back.add([this.sky, this.stars]);
    // Clouds: overcast weather gets long flat ones as well as puffy ones.
    this.clouds = [];
    for (let i = 0; i < this.look.clouds; i++) {
      const flat = this.look.grey > 0.5 ? r() < 0.6 : r() < 0.2;
      const key = flat ? 'cnt-cloud-2' : (r() < 0.5 ? 'cnt-cloud-0' : 'cnt-cloud-1');
      const img = scene.add.image(r() * (W + 600) - 300, -10 + r() * 190, key)
        .setScale(0.8 + r() * 0.9 + (flat ? 0.5 : 0), 0.5 + r() * 0.5).setAlpha(0.3 + r() * 0.35);
      img.speed = D.cloudSpeed[0] + r() * (D.cloudSpeed[1] - D.cloudSpeed[0]);
      this.clouds.push(img);
      back.add(img);
    }
    this.sea = scene.add.graphics();
    back.add(this.sea);
    this.swells = Array.from({ length: 18 }, (_, i) => ({ p: i / 18, seed: r() * 1000 }));
    this.caps = Array.from({ length: 40 }, () => ({ x: 0, y: 0, life: 0, max: 1 }));
    this.layers = {};
    for (const k of LAYERS) this.layers[k] = scene.add.image(0, 0, 'cnt-' + k).setOrigin(0);
    this.mist = scene.add.graphics();
    this.surf = scene.add.graphics();
    back.add([this.layers.far, this.mist, this.layers.beach, this.surf, this.layers.slope]);
    this.splashes = Array.from({ length: 8 }, () => ({ x: 0, y: 0, life: 0 }));
    // In front of the birds: the bush, the foreground, rain and a little fog.
    this.rain = scene.add.graphics();
    this.fog = scene.add.graphics();
    front.add([this.layers.bush, this.layers.fore, this.fog, this.rain]);
    this.drops = Array.from({ length: Math.max(1, Math.round(this.look.rain * 1.8)) }, () => ({ x: r() * W, y: r() * H, v: 0, len: 0 }));
    for (const d of this.drops) this.resetDrop(d, true);
    this.skyDrawnAt = -1;
    this.light = null;
  }

  shoreY(x) { return curveY(this.L.shore, x); }
  slopeY(x) { return curveY(this.L.slope, x); }

  // A splash where a bird comes out of (or goes back into) the surf.
  splash(x, y) {
    const s = this.splashes.find(p => p.life <= 0) ?? this.splashes[0];
    Object.assign(s, { x, y, life: 1 });
  }

  resetDrop(d, anywhere = false) {
    const r = () => random(this.rng);
    const sleet = this.look.drop === 'sleet';
    d.x = r() * (this.W + 300) - 150;
    d.y = anywhere ? r() * this.H : -20 - r() * 60;
    d.v = sleet ? 120 + r() * 80 : 700 + r() * 400;
    d.len = sleet ? 2 + r() * 2 : 12 + r() * 16;
  }

  update(dt, f) {
    this.time += dt;
    for (const k of Object.keys(this.fx)) this.fx[k] = Math.max(0, this.fx[k] - dt / this.fxLength(k));
    const L = this.light = lightAt(this.D, f, this.look, this.fx);
    // The sky only changes slowly: redraw it a few times a second.
    if (this.time - this.skyDrawnAt > 0.25) { this.drawSky(L); this.skyDrawnAt = this.time; }
    this.drawStars(L);
    const wind = Math.min(1, this.look.wind + this.fx.gust);
    const cloudTint = mix(mix(0xffffff, L.sky[2], 0.35), L.land, 0.5);
    for (const c of this.clouds) {
      c.x += c.speed * (0.6 + wind) * dt;
      if (c.x - c.displayWidth / 2 > this.W + 40) c.x = -c.displayWidth / 2 - 40;
      c.setTint(cloudTint, cloudTint, mix(cloudTint, 0x6a6a7a, 0.35), mix(cloudTint, 0x6a6a7a, 0.35));
    }
    this.drawSea(L, dt, wind);
    this.drawSurf(L, dt);
    const farTint = mix(L.land, L.sky[2], 0.18 + this.look.haze * 0.3);
    this.layers.far.setTint(farTint);
    for (const k of ['beach', 'slope', 'bush', 'fore']) this.layers[k].setTint(L.land);
    this.drawMist(L);
    this.drawRain(L, dt, wind);
  }

  fxLength(k) {
    return k === 'gold' ? this.D.goldSeconds : k === 'squall' ? this.D.squallSeconds : this.D.gustSeconds;
  }

  drawSky(L) {
    const g = this.sky.clear();
    const top = -60;
    const hz = this.L.horizon + 4;
    const bands = 40;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const c = t < 0.55 ? mix(L.sky[0], L.sky[1], t / 0.55) : mix(L.sky[1], L.sky[2], (t - 0.55) / 0.45);
      const y0 = top + (hz - top) * i / bands;
      g.fillStyle(c, 1).fillRect(-20, y0, this.W + 40, (hz - top) / bands + 1);
    }
    // A warm glow low on the right, where the sun's going down behind the hills.
    if (L.glow > 0.02) {
      const warm = mix(L.sky[2], 0xffc27a, 0.55);
      for (let k = 6; k >= 1; k--) {
        g.fillStyle(warm, 0.06 * L.glow).fillEllipse(1320, hz, 260 * k, 70 * k);
      }
    }
  }

  drawStars(L) {
    const g = this.stars.clear();
    if (L.stars < 0.02) return;
    for (const s of this.starList) {
      const tw = 0.6 + 0.4 * Math.sin(this.time * 1.3 + s.p);
      g.fillStyle(0xf4f0e0, L.stars * tw * 0.8).fillCircle(s.x, s.y, s.s);
    }
  }

  drawSea(L, dt, wind) {
    const g = this.sea.clear();
    const hz = this.L.horizon;
    const bottom = 600;
    const bands = 28;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const y0 = hz + (bottom - hz) * (t ** 1.4);
      const y1 = hz + (bottom - hz) * (((i + 1) / (bands - 1)) ** 1.4);
      g.fillStyle(mix(L.sea[0], L.sea[1], t), 1).fillRect(-20, y0, this.W + 40, y1 - y0 + 1);
    }
    // A pale line at the horizon.
    g.fillStyle(mix(L.sky[2], 0xffffff, 0.2), 0.5).fillRect(-20, hz - 1, this.W + 40, 2);
    // Swells rolling slowly in: faint lighter lines, wider apart as they come closer.
    const light = mix(L.sea[0], L.sky[2], 0.55);
    for (const s of this.swells) {
      s.p = (s.p + dt / 26) % 1;
      const y = hz + 6 + (bottom - hz) * (s.p ** 1.6);
      const a = Math.sin(s.p * Math.PI) * 0.22;
      const len = 30 + 160 * s.p;
      g.lineStyle(1 + s.p * 2, light, a);
      for (let x = -40 + (s.seed % 120); x < this.W; x += len * 2.2) {
        const xx = x + Math.sin(this.time * 0.3 + s.seed + x) * 10;
        g.lineBetween(xx, y, xx + len, y + Math.sin(xx * 0.01) * 1.5);
      }
    }
    // Glints on the water under the glow.
    if (L.glow > 0.1) {
      const warm = mix(L.sky[2], 0xffe2a8, 0.6);
      for (let i = 0; i < 40; i++) {
        const y = hz + 4 + (i * 37 % 110);
        const x = 1080 + ((i * 131) % 460) + Math.sin(this.time * 0.8 + i) * 18;
        const a = Math.max(0, Math.sin(this.time * 1.7 + i * 2.3)) * L.glow * 0.55;
        g.fillStyle(warm, a).fillRect(x, y, 10 + (i % 5) * 4, 1.5);
      }
    }
    // Whitecaps when it's windy.
    const want = Math.round(this.caps.length * Math.max(0, wind - 0.25) / 0.75);
    this.caps.forEach((c, i) => {
      if (c.life > 0) {
        c.life -= dt;
        const t = 1 - c.life / c.max;
        g.fillStyle(mix(0xffffff, L.land, 0.5), Math.sin(t * Math.PI) * 0.7)
          .fillEllipse(c.x, c.y, 8 + (c.y - hz) * 0.08, 2 + (c.y - hz) * 0.01);
      } else if (i < want && random(this.rng) < dt * 0.8) {
        const y = hz + 10 + (random(this.rng) ** 1.5) * 250;
        const x = random(this.rng) * this.W;
        if (y < this.shoreY(x) - 20) Object.assign(c, { x, y, life: 1.2 + random(this.rng), max: 2 });
        c.max = c.life;
      }
    });
  }

  drawSurf(L, dt) {
    const g = this.surf.clear();
    const pts = this.L.shore;
    const foam = mix(0xffffff, L.land, 0.55);
    const period = this.D.waveSeconds;
    // Two waves out of step, each: a breaker coming in, a wash up the sand, then back.
    for (let w = 0; w < 2; w++) {
      const q = ((this.time / period) + w * 0.5) % 1;
      let off;
      let alpha;
      if (q < 0.45) { off = lerp(-34, 0, (q / 0.45) ** 1.5); alpha = 0.25 + q; }
      else if (q < 0.7) { off = lerp(0, 18, Math.sin((q - 0.45) / 0.25 * Math.PI / 2)); alpha = 0.7; }
      else { off = lerp(18, 0, (q - 0.7) / 0.3); alpha = 0.7 * (1 - (q - 0.7) / 0.3); }
      // Over the rock platform and the headland's foot the water barely runs up.
      const damp = x => Math.max(0.15, Math.min(1, (x - 420) / 260));
      const edge = pts.map(([x, y], i) => [x, y + off * damp(x) * (0.7 + 0.3 * Math.sin(x * 0.013 + w * 2 + i * 0.1))]);
      if (off > 0) {
        // The wash: a see-through sheet from the shore line to its edge.
        g.fillStyle(mix(L.sea[1], 0xffffff, 0.35), 0.35 * alpha);
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const [x, y] of pts) g.lineTo(x, y);
        for (let i = edge.length - 1; i >= 0; i--) g.lineTo(edge[i][0], edge[i][1]);
        g.closePath();
        g.fillPath();
      }
      // The foam line: a wide soft stroke under a thin bright one, broken up along its length.
      const seg = 6;
      for (let i = 0; i + seg < edge.length; i += seg) {
        const a = alpha * (0.55 + 0.45 * Math.sin(i * 0.7 + w * 3 + this.time * 0.6));
        if (a <= 0.05) continue;
        const part = edge.slice(i, i + seg + 1);
        for (const [wd, k] of [[off < 0 ? 7 : 6, 0.18], [off < 0 ? 1.6 + (off + 34) / 20 : 2, 0.6]]) {
          g.lineStyle(wd, foam, a * k);
          g.beginPath();
          g.moveTo(part[0][0], part[0][1]);
          for (const [x, y] of part) g.lineTo(x, y);
          g.strokePath();
        }
      }
    }
    // The constant thin froth at the water's edge.
    g.lineStyle(1.5, foam, 0.3);
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1] - 2);
    for (const [x, y] of pts) g.lineTo(x, y - 2 + Math.sin(this.time * 2 + x * 0.05) * 1.2);
    g.strokePath();
    for (const s of this.splashes) {
      if (s.life <= 0) continue;
      s.life -= dt / 1.2;
      const t = 1 - s.life;
      g.lineStyle(2, foam, s.life * 0.8).strokeEllipse(s.x, s.y, 16 + t * 40, 5 + t * 10);
    }
  }

  drawMist(L) {
    const g = this.mist.clear();
    const haze = Math.min(1, this.look.haze + this.fx.squall * 0.35);
    if (haze <= 0.01) return;
    const c = mix(L.sky[2], L.sky[1], 0.4);
    const hz = this.L.horizon;
    for (let i = 0; i < 10; i++) {
      g.fillStyle(c, haze * 0.12).fillRect(-20, hz - 30 + i * 6, this.W + 40, 200 - i * 14);
    }
    const f = this.fog.clear();
    f.fillStyle(c, haze * 0.16).fillRect(-20, -60, this.W + 40, this.H + 80);
  }

  drawRain(L, dt, wind) {
    const g = this.rain.clear();
    const active = Math.min(this.drops.length, Math.round(this.look.rain * (1 + this.fx.squall * 0.8) + this.fx.squall * 160));
    if (!active) return;
    const sleet = this.look.drop === 'sleet';
    const c = mix(0xe6ecf2, L.land, 0.35);
    const slant = 0.12 + wind * 0.45;
    if (!sleet) g.lineStyle(1.3, c, 0.38);
    for (let i = 0; i < active; i++) {
      const d = this.drops[i];
      d.y += d.v * dt;
      d.x += d.v * slant * dt;
      if (d.y > this.H + 20) this.resetDrop(d);
      if (sleet) g.fillStyle(c, 0.7).fillCircle(d.x, d.y, d.len * 0.5);
      else g.lineBetween(d.x, d.y, d.x - d.len * slant, d.y - d.len);
    }
  }
}
