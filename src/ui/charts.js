// Small charts drawn with Graphics and Text. Each returns the objects it made,
// so a caller can add them to a container.
import { COLOURS } from './styles.js';

const FONT = 'Georgia, "Times New Roman", serif';
const AXIS = { fontFamily: FONT, fontSize: '18px', color: COLOURS.textDim };
const TITLE_H = 30;               // px: room for the chart's title
const LABEL_H = 24;               // px: room above the tallest bar (or point) for its value

// points: [{ label, value }]. Bars for counts, a line for 0-100 scores.
//   o: { title, colour, max, line, lastLabel }
export function chart(scene, x, y, w, h, points, o = {}) {
  const out = [];
  const colour = o.colour ?? 0x8fbf9f;
  out.push(scene.add.text(x, y, o.title ?? '', { ...AXIS, fontSize: '19px', color: COLOURS.text }));
  const top = y + TITLE_H + LABEL_H;              // the plot's top: the title, then room for the top value
  const bottom = y + h - 24;                      // room for the x labels under the plot
  const left = x + 40;
  const right = x + w - 6;
  const g = scene.add.graphics();
  out.unshift(g);
  const max = o.max ?? Math.max(4, Math.ceil(Math.max(...points.map(p => p.value), 1) * 1.15 / 4) * 4);
  const py = v => bottom - (bottom - top) * Math.min(1, v / max);
  // grid: baseline, a middle line and a faint top line, with their values
  g.lineStyle(1, COLOURS.panelEdge, 1).lineBetween(left, bottom, right, bottom).lineBetween(left, py(max / 2), right, py(max / 2));
  g.lineStyle(1, COLOURS.panelEdge, 0.45).lineBetween(left, top, right, top);
  out.push(scene.add.text(left - 8, py(max / 2), String(Math.round(max / 2)), AXIS).setOrigin(1, 0.5));
  out.push(scene.add.text(left - 8, top, String(Math.round(max)), AXIS).setOrigin(1, 0.5));
  if (!points.length) return out;
  const step = (right - left) / points.length;
  const label = (i, p) => {
    out.push(scene.add.text(left + step * (i + 0.5), bottom + 3, p.label, AXIS).setOrigin(0.5, 0));
  };
  const every = Math.ceil(points.length / 7);       // keep x labels from crowding
  if (o.line) {
    g.lineStyle(3, colour, 1).beginPath();
    points.forEach((p, i) => { const px = left + step * (i + 0.5); if (i) g.lineTo(px, py(p.value)); else g.moveTo(px, py(p.value)); });
    g.strokePath();
    points.forEach((p, i) => {
      const last = i === points.length - 1;
      g.fillStyle(last ? COLOURS.accent : colour, 1).fillCircle(left + step * (i + 0.5), py(p.value), last ? 6 : 4);
      if (i % every === 0 || last) label(i, p);
    });
    const lp = points[points.length - 1];
    out.push(scene.add.text(left + step * (points.length - 0.5), py(lp.value) - 10, String(Math.round(lp.value)),
      { ...AXIS, color: COLOURS.accentText, fontSize: '18px' }).setOrigin(0.5, 1));
  } else {
    const bw = Math.min(34, step * 0.7);
    points.forEach((p, i) => {
      const last = i === points.length - 1;
      const cx = left + step * (i + 0.5);
      g.fillStyle(last ? COLOURS.accent : colour, 1).fillRect(cx - bw / 2, py(p.value), bw, bottom - py(p.value));
      if (points.length <= 12) out.push(scene.add.text(cx, py(p.value) - 2, String(p.value), { ...AXIS, color: last ? COLOURS.accentText : COLOURS.text }).setOrigin(0.5, 1));
      if (i % every === 0 || last) label(i, p);
    });
  }
  return out;
}

// A horizontal meter 0-100 with an optional earlier mark. Returns the Graphics.
export function meter(scene, x, y, w, h, value, before, colour = 0x8fbf9f) {
  const g = scene.add.graphics();
  g.fillStyle(0x0f1512, 1).fillRoundedRect(x, y, w, h, h / 2);
  g.fillStyle(colour, 1).fillRoundedRect(x, y, Math.max(h, w * value / 100), h, h / 2);
  if (before !== undefined && before !== null) {
    const bx = x + w * before / 100;
    g.lineStyle(3, 0xfffbea, 0.9).lineBetween(bx, y - 4, bx, y + h + 4);
  }
  return g;
}
