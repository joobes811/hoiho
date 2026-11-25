// Small shapes drawn with Phaser Graphics: the penguin silhouette, weather and
// month icons, and the notebook sketches. Nothing here loads files; every
// function takes a Graphics object and draws into it.
const TAU = Math.PI * 2;

// A small penguin from the front, for the notebook sketches (the full-colour
// hoiho is a sprite from tools/hoiho_art.py). s = height in px. Pass a body colour; the belly and
// yellow head band are optional extras (silhouette = body only).
export function penguin(g, x, y, s, o = {}) {
  const { body = 0x1c2420, belly = null, band = 0xe8d27a, eye = true, feet = 0xd9a0a0 } = o;
  const top = y - s / 2;
  const hy = top + s * 0.2;                        // head centre
  g.fillStyle(feet, 1);
  g.fillEllipse(x - s * 0.13, y + s * 0.49, s * 0.2, s * 0.07);
  g.fillEllipse(x + s * 0.13, y + s * 0.49, s * 0.2, s * 0.07);
  g.fillStyle(body, 1);
  g.fillTriangle(x - s * 0.28, y - s * 0.14, x - s * 0.5, y + s * 0.24, x - s * 0.22, y + s * 0.2);   // flippers
  g.fillTriangle(x + s * 0.28, y - s * 0.14, x + s * 0.5, y + s * 0.24, x + s * 0.22, y + s * 0.2);
  g.fillEllipse(x, y + s * 0.08, s * 0.62, s * 0.84);
  g.fillEllipse(x, hy, s * 0.42, s * 0.4);
  if (belly !== null) g.fillStyle(belly, 1).fillEllipse(x, y + s * 0.14, s * 0.4, s * 0.62);
  if (eye) {
    // the pale band: out from each eye and away round the back of the head (no halo over the top)
    g.lineStyle(s * 0.04, band, 1).lineBetween(x - s * 0.09, hy - s * 0.005, x - s * 0.2, hy - s * 0.03).lineBetween(x + s * 0.09, hy - s * 0.005, x + s * 0.2, hy - s * 0.03);
    g.fillStyle(band, 1).fillEllipse(x - s * 0.085, hy + s * 0.01, s * 0.1, s * 0.075).fillEllipse(x + s * 0.085, hy + s * 0.01, s * 0.1, s * 0.075);
    g.fillStyle(0x0e1512, 1).fillCircle(x - s * 0.085, hy + s * 0.01, s * 0.022).fillCircle(x + s * 0.085, hy + s * 0.01, s * 0.022);
  }
  g.fillStyle(0xc99a7a, 1).fillTriangle(x - s * 0.045, hy + s * 0.05, x + s * 0.045, hy + s * 0.05, x, hy + s * 0.15);
}

function cloud(g, x, y, s, colour) {
  g.fillStyle(colour, 1);
  g.fillCircle(x - s * 0.18, y + s * 0.02, s * 0.2).fillCircle(x + s * 0.04, y - s * 0.1, s * 0.26)
    .fillCircle(x + s * 0.24, y + s * 0.04, s * 0.18).fillRect(x - s * 0.18, y + s * 0.02, s * 0.42, s * 0.2);
}

// Weather icons: fine, rain, drizzle, wind, cold, storm. s = width in px.
export function weatherIcon(g, kind, x, y, s) {
  const light = 0xe8e2c8;
  const rain = 0x7fb4d8;
  if (kind === 'fine') {
    g.fillStyle(0xf2c94c, 1).fillCircle(x, y, s * 0.22);
    g.lineStyle(Math.max(2, s * 0.07), 0xf2c94c, 1);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      g.lineBetween(x + Math.cos(a) * s * 0.33, y + Math.sin(a) * s * 0.33, x + Math.cos(a) * s * 0.46, y + Math.sin(a) * s * 0.46);
    }
  } else if (kind === 'wind') {
    g.lineStyle(Math.max(2.5, s * 0.08), light, 1);
    for (const [dy, len] of [[-0.18, 0.8], [0, 0.95], [0.18, 0.65]]) {
      g.lineBetween(x - s * 0.45, y + dy * s, x - s * 0.45 + len * s * 0.8, y + dy * s);
    }
    g.beginPath().arc(x + s * 0.34, y - s * 0.28, s * 0.1, Math.PI * 0.5, Math.PI * 2.1).strokePath();
    g.beginPath().arc(x + s * 0.44, y + s * 0.02, s * 0.1, Math.PI * 0.5, Math.PI * 2.1).strokePath();
  } else {
    cloud(g, x, y - s * 0.1, s, kind === 'storm' ? 0x8a93a0 : light);
    g.lineStyle(Math.max(2, s * 0.07), rain, 1);
    if (kind === 'rain') for (const dx of [-0.22, 0, 0.22]) g.lineBetween(x + dx * s, y + s * 0.2, x + dx * s - s * 0.07, y + s * 0.42);
    if (kind === 'drizzle') {
      g.fillStyle(rain, 1);
      for (const dx of [-0.24, -0.08, 0.08, 0.24]) g.fillCircle(x + dx * s, y + s * (dx > 0 ? 0.4 : 0.3), s * 0.045);
    }
    if (kind === 'cold') {
      g.lineStyle(Math.max(2, s * 0.06), 0xdff2ff, 1);
      for (const dx of [-0.2, 0.2]) {
        const cx = x + dx * s;
        const cy = y + s * 0.36;
        g.lineBetween(cx - s * 0.07, cy, cx + s * 0.07, cy).lineBetween(cx, cy - s * 0.07, cx, cy + s * 0.07);
      }
    }
    if (kind === 'storm') {
      g.fillStyle(0xf2c94c, 1).fillTriangle(x + s * 0.02, y + s * 0.14, x - s * 0.1, y + s * 0.42, x + s * 0.03, y + s * 0.32)
        .fillTriangle(x + s * 0.03, y + s * 0.32, x + s * 0.12, y + s * 0.14, x - s * 0.02, y + s * 0.5);
    }
  }
}

// A calendar page with the month on it (the text is added by the caller).
export function calendarIcon(g, x, y, w, h, colour = 0xf2c94c) {
  g.fillStyle(0xfffbea, 1).fillRoundedRect(x, y, w, h, 5);
  g.fillStyle(colour, 1).fillRoundedRect(x, y, w, h * 0.3, { tl: 5, tr: 5, bl: 0, br: 0 });
  g.fillStyle(0x1c2420, 1).fillCircle(x + w * 0.25, y + h * 0.04, 2.5).fillCircle(x + w * 0.75, y + h * 0.04, 2.5);
}

/* ---------- notebook sketches: pencil line on paper ---------- */
const INK = 0x4a3a28;

// Draws the sketch for notebook entry k centred on (x, y), about s px across.
export function sketch(g, k, x, y, s, tone = 0xb8a070) {
  const ink = (w = 2) => g.lineStyle(w, INK, 1);
  const wash = c => g.fillStyle(c, 0.55);
  const u = s / 100;                              // one unit = 1/100 of the sketch
  const blob = (cx, cy, rx, ry, c) => { wash(c).fillEllipse(x + cx * u, y + cy * u, rx * 2 * u, ry * 2 * u); ink().strokeEllipse(x + cx * u, y + cy * u, rx * 2 * u, ry * 2 * u); };
  const line = (x1, y1, x2, y2, w = 2) => { ink(w).lineBetween(x + x1 * u, y + y1 * u, x + x2 * u, y + y2 * u); };
  const ground = () => line(-46, 30, 46, 30, 1.5);
  switch (k) {
    case 'fine':
      wash(0xf2c94c).fillCircle(x, y, 20 * u); ink().strokeCircle(x, y, 20 * u);
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; line(Math.cos(a) * 28, Math.sin(a) * 28, Math.cos(a) * 42, Math.sin(a) * 42); }
      break;
    case 'cow':
      blob(0, 0, 30, 17, 0xcbb892); blob(-34, -6, 11, 9, 0xcbb892);
      line(-18, 12, -18, 30); line(18, 12, 18, 30); line(-8, 14, -8, 30); line(8, 14, 8, 30); line(30, -4, 40, 8);
      wash(0x7a6a4a).fillEllipse(x, y + 32 * u, 90 * u, 12 * u);
      break;
    case 'soreback':
      blob(-12, 2, 22, 15, 0xe8e2c8); blob(-32, -4, 8, 7, 0x8c8774);
      line(-22, 14, -22, 30); line(-2, 14, -2, 30); ground();
      line(22, -22, 22, 30, 3); line(40, -22, 40, 30, 3); line(18, -10, 44, -10); line(18, 8, 44, 8);
      break;
    case 'sealion':
      blob(0, 10, 36, 14, 0x9a8460); blob(-34, 0, 10, 9, 0x9a8460); line(-42, -8, -42, -14, 2);
      blob(22, 22, 10, 4, 0x9a8460); ground();
      break;
    case 'furseal':
      blob(6, 8, 30, 12, 0x6a5a48); blob(-24, -2, 9, 8, 0x6a5a48); blob(30, 22, 12, 4, 0x6a5a48);
      wash(0x7fb4d8).fillEllipse(x, y + 28 * u, 100 * u, 10 * u);
      break;
    case 'sandflies':
      for (let i = 0; i < 26; i++) { const a = i * 2.4; const r = 8 + (i * 7) % 34; g.fillStyle(INK, 0.85).fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 1.8); }
      break;
    case 'ferret':
      line(-40, 12, -20, -6, 5); line(-20, -6, 10, 6, 5); line(10, 6, 36, -10, 5);
      blob(40, -12, 7, 6, 0xcbb892); line(-40, 12, -46, 22, 3);
      break;
    case 'fence':
      line(-40, -20, -40, 34, 3); line(0, -20, 0, 34, 3); line(40, -20, 40, 34, 3);
      line(-44, -8, 44, -8); line(-44, 8, 44, 8); line(-44, 22, 44, 22);
      penguin(g, x + 14 * u, y + 6 * u, 46 * u, { body: 0x4a4a40, eye: false, feet: INK });
      break;
    case 'tent':
      wash(0xd9a35a).fillTriangle(x - 40 * u, y + 28 * u, x, y - 30 * u, x + 40 * u, y + 28 * u);
      ink().strokeTriangle(x - 40 * u, y + 28 * u, x, y - 30 * u, x + 40 * u, y + 28 * u);
      wash(0x4a3a28).fillTriangle(x - 10 * u, y + 28 * u, x, y - 2 * u, x + 10 * u, y + 28 * u);
      penguin(g, x + 2 * u, y + 20 * u, 26 * u, { body: 0x4a4a40, eye: false, feet: INK });
      break;
    case 'velvet':
      for (let i = 0; i < 12; i++) { const a = i / 11 * 2.2 - 0.2; blob(-30 + i * 6, Math.sin(a * 3) * 8, 6, 5, 0xb08a6a); }
      line(-34, -6, -42, -16, 1.5); line(-32, -8, -34, -18, 1.5);
      break;
    case 'korora':
      penguin(g, x, y, 78 * u, { body: 0x3a5a78, belly: 0xf3efe0, eye: false, feet: 0xcbb892 });
      break;
    case 'titi':      // a sooty shearwater in flight
      ink(3).beginPath().moveTo(x - 40 * u, y).lineTo(x - 18 * u, y - 14 * u).lineTo(x, y).lineTo(x + 18 * u, y - 14 * u).lineTo(x + 40 * u, y).strokePath();
      wash(0x4a3a28).fillEllipse(x, y + 2 * u, 18 * u, 8 * u);
      wash(0xe8d7a0).fillCircle(x + 36 * u, y - 30 * u, 8 * u);
      break;
    case 'family':                                  // grandchicks: drawn like a homecoming
    case 'returned':
      penguin(g, x, y, 82 * u, { body: 0x3a4a52, belly: 0xf3efe0 });
      g.fillStyle(0xd8453a, 1).fillRect(x - 18 * u, y + 30 * u, 8 * u, 7 * u);
      break;
    case 'hunter':    // a phone
      wash(0x8c8774).fillRoundedRect(x - 14 * u, y - 32 * u, 28 * u, 56 * u, 4);
      ink().strokeRoundedRect(x - 14 * u, y - 32 * u, 28 * u, 56 * u, 4);
      line(-8, -20, 8, -20, 1.5); line(-8, 8, 8, 8, 1.5);
      line(20, -20, 30, -28); line(24, -8, 38, -12);
      break;
    case 'workingbee':
      line(-26, 30, -26, -10, 3);
      wash(0xaabf8a).fillTriangle(x - 40 * u, y - 10 * u, x - 12 * u, y - 10 * u, x - 26 * u, y - 36 * u);
      ink(1.5).strokeTriangle(x - 40 * u, y - 10 * u, x - 12 * u, y - 10 * u, x - 26 * u, y - 36 * u);
      line(10, 30, 28, -26, 3); wash(0x8c8774).fillEllipse(x + 8 * u, y + 30 * u, 24 * u, 12 * u); ground();
      break;
    case 'reception':
      for (let i = 0; i < 4; i++) {
        const hh = (10 + i * 12) * u;
        (i === 0 ? wash(0x4a3a28) : wash(0xd8cdb0)).fillRect(x - 36 * u + i * 20 * u, y + 28 * u - hh, 12 * u, hh);
        ink(1.5).strokeRect(x - 36 * u + i * 20 * u, y + 28 * u - hh, 12 * u, hh);
      }
      break;
    /* ---------- events at the start of a visit (data/events.js) ---------- */
    case 'treeDown':  // a limb across the fence
      line(-40, -14, -40, 32, 3); line(40, -14, 40, 32, 3);
      line(-44, -2, 44, -2); line(-44, 14, 44, 14); ground();
      g.lineStyle(11 * u, 0x8a6a48, 0.8).lineBetween(x - 46 * u, y + 22 * u, x + 38 * u, y - 26 * u);
      ink(1.5).lineBetween(x - 46 * u, y + 17 * u, x + 36 * u, y - 31 * u).lineBetween(x - 44 * u, y + 27 * u, x + 40 * u, y - 21 * u);
      blob(40, -30, 9, 7, 0x8fa07c); blob(30, -36, 7, 6, 0x8fa07c);
      break;
    case 'tramper':   // a signpost pointing two ways
      line(0, -32, 0, 32, 3); ground();
      wash(0xd8cdb0).fillTriangle(x, y - 26 * u, x + 40 * u, y - 18 * u, x, y - 10 * u);
      ink(1.5).strokeTriangle(x, y - 26 * u, x + 40 * u, y - 18 * u, x, y - 10 * u);
      wash(0xd8cdb0).fillTriangle(x, y - 6 * u, x - 40 * u, y + 2 * u, x, y + 10 * u);
      ink(1.5).strokeTriangle(x, y - 6 * u, x - 40 * u, y + 2 * u, x, y + 10 * u);
      break;
    case 'volunteer': // a thermos and a cup
      wash(0x6f8f7a).fillRoundedRect(x - 26 * u, y - 30 * u, 26 * u, 60 * u, 5);
      ink().strokeRoundedRect(x - 26 * u, y - 30 * u, 26 * u, 60 * u, 5);
      line(-26, -18, 0, -18, 1.5);
      wash(0xd8cdb0).fillRect(x + 10 * u, y + 6 * u, 24 * u, 24 * u); ink().strokeRect(x + 10 * u, y + 6 * u, 24 * u, 24 * u);
      line(18, 0, 22, -10, 1.5); line(26, 0, 30, -10, 1.5);
      break;
    case 'nursery':   // a tray of seedlings
      wash(0x7a6a4a).fillRect(x - 42 * u, y + 10 * u, 84 * u, 20 * u); ink().strokeRect(x - 42 * u, y + 10 * u, 84 * u, 20 * u);
      for (let i = 0; i < 4; i++) {
        const sx = -30 + i * 20;
        line(sx, 10, sx, -8, 1.5); blob(sx - 5, -10, 6, 4, 0x8fa07c); blob(sx + 5, -14, 6, 4, 0x8fa07c);
      }
      break;
    case 'karearea':  // a falcon stooping, wings swept back
      for (const sd of [-1, 1]) {      // long pointed wings, swept back
        const pts = [x + sd * 6 * u, y - 6 * u, x + sd * 46 * u, y + 6 * u, x + sd * 8 * u, y + 8 * u];
        wash(0x7a5a3a).fillTriangle(...pts); ink(1.5).strokeTriangle(...pts);
      }
      wash(0x7a5a3a).fillTriangle(x - 7 * u, y + 14 * u, x + 7 * u, y + 14 * u, x, y + 32 * u);   // tail
      ink(1.5).strokeTriangle(x - 7 * u, y + 14 * u, x + 7 * u, y + 14 * u, x, y + 32 * u);
      blob(0, 2, 8, 14, 0xb8946a); blob(0, -14, 6, 6, 0x5a4030);
      wash(0xe8d7a0).fillCircle(x + 34 * u, y - 34 * u, 7 * u);
      break;
    case 'photographer':  // a camera with a very long lens
      wash(0x5a5a52).fillRoundedRect(x - 40 * u, y - 14 * u, 34 * u, 28 * u, 4);
      ink().strokeRoundedRect(x - 40 * u, y - 14 * u, 34 * u, 28 * u, 4);
      wash(0x8c8774).fillRect(x - 6 * u, y - 10 * u, 48 * u, 20 * u); ink().strokeRect(x - 6 * u, y - 10 * u, 48 * u, 20 * u);
      line(-6, 14, -6, 34, 2); line(-14, 34, 2, 34, 2);
      break;
    case 'ranger':    // a packet of gingernuts
      wash(0xc9783a).fillRoundedRect(x - 38 * u, y - 20 * u, 76 * u, 40 * u, 6);
      ink().strokeRoundedRect(x - 38 * u, y - 20 * u, 76 * u, 40 * u, 6);
      for (let i = 0; i < 3; i++) blob(-22 + i * 22, 0, 9, 9, 0xb07a3a);
      break;
    case 'flatTyre':  // a wheel, flat at the bottom
      g.lineStyle(9 * u, INK, 0.75).strokeCircle(x, y - 2 * u, 26 * u);
      blob(0, -2, 8, 8, 0x8c8774); ground();
      wash(0x3b2f20).fillEllipse(x, y + 26 * u, 44 * u, 8 * u);
      break;
    case 'wasps':     // a papery nest in a bank, and a few wasps
      blob(0, 4, 26, 22, 0xb8a070);
      line(-24, -2, 24, -2, 1.5); line(-22, 12, 22, 12, 1.5);
      blob(0, 24, 5, 3, 0x3b2f20);
      for (const [wx, wy] of [[-38, -26], [34, -30], [40, 6]]) { blob(wx, wy, 5, 3, 0xd9a35a); line(wx - 3, wy - 4, wx + 3, wy - 7, 1); }
      break;
    case 'bird':      // a bird perched on a branch, side on
      line(14, 6, 42, 20, 5);
      blob(0, 4, 24, 14, tone); blob(-22, -9, 10, 9, tone);
      wash(0x4a3a28).fillTriangle(x - 30 * u, y - 11 * u, x - 42 * u, y - 7 * u, x - 30 * u, y - 5 * u);
      g.fillStyle(0x2a2218, 1).fillCircle(x - 24 * u, y - 11 * u, 1.6 * u);
      line(-2, 8, 12, 2, 2); line(-4, 17, -4, 31); line(6, 17, 6, 31); line(-44, 32, 46, 32, 2.5);
      break;
    default:
      blob(0, 0, 20, 20, 0xd8cdb0);
  }
}
