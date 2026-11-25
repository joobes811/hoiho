// The field notebook: a journal spread over two pages. Entries come from
// data/notebook.js; found ones show a pencil sketch, their title and the date,
// locked ones show a hint. The last spread lists the species that have arrived.
import { COLOURS, TEXT } from '../ui/styles.js';
import { button } from '../ui/panel.js';
import { sketch } from '../ui/draw.js';
import { game } from '../game.js';
import { fill } from '../text.js';
import T from '../../data/screens.js';

const FONT = 'Georgia, "Times New Roman", serif';
const PER_PAGE = 3;              // entries on each page of the spread
const PAPER = 0xefe5c8;
const INK = '#3b2f20';
const INK_FAINT = '#7d6e52';
const SPRITE = 104;              // px: size of each sketch box

let lastSpread = 0;               // remembered between visits in one session

export class NotebookScene extends Phaser.Scene {
  constructor() { super('notebook'); }

  create() {
    this.cameras.main.setBackgroundColor(COLOURS.background);
    this.spread = lastSpread;
    this.sheet = null;
    this.draw();
    const onResize = () => this.draw();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  // Spreads: every PER_PAGE*2 notebook entries, then one for the species.
  spreads() {
    const D = game.data;
    const per = PER_PAGE * 2;
    const n = Math.ceil(D.notebook.length / per);
    return [...Array.from({ length: n }, (_, i) => ({ kind: 'notes', items: D.notebook.slice(i * per, (i + 1) * per) })),
      { kind: 'species', items: D.species }];
  }

  dateText(when) {
    return when ? `${game.data.calendar.months[when.mi]} · Year ${when.year}` : '';
  }

  draw() {
    this.sheet?.destroy();
    const c = this.sheet = this.add.container(0, 0);
    const D = game.data;
    const S = game.sim.S;
    const W = this.scale.width;
    const H = this.scale.height;
    const spreads = this.spreads();
    this.spread = Phaser.Math.Clamp(this.spread, 0, spreads.length - 1);
    lastSpread = this.spread;
    const sp = spreads[this.spread];

    const bw = Math.min(1260, W - 32);
    const bx = (W - bw) / 2;
    const by = 62;
    const bh = H - by - 76;
    const g = this.add.graphics();
    c.add(g);
    // the book: a dark cover edge, two paper pages, a shadow down the middle
    g.fillStyle(0x5a4632, 1).fillRoundedRect(bx - 10, by - 8, bw + 20, bh + 16, 14);
    g.fillStyle(PAPER, 1).fillRoundedRect(bx, by, bw / 2 - 2, bh, { tl: 8, bl: 8, tr: 0, br: 0 })
      .fillRoundedRect(bx + bw / 2 + 2, by, bw / 2 - 2, bh, { tl: 0, bl: 0, tr: 8, br: 8 });
    g.fillStyle(0xb8a67e, 0.55).fillRect(bx + bw / 2 - 14, by, 12, bh).fillStyle(0xb8a67e, 0.35).fillRect(bx + bw / 2 + 2, by, 12, bh);
    // faint ruled lines
    g.lineStyle(1, 0xc9b98f, 0.5);
    for (let ly = by + 40; ly < by + bh - 10; ly += 30) {
      g.lineBetween(bx + 20, ly, bx + bw / 2 - 24, ly).lineBetween(bx + bw / 2 + 24, ly, bx + bw - 20, ly);
    }

    // heading
    const found = D.notebook.filter(n => S.notebook[n.k]).length;
    c.add(this.add.text(W / 2, 30, T.notebook.heading, TEXT.title).setOrigin(0.5));
    c.add(this.add.text(bx + bw, 30, fill(D, T.notebook.count, { n: found, total: D.notebook.length }), TEXT.dim).setOrigin(1, 0.5));

    // entries
    const colW = bw / 2 - 60;
    const pp = sp.kind === 'notes' ? PER_PAGE : Math.ceil(sp.items.length / 2);      // entries per page on this spread
    const rowH = (bh - 40) / pp;
    sp.items.forEach((item, i) => {
      const side = Math.floor(i / pp);
      const row = i % pp;
      const ex = bx + 30 + side * (bw / 2 + 4);
      const ey = by + 24 + row * rowH;
      this.entry(c, g, sp.kind, item, ex, ey, colW, rowH - 10);
    });

    // page buttons
    const nbH = 56;
    const nby = H - nbH - 8;
    const first = this.spread === 0;
    const last = this.spread === spreads.length - 1;
    c.add(button(this, bx, nby, 200, '←  ' + T.notebook.prev, { height: nbH, center: true, disabled: first, onClick: () => this.go(-1) }));
    c.add(button(this, bx + bw - 200, nby, 200, T.notebook.next + '  →', { height: nbH, center: true, disabled: last, onClick: () => this.go(1) }));
    c.add(this.add.text(W / 2 - 150, nby + nbH / 2, fill(D, T.notebook.page, { n: this.spread + 1, total: spreads.length }), TEXT.dim).setOrigin(0.5));
    c.add(button(this, W / 2 + 20, nby, 300, T.notebook.back, { height: nbH, center: true, accent: true, onClick: () => this.scene.start('map') }));
  }

  entry(c, g, kind, item, x, y, w, h) {
    const D = game.data;
    const S = game.sim.S;
    let when = null;
    let open;
    let title;
    let faint;
    if (kind === 'notes') {
      when = S.notebook[item.k];
      open = Boolean(when);
      title = open ? item.title : '? ? ?';
      faint = open ? this.dateText(when) : item.hint;
    } else {
      open = S.species.includes(item.k);
      when = S.speciesSeen?.[item.k];
      title = open ? item.name : '? ? ?';
      faint = open ? item.note : T.notebook.speciesLocked;
    }
    // sketch box: a taped-in square
    const sx = x;
    const sy = y + 6;
    g.fillStyle(open ? 0xf8f1da : 0xe3d8b6, 1).fillRect(sx, sy, SPRITE, SPRITE);
    g.lineStyle(2, 0x9c8a62, 1).strokeRect(sx, sy, SPRITE, SPRITE);
    g.fillStyle(0xd9c58a, 0.8).fillRect(sx + SPRITE / 2 - 18, sy - 7, 36, 14);       // a bit of tape
    if (open) sketch(g, kind === 'notes' ? (item.sketch ?? item.k) : (T.notebook.speciesSketch[item.k] ?? 'bird'), sx + SPRITE / 2, sy + SPRITE / 2 + 2, SPRITE * 0.95, T.notebook.speciesTone[item.k]);
    else c.add(this.add.text(sx + SPRITE / 2, sy + SPRITE / 2, '?', { fontFamily: FONT, fontSize: '56px', color: '#c4b48a' }).setOrigin(0.5));
    const tx = sx + SPRITE + 18;
    const tw = w - SPRITE - 20;
    const t1 = this.add.text(tx, y + 6, title, { fontFamily: FONT, fontSize: '23px', fontStyle: 'bold', color: open ? INK : INK_FAINT, wordWrap: { width: tw } });
    const t2 = this.add.text(tx, y + 12 + t1.height, faint, { fontFamily: FONT, fontSize: '19px', fontStyle: 'italic', color: INK_FAINT, wordWrap: { width: tw }, lineSpacing: 3 });
    c.add([t1, t2]);
    if (kind === 'species' && open) {
      const extra = when ? fill(D, T.notebook.speciesFirst, when) : item.at === 0 ? T.notebook.speciesStart : '';
      c.add(this.add.text(tx, t2.y + t2.height + 4, extra, { fontFamily: FONT, fontSize: '18px', color: INK_FAINT, wordWrap: { width: tw } }));
    }
  }

  go(d) {
    this.spread += d;
    this.draw();
  }
}
