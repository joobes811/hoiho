// The season reports: after fledging (breeding) and at the end of July (the year).
// The words come from src/report.js and data/messages.js. The screen shows the
// highlights first, then three meters with change arrows, then the details.
import { COLOURS, SIZES, TEXT } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { meter } from '../ui/charts.js';
import { game } from '../game.js';
import { fill } from '../text.js';
import { reportLines } from '../report.js';
import T from '../../data/screens.js';

const R = T.report;
const MAX_WIDTH = 1000;         // px: widest the report panel gets
const FONT = 'Georgia, "Times New Roman", serif';
const UP = 0x8fbf9f;            // arrow colours: more, fewer, same
const DOWN = 0xd98a6a;
const SAME = 0xc8c2a8;
const METER_COLOURS = [0xd9b36a, 0x7fb4d8, 0x8fbf9f];

export class ReportScene extends Phaser.Scene {
  constructor() {
    super('report');
  }

  preload() {
    this.load.image('hoiho-badge', 'assets/sprites/hoiho/badge.png');   // drawn by tools/hoiho_art.py
  }

  create() {
    if (game.sim.S.phase !== 'report') { this.scene.start('map'); return; }
    this.cameras.main.setBackgroundColor(COLOURS.background);
    this.sheet = null;
    this.page = 0;
    this.draw();
    const onResize = () => this.draw();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  // The three meters for this kind of report: { label, value, max, before, delta, sub }.
  // delta is the change since last year (null in the first year); sub replaces the arrow.
  meters() {
    const S = game.sim.S;
    const r = S.report;
    const hist = S.history;
    // The year report's history already includes this year, so last year is one further back.
    const prev = hist[hist.length - (r.type === 'year' ? 2 : 1)];
    const reserveNow = r.type === 'year' ? r.after : Math.round(S.reserve);
    const reserveBefore = r.type === 'year' ? r.before : prev?.reserve;
    const adultsNow = r.type === 'year' ? r.adults : S.adults.length;
    let first;
    if (r.type === 'year') {
      const total = r.adults - r.immigrants - r.returned.length + r.died.length;     // adults at the start of the year
      first = { label: R.survived, value: total - r.died.length, max: total, sub: fill(game.data, R.survivedOf, { total }) };
    } else {
      first = { label: R.fledged, value: r.fledged, max: Math.max(1, r.eggs), sub: fill(game.data, R.fledgedOf, { eggs: r.eggs }) };
    }
    if (r.type !== 'year') {          // mid-year nothing has changed yet, so no arrows
      return [first, { label: R.reserveLife, value: reserveNow, max: 100, sub: R.midYear },
        { label: R.colony, value: adultsNow, max: R.colonyScale, sub: R.midYear }];
    }
    return [
      first,
      { label: R.reserveLife, value: reserveNow, max: 100, before: reserveBefore, delta: reserveBefore === undefined ? null : reserveNow - reserveBefore },
      { label: R.colony, value: adultsNow, max: R.colonyScale, before: prev?.adults, delta: prev ? adultsNow - prev.adults : null },
    ];
  }

  draw() {
    this.sheet?.destroy();
    const s = this.sheet = this.add.container(0, 0);
    const D = game.data;
    const S = game.sim.S;
    const W = this.scale.width;
    const H = this.scale.height;
    const g = SIZES.gap;
    const w = Math.min(MAX_WIDTH, W - 2 * g);
    const x = (W - w) / 2;
    const ix = x + 30;
    const iw = w - 60;
    let { lines, button: label } = reportLines(D, S.report, S.history);
    const hh = lines.findIndex(l => l.style === 'heading' && l.text === D.messages.report.historyHeading);
    if (hh >= 0) lines = lines.slice(0, hh);          // the meters replace the list of past years
    const items = [];
    const gfx = this.add.graphics();
    items.push(gfx);
    let y = g + 20;
    const text = (str, style, after = 8) => {
      const t = this.add.text(ix, y, str, { ...style, wordWrap: { width: iw } });
      items.push(t);
      y += t.height + after;
      return t;
    };

    // Kicker and title, on every page
    const kicker = lines.find(l => l.style === 'dim');
    const title = lines.find(l => l.style === 'title');
    if (kicker) text(kicker.text, TEXT.dim, 0);
    if (title) text(title.text, { ...TEXT.title, fontSize: '34px' }, 14);
    items.push(this.add.image(x + w - 62, g + 14, 'hoiho-badge').setOrigin(0.5, 0).setScale(0.8));

    // The rest is a list of blocks: highlights, the meters, then the details.
    // If they don't all fit above the button, they carry on over more pages.
    const blocks = [];
    const highs = lines.filter(l => l.style === 'highlight').map(l => l.text);
    const nothing = !highs.length;
    if (nothing) highs.push(R.nothingNew);
    for (const str of highs) {
      const t = this.add.text(0, 0, str, { ...TEXT.highlight, wordWrap: { width: iw - 40 }, color: nothing ? COLOURS.textDim : COLOURS.accentText }).setVisible(false);
      items.push(t);
      blocks.push({ h: t.height + 22, draw: () => {
        t.setPosition(ix + 22, y + 8).setVisible(true);
        gfx.fillStyle(0x2a3630, 1).fillRoundedRect(ix, y, iw, t.height + 16, 8);
        gfx.fillStyle(nothing ? SAME : COLOURS.accent, 1).fillRoundedRect(ix, y, 7, t.height + 16, { tl: 8, bl: 8, tr: 0, br: 0 });
      } });
    }
    blocks.push({ h: 116, draw: () => { this.drawMeters(items, gfx, ix, y + 4, iw); } });
    for (const l of lines) {
      if (l === kicker || l === title || l.style === 'highlight') continue;
      const heading = l.style === 'heading';
      const style = heading ? TEXT.heading : TEXT[l.style] ?? TEXT.body;
      const t = this.add.text(0, 0, l.text, { ...style, wordWrap: { width: iw } }).setVisible(false);
      items.push(t);
      const after = heading ? 4 : 6;
      blocks.push({ h: t.height + after + (heading ? 2 : 0), heading, draw: () => { t.setPosition(ix, y + (heading ? 2 : 0)).setVisible(true); } });
    }

    // Split into pages: each page holds what fits between the title and the button.
    const room = H - 2 * g - SIZES.buttonHeight - 36 - y;
    const pages = [[]];
    let used = 0;
    blocks.forEach((b, i) => {
      // a heading never sits alone at the bottom of a page
      const need = b.heading && blocks[i + 1] ? b.h + blocks[i + 1].h : b.h;
      if (used + need > room && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(b);
      used += b.h;
    });
    this.page = Math.min(this.page ?? 0, pages.length - 1);
    for (const b of pages[this.page]) { b.draw(); y += b.h; }

    const last = this.page === pages.length - 1;
    const bw = 340;
    const by = Math.min(H - g - SIZES.buttonHeight - 20, y + 8);
    items.push(...button(this, x + w - bw - 28, by, bw, last ? label : R.more, {
      accent: true, center: true, onClick: () => (last ? this.next() : this.turn(1)),
    }));
    if (this.page > 0) {
      items.push(...button(this, ix, by, 160, R.back, { center: true, onClick: () => this.turn(-1) }));
    }
    const ph = Math.min(H - 2 * g, by + SIZES.buttonHeight + 20 - g);
    s.add(panel(this, x, g, w, ph));
    s.add(items);
    s.y = Math.max(0, (H - 2 * g - ph) * 0.4);          // sit a little above the middle on tall windows
  }

  turn(d) { this.page += d; this.draw(); }

  // The three meters with change arrows, across the panel from (ix, y).
  drawMeters(items, gfx, ix, y, iw) {
    const D = game.data;
    const gapx = 26;
    const cw = (iw - 2 * gapx) / 3;
    this.meters().forEach((m, i) => {
      const mx = ix + i * (cw + gapx);
      items.push(this.add.text(mx, y, m.label, TEXT.dim));
      const num = this.add.text(mx, y + 24, String(m.value), { fontFamily: FONT, fontSize: '40px', color: COLOURS.text });
      items.push(num);
      const ay = y + 24 + 26;
      const ax = mx + num.width + 20;
      if (m.sub) {
        items.push(this.add.text(mx + num.width + 12, ay, m.sub, TEXT.small).setOrigin(0, 0.5));
      } else if (m.delta === null) {
        items.push(this.add.text(mx + num.width + 12, ay, R.firstYear, TEXT.smallFaint).setOrigin(0, 0.5));
      } else {
        const d = m.delta;
        gfx.fillStyle(d > 0 ? UP : d < 0 ? DOWN : SAME, 1);
        if (d > 0) gfx.fillTriangle(ax - 11, ay + 8, ax + 11, ay + 8, ax, ay - 10);
        else if (d < 0) gfx.fillTriangle(ax - 11, ay - 8, ax + 11, ay - 8, ax, ay + 10);
        else gfx.fillRect(ax - 11, ay - 3, 22, 6);
        const words = d === 0 ? R.noChange : fill(D, R.sinceLast, { d: (d > 0 ? '+' : '') + d });
        items.push(this.add.text(ax + 20, ay, words, { ...TEXT.small, color: d > 0 ? '#9fcfaf' : d < 0 ? '#e8a888' : COLOURS.textDim, wordWrap: { width: cw - num.width - 50 } }).setOrigin(0, 0.5));
      }
      items.push(meter(this, mx, y + 78, cw, 16, Math.min(100, m.value / m.max * 100),
        m.before === undefined ? null : m.before / m.max * 100, METER_COLOURS[i]));
    });
  }

  next() {
    game.sim.continueReport();
    game.save();
    this.scene.start('map');
  }
}
