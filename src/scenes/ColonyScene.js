// The colony roster: every adult hoiho the reserve knows, with band chips,
// quirk, mate, this season's nest and chicks fledged, plus small charts of the
// colony and reserve life over the years.
import { COLOURS, TEXT } from '../ui/styles.js';
import { panel, button } from '../ui/panel.js';
import { chart } from '../ui/charts.js';
import { game } from '../game.js';
import { fill } from '../text.js';
import T from '../../data/screens.js';
import { familyLines } from '../family.js';

const C = T.colony;
const COLS = [                    // x offset in the table (px) and width of each column
  ['name', 0, 104], ['band', 110, 58], ['age', 174, 50], ['quirk', 232, 196], ['mate', 436, 90],
  ['nest', 534, 150], ['chicks', 692, 58], ['seen', 758, 140],
];
const ROW_H = 36;               // px per bird
const HEAD_H = 34;              // px for the column titles
const FONT = 'Georgia, "Times New Roman", serif';

let lastPage = 0;

export class ColonyScene extends Phaser.Scene {
  constructor() { super('colony'); }

  create() {
    this.cameras.main.setBackgroundColor(COLOURS.background);
    this.page = lastPage;
    this.sheet = null;
    this.draw();
    const onResize = () => this.draw();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  short(when) { return `${game.data.calendar.months[when.mi].slice(0, 3)} Y${when.year}`; }

  // The words for one bird's nest this season.
  nestText(a) {
    const S = game.sim.S;
    const n = S.nests.find(x => x.m === a.id || x.f === a.id);
    if (!n) return a.age < game.data.rates.nests.pairAge ? C.nest.young : C.nest.none;
    const zone = C.zoneShort[n.zone] ?? n.zone;
    const waiting = game.sim.S.mi <= game.data.calendar.layMonth - 1;      // eggs are not laid until after the first visit
    const key = n.chicks ? 'chicks' : n.eggs ? 'eggs' : n.fledged ? 'fledged' : waiting ? 'waiting' : 'empty';
    return fill(game.data, C.nest[key], { zone });
  }

  seenText(a) {
    const S = game.sim.S;
    const seen = a.seen ?? { mi: 0, year: 1 };          // a bird never counted is taken as last seen when the game began
    const gone = (S.year - seen.year) * 12 + (S.mi - seen.mi);
    return gone > C.staleAfter ? { text: fill(game.data, C.seenSince, { when: this.short(seen) }), stale: true }
      : { text: C.seenRecently, stale: false };
  }

  // A card with one bird's family story over the roster. Click anywhere to close.
  showStory(a) {
    this.story?.destroy();
    const F = C.family;
    const W = this.scale.width;
    const H = this.scale.height;
    const w = Math.min(620, W - 40);
    const c = this.story = this.add.container(0, 0).setDepth(20);
    const dim = this.add.rectangle(0, 0, W, H, 0x0e1512, 0.7).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => { this.story.destroy(); this.story = null; });
    c.add(dim);
    const items = [];
    let y = 0;
    const text = (str, style, after = 10) => {
      const t = this.add.text(24, y, str, { ...style, wordWrap: { width: w - 48 } });
      items.push(t);
      y += t.height + after;
    };
    text(`${a.name}  ·  ${a.band}`, { ...TEXT.title, ...(a.origin === 'returned' ? { color: COLOURS.accentText } : {}) }, 14);
    for (const line of familyLines(game.data, F, game.sim.S, a)) text(line, TEXT.body);
    const h = y + 70;
    const x = (W - w) / 2;
    const top = Math.max(12, (H - h) / 2);
    c.add(panel(this, x, top, w, h));
    for (const t of items) { t.x += x; t.y += top + 22; c.add(t); }
    c.add(button(this, x + w - 24 - 160, top + h - 60, 160, F.close, { height: 44, center: true, accent: true,
      onClick: () => { this.story.destroy(); this.story = null; } }));
  }

  fit(text, maxW) {            // shorten a Text object with an ellipsis until it fits; true if it was cut
    let s = text.text;
    const cut = text.width > maxW;
    while (text.width > maxW && s.length > 2) { s = s.slice(0, -1); text.setText(s.trimEnd() + '…'); }
    return cut;
  }

  // A small card by the mouse with a cell's full words (for cells cut short).
  showTip(lines, px, py) {
    this.tip?.destroy();
    if (!lines) { this.tip = null; return; }
    const c = this.tip = this.add.container(0, 0).setDepth(15);
    const w = 380;
    const texts = lines.map((l, i) => this.add.text(14, 0, l, { ...TEXT.body, fontSize: '18px', wordWrap: { width: w - 28 },
      ...(i ? { fontStyle: 'italic', color: COLOURS.textDim } : {}) }));
    let y = 10;
    for (const t of texts) { t.setY(y); y += t.height + 4; }
    const h = y + 8;
    const x = Math.min(px + 18, this.scale.width - w - 8);
    const top = Math.min(py + 20, this.scale.height - h - 8);
    const g = this.add.graphics().fillStyle(0x0e1512, 1).fillRoundedRect(0, 0, w, h, 8)
      .lineStyle(2, COLOURS.panelEdge, 1).strokeRoundedRect(0, 0, w, h, 8);
    c.add([g, ...texts]).setPosition(x, top);
  }

  draw() {
    this.showTip(null);
    this.sheet?.destroy();
    const c = this.sheet = this.add.container(0, 0);
    const D = game.data;
    const S = game.sim.S;
    const W = this.scale.width;
    const H = this.scale.height;
    const x0 = 12;
    const tw = 930;
    const top = 12;
    c.add(panel(this, x0, top, tw, H - 2 * top));
    c.add(this.add.text(x0 + 20, top + 10, C.heading, TEXT.title));
    c.add(this.add.text(x0 + 220, top + 18, fill(D, C.sub, { n: S.adults.length, pairs: S.nests.length }), TEXT.dim));
    c.add(this.add.text(x0 + tw - 20, top + 18, C.homegrown, { ...TEXT.dim, color: COLOURS.accentText }).setOrigin(1, 0));

    const birds = [...S.adults].sort((a, b) => a.name.localeCompare(b.name));
    const tableTop = top + 56;
    const navH = 50;
    const per = Math.max(4, Math.min(C.rowsPerPage + 3, Math.floor((H - tableTop - HEAD_H - navH - 24) / ROW_H)));
    const pages = Math.max(1, Math.ceil(birds.length / per));
    this.page = Phaser.Math.Clamp(this.page, 0, pages - 1);
    lastPage = this.page;
    const tx = x0 + 18;
    const g = this.add.graphics();
    c.add(g);

    const head = { fontFamily: FONT, fontSize: '18px', color: COLOURS.accentText, fontStyle: 'italic' };
    for (const [k, ox] of COLS) c.add(this.add.text(tx + ox, tableTop + 4, C.cols[k], head));
    g.lineStyle(2, COLOURS.panelEdge, 1).lineBetween(tx, tableTop + HEAD_H - 2, tx + tw - 36, tableTop + HEAD_H - 2);

    const slice = birds.slice(this.page * per, (this.page + 1) * per);
    slice.forEach((a, i) => {
      const ry = tableTop + HEAD_H + i * ROW_H;
      const seen = this.seenText(a);
      if (i % 2 === 0) g.fillStyle(0xffffff, 0.04).fillRoundedRect(tx - 6, ry, tw - 24, ROW_H, 6);
      const style = seen.stale ? TEXT.dim : TEXT.body;
      const cut = {};             // full words of the cells cut short, by column
      const put = (k, str, st = style) => {
        const [, ox, w] = COLS.find(col => col[0] === k);
        const t = this.add.text(tx + ox, ry + ROW_H / 2, str, { ...st, fontSize: '18px', lineSpacing: 0 }).setOrigin(0, 0.5);
        if (this.fit(t, w)) cut[k] = str;
        c.add(t);
        return t;
      };
      put('name', a.name, { ...style, fontStyle: 'bold', ...(a.origin === 'returned' ? { color: COLOURS.accentText } : {}) });
      // the whole row opens the bird's story
      const hit = this.add.zone(tx - 6, ry, tw - 24, ROW_H).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => g.fillStyle(0xffffff, 0.06).fillRect(tx - 6, ry, 4, ROW_H));
      hit.on('pointerdown', () => { this.showTip(null); this.showStory(a); });
      // hovering a cell that was cut short shows its full words (the quirk also shows how it behaves)
      hit.on('pointermove', p => {
        const col = COLS.find(([, ox, w]) => p.x >= tx + ox && p.x < tx + ox + w);
        const k = col?.[0];
        if (k === 'quirk') this.showTip([D.penguins.quirks[a.quirk].name, D.penguins.quirks[a.quirk].line], p.x, p.y);
        else this.showTip(k && cut[k] ? [cut[k]] : null, p.x, p.y);
      });
      hit.on('pointerout', () => this.showTip(null));
      c.add(hit);
      // band chip: coloured by the letter, with the number on it
      const [letter, num] = a.band.split('-');
      const cx = tx + COLS[1][1];
      g.fillStyle(C.bandColours[letter] ?? 0x999999, 1).fillRoundedRect(cx, ry + 6, 54, ROW_H - 12, 6);
      g.lineStyle(1, 0x0f1512, 0.6).strokeRoundedRect(cx, ry + 6, 54, ROW_H - 12, 6);
      c.add(this.add.text(cx + 27, ry + ROW_H / 2, num, { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold',
        color: C.bandDarkText.includes(letter) ? '#1c2420' : '#ffffff' }).setOrigin(0.5));
      put('age', `${a.sex === 'M' ? C.male : C.female} ${a.age}`);
      put('quirk', D.penguins.quirks[a.quirk].name);
      const mate = a.mate ? S.adults.find(b => b.id === a.mate) : null;
      put('mate', mate ? mate.name : C.noMate);
      put('nest', this.nestText(a));
      put('chicks', String(a.fledged ?? 0));
      put('seen', seen.text, seen.stale ? { ...TEXT.dim, color: '#e0b66a' } : style);
    });

    // paging
    const ny = H - top - navH - 8;
    c.add(button(this, tx, ny, 130, '←  ' + C.prev, { height: navH, center: true, disabled: this.page === 0, onClick: () => this.go(-1) }));
    c.add(button(this, tx + 142, ny, 130, C.next + '  →', { height: navH, center: true, disabled: this.page >= pages - 1, onClick: () => this.go(1) }));
    c.add(this.add.text(tx + 292, ny + navH / 2, fill(D, C.page, { from: this.page * per + 1, to: this.page * per + slice.length, total: birds.length }), TEXT.dim).setOrigin(0, 0.5));
    c.add(button(this, x0 + tw - 18 - 230, ny, 230, C.back, { height: navH, center: true, accent: true, onClick: () => this.scene.start('map') }));

    // charts on the right
    const cx = x0 + tw + 12;
    const cw = W - cx - 12;
    const gap = 10;
    const ch = (H - 2 * top - 2 * gap) / 3;
    const hist = S.history.slice(-7);
    const lab = h => `Y${h.year}`;
    const colony = [...hist.map(h => ({ label: lab(h), value: h.adults })), { label: C.chartNow, value: S.adults.length }];
    const reserve = [...hist.map(h => ({ label: lab(h), value: h.reserve })), { label: C.chartNow, value: Math.round(S.reserve) }];
    const fledged = hist.map(h => ({ label: lab(h), value: h.fledged }));
    [[C.chartColony, colony, { colour: 0x8fbf9f }], [C.chartFledged, fledged, { colour: 0xd9b36a }],
      [C.chartReserve, reserve, { colour: 0x7fb4d8, line: true, max: 100 }]].forEach(([title, pts, o], i) => {
      const y = top + i * (ch + gap);
      c.add(panel(this, cx, y, cw, ch));
      if (pts.length) c.add(chart(this, cx + 14, y + 10, cw - 24, ch - 14, pts, { title, ...o }));
      else {
        c.add(this.add.text(cx + 14, y + 10, title, { ...TEXT.dim, fontSize: '19px', color: COLOURS.text }));
        c.add(this.add.text(cx + cw / 2, y + ch / 2 + 14, C.noHistory, { ...TEXT.dim, wordWrap: { width: cw - 40 }, align: 'center' }).setOrigin(0.5));
      }
    });
  }

  go(d) { this.page += d; this.draw(); }
}
