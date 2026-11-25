// Where a trap line runs in the close-up: a walking route across real ground.
// No Phaser here, so it can be tested in Node.
//
//   terrainCorners(rawMap)   which terrain is at each tile corner, from the
//                            Tiled map's corner-autotiled layers
//   closeUpView(place, mapSize, closeUp)   the square of map the close-up shows
//   planRoute({ ground, view, place, n, seed, tuning })
//                            a path over land and n stops spaced along it,
//                            or null if there's no room
//
// The route keeps off the sea and the shore, stays inside the view, prefers
// the bush edge (where trap lines really run) and wanders a little, so each
// line looks different. tuning comes from data/trapline.js (route).
import { makeRng, random } from '../sim/rng.js';

export const SEA = 0;
const ROCK = 1;
const GRASS = 2;
const DIRT = 3;
const BUSH = 4;
const LAYERS = ['rock', 'grass', 'dirt', 'bush'];     // codes 1..4, stacked in this order
const FLIP_BITS = 0x1fffffff;                         // Tiled keeps flip flags in a gid's top bits

// Tile id within a terrain sheet = (corners - 1) * 16 + pos, corners bits TL=8 TR=4 BR=2 BL=1
// (see tools/terrain_tiles.py). The top-most layer claiming a corner wins.
export function terrainCorners(raw) {
  const W = raw.width;
  const H = raw.height;
  const cw = W + 1;
  const codes = new Uint8Array(cw * (H + 1));      // SEA everywhere to start
  LAYERS.forEach((name, i) => {
    const layer = raw.layers.find(l => l.type === 'tilelayer' && l.name === name);
    const ts = raw.tilesets.find(t => t.name === 'terrain-' + name);
    if (!layer || !ts) return;
    const code = i + 1;
    layer.data.forEach((gid0, at) => {
      const gid = gid0 & FLIP_BITS;
      if (gid < ts.firstgid || gid >= ts.firstgid + ts.tilecount) return;
      const corners = Math.floor((gid - ts.firstgid) / 16) + 1;
      const x = at % W;
      const y = Math.floor(at / W);
      const claim = (vx, vy) => { const k = vy * cw + vx; if (codes[k] < code) codes[k] = code; };
      if (corners & 8) claim(x, y);
      if (corners & 4) claim(x + 1, y);
      if (corners & 2) claim(x + 1, y + 1);
      if (corners & 1) claim(x, y + 1);
    });
  });
  return { codes, w: cw, h: H + 1, tile: raw.tilewidth };
}

// The close-up's square view: closeUp times the place's size, centred on the
// place but never past the map's edge. (TrapLineScene uses the same sums.)
export function closeUpView(place, mapSize, closeUp) {
  const size = Math.max(place.w, place.h) * closeUp;
  const half = size / 2;
  const cx = Math.min(Math.max(place.x, half), mapSize.w - half);
  const cy = Math.min(Math.max(place.y, half), mapSize.h - half);
  return { x: cx - half, y: cy - half, w: size, h: size };
}

// A small binary heap for the path search.
function heap() {
  const a = [];
  const up = i => { while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } };
  const down = i => {
    for (;;) {
      const l = 2 * i + 1; const r = l + 1; let m = i;
      if (l < a.length && a[l][0] < a[m][0]) m = l;
      if (r < a.length && a[r][0] < a[m][0]) m = r;
      if (m === i) return;
      [a[m], a[i]] = [a[i], a[m]]; i = m;
    }
  };
  return {
    push(item) { a.push(item); up(a.length - 1); },
    pop() { const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; down(0); } return top; },
    get size() { return a.length; },
  };
}

export function planRoute({ ground, view, place, n, seed, tuning: T }) {
  const rng = makeRng(seed);
  const { codes, w: cw, h: ch, tile } = ground;
  const at = (vx, vy) => (vx < 0 || vy < 0 || vx >= cw || vy >= ch ? SEA : codes[vy * cw + vx]);

  // The corners inside the view, less a margin so stops and labels stay in frame.
  const m = view.w * T.margin;
  const x0 = Math.ceil((view.x + m) / tile);
  const x1 = Math.floor((view.x + view.w - m) / tile);
  const y0 = Math.ceil((view.y + m) / tile);
  const y1 = Math.floor((view.y + view.h - m) / tile);
  if (x1 - x0 < 3 || y1 - y0 < 3) return null;
  const gw = x1 - x0 + 1;
  const gh = y1 - y0 + 1;
  const idx = (vx, vy) => (vy - y0) * gw + (vx - x0);

  // Walkable: grass, dirt or bush, and not within seaGap corners of the sea or the rocky shore.
  const ok = new Uint8Array(gw * gh);
  const edge = new Uint8Array(gw * gh);     // grass beside bush, or bush beside grass
  for (let vy = y0; vy <= y1; vy++) {
    for (let vx = x0; vx <= x1; vx++) {
      let nearSea = false;
      let hasBush = false;
      let hasOpen = false;
      for (let dy = -T.seaGap; dy <= T.seaGap && !nearSea; dy++) {
        for (let dx = -T.seaGap; dx <= T.seaGap; dx++) {
          if (at(vx + dx, vy + dy) <= ROCK) { nearSea = true; break; }     // the sea, or the rocky shore above it
        }
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const c = at(vx + dx, vy + dy);
        if (c === BUSH) hasBush = true; else if (c >= GRASS) hasOpen = true;
      }
      ok[idx(vx, vy)] = nearSea ? 0 : 1;
      edge[idx(vx, vy)] = hasBush && hasOpen ? 1 : 0;
    }
  }

  // A smooth wander: random values every few corners, blended between.
  const step = T.wanderEvery;
  const nw = Math.ceil(gw / step) + 2;
  const nh = Math.ceil(gh / step) + 2;
  const coarse = Array.from({ length: nw * nh }, () => random(rng));
  const wander = (gx, gy) => {
    const fx = gx / step; const fy = gy / step;
    const ix = Math.floor(fx); const iy = Math.floor(fy);
    const tx = fx - ix; const ty = fy - iy;
    const v = (i, j) => coarse[j * nw + i];
    return (v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx) * (1 - ty) + (v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx) * ty;
  };
  const cost = new Float32Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const k = gy * gw + gx;
      const c = at(gx + x0, gy + y0);
      // Never below minCost: a free or negative step would send the path search round in circles.
      cost[k] = Math.max(T.minCost, 1 + T.wander * wander(gx, gy) + (c === ROCK ? T.rockCost : c === DIRT ? T.dirtCost : 0) - (edge[k] ? T.edgeBonus : 0));
    }
  }

  // The two ends: one near the place, the other well away from it (a line, not a loop).
  const cells = [];
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) if (ok[gy * gw + gx]) cells.push([gx, gy]);
  if (cells.length < n) return null;
  const px = (place.x / tile) - x0;
  const py = (place.y / tile) - y0;
  const nearPlace = cells.filter(([gx, gy]) => Math.abs(gx - px) * tile <= place.w * 0.6 && Math.abs(gy - py) * tile <= place.h * 0.6);
  const pickFrom = list => list[Math.floor(random(rng) * list.length)];
  const far = Math.min(gw, gh) * T.minLength;
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

  // Cheapest paths from a start corner, eight ways, over walkable corners only.
  const search = a => {
    const best = new Float32Array(gw * gh).fill(Infinity);
    const from = new Int32Array(gw * gh).fill(-1);
    const begin = a[1] * gw + a[0];
    best[begin] = 0;
    const q = heap();
    q.push([0, begin]);
    while (q.size) {
      const [d, k] = q.pop();
      if (d > best[k]) continue;
      const gx = k % gw; const gy = (k - gx) / gw;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = gx + dx; const ny = gy + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const nk = ny * gw + nx;
        if (!ok[nk]) continue;
        if (dx && dy && (!ok[gy * gw + nx] || !ok[ny * gw + gx])) continue;     // no squeezing past the shore diagonally
        const nd = d + Math.hypot(dx, dy) * (cost[k] + cost[nk]) / 2;
        if (nd < best[nk]) { best[nk] = nd; from[nk] = k; q.push([nd, nk]); }
      }
    }
    return { best, from, begin };
  };

  // A few tries at a start whose far end can be reached (a start can be in a pocket of land).
  let found = null;
  for (let tries = 0; tries < T.tries && !found; tries++) {
    const a = pickFrom(nearPlace.length && tries < T.tries / 2 ? nearPlace : cells);
    const res = search(a);
    const reach = cells.filter(([gx, gy]) => res.best[gy * gw + gx] < Infinity);
    const ends = reach.filter(c => dist(a, c) >= far);
    if (ends.length) found = { ...res, b: pickFrom(ends) };
    else if (tries === T.tries - 1 && reach.length > 1) {          // last go: the farthest it can reach
      found = { ...res, b: reach.reduce((m2, c) => (dist(a, c) > dist(a, m2) ? c : m2), reach[0]) };
    }
  }
  if (!found) return null;
  const { from, begin: start, b } = found;

  // The path in map pixels, smoothed into a curve (Chaikin's corner cutting).
  let path = [];
  for (let k = b[1] * gw + b[0]; k >= 0; k = from[k]) {
    const gx = k % gw;
    path.push({ x: (gx + x0) * tile, y: ((k - gx) / gw + y0) * tile });
    if (k === start) break;
  }
  path.reverse();
  for (let r = 0; r < T.smooth; r++) {
    const out = [path[0]];
    for (let i = 0; i < path.length - 1; i++) {
      const p = path[i]; const q2 = path[i + 1];
      out.push({ x: p.x * 0.75 + q2.x * 0.25, y: p.y * 0.75 + q2.y * 0.25 }, { x: p.x * 0.25 + q2.x * 0.75, y: p.y * 0.25 + q2.y * 0.75 });
    }
    out.push(path[path.length - 1]);
    path = out;
  }

  // Stops spaced evenly along it: the tunnel at the start, the last trap at the end.
  const along = [0];
  for (let i = 1; i < path.length; i++) along.push(along[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  const total = along[along.length - 1];
  const pointAt = s => {
    let i = 1;
    while (i < path.length - 1 && along[i] < s) i++;
    const seg = along[i] - along[i - 1] || 1;
    const t = Math.min(1, Math.max(0, (s - along[i - 1]) / seg));
    return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t, y: path[i - 1].y + (path[i].y - path[i - 1].y) * t };
  };
  const stops = Array.from({ length: n }, (_, i) => {
    const s = n > 1 ? total * i / (n - 1) : total / 2;
    return { ...pointAt(s), s };
  });
  return { stops, path, total, pointAt };
}
