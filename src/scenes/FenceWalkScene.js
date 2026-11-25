// The fence walk: a close-up of the place with the fence line as a route of
// sections. At each section the fence is drawn big, side on: sound, sagging,
// a broken strand or a rotten post. Use the tools along the bottom (strainer,
// staples, spare post) in the order the damage needs, and read any sign on
// the ground or the wire. Rules: src/sim/fencewalk.js. Pictures: tools/rounds_sprites.py.
import { COLOURS, TEXT } from '../ui/styles.js';
import { game } from '../game.js';
import { fill, duration } from '../text.js';
import { RoundsScene } from './RoundsScene.js';
import { isMended } from '../sim/fencewalk.js';

// Where things sit in the fence picture (its own pixels, 800 x 500).
const POST_X = [100, 400, 700];     // posts: the middle one is the one that goes bad
const GROUND_Y = 400;               // where posts stand
const WIRE_TOP = 62;                // top of the wire picture (strands at +34, +148, +262)
const STRANDS = [96, 210, 324];     // wire heights at the middle post when it is tight
const MS = 420;                     // how long a tool takes to swing at the wire on screen
const TOOLS = ['strain', 'staple', 'post'];

export class FenceWalkScene extends RoundsScene {
  constructor() {
    super('rounds-fence', 'fence', 'fencewalk');
    this.ratesKey = 'fenceWalk';
    this.sprites = ['fence-bg', 'post', 'post-new', 'post-rotten', 'wire-tight', 'wire-slack', 'wire-down', 'wire-broken', 'staple',
      'sign-cattle', 'sign-deer', 'sign-sheep', 'sign-pig', 'sign-possum', 'wool',
      'tool-strainer', 'tool-staples', 'tool-post'];
    this.backdrop = 0x0e1512;
    this.backdropAlpha = 0.97;
  }

  marker(g, x, y, w, h, here, zoom) {         // a short length of fence, with a post at each end
    g.lineStyle((here ? 6 : 4) / zoom, here ? COLOURS.accent : 0x1c2420, 1).lineBetween(x - w / 2, y, x + w / 2, y);
    g.fillStyle(0x8b7456, 1).lineStyle(3 / zoom, 0x1c2420, 1);
    for (const px of [x - w / 2, x + w / 2]) g.fillRect(px - 4 / zoom, y - h / 2, 8 / zoom, h).strokeRect(px - 4 / zoom, y - h / 2, 8 / zoom, h);
  }

  stopMark(i) {
    const s = this.round.stops[i];
    return s.fix ? (isMended(s) ? '✓' : '–') : '';
  }

  buildStopView(c, box, stop) {
    const { x: ax, y: ay, side } = box;
    const k = this.fit(800, 0.96, 1.1);                 // picture scale
    const gx = ax + (side - 800 * k) / 2;
    const gy = ay + side * 0.025;
    this.k = k;
    const at = (x, y) => ({ x: gx + x * k, y: gy + y * k });
    const put = (name, x, y, ox = 0.5, oy = 0.5) => {
      const p = at(x, y);
      const im = this.add.image(p.x, p.y, this.tex(name)).setOrigin(ox, oy).setScale(k);
      c.add(im);
      return im;
    };
    put('fence-bg', 0, 0, 0, 0);

    // Which pictures: the wire, the middle post and the staples depend on what is left to do.
    const next = stop.todo[0];
    const wire = stop.fix === 'broken' && next === 'strain' ? 'wire-broken'
      : next === 'post' ? 'wire-down' : next === 'strain' ? 'wire-slack' : 'wire-tight';
    const middle = next === 'post' ? 'post-rotten' : stop.fix === 'post' ? 'post-new' : 'post';
    const postOrigin = 342 / 352;
    put('post', POST_X[0], GROUND_Y, 0.5, postOrigin);
    put('post', POST_X[2], GROUND_Y, 0.5, postOrigin);
    put(middle, POST_X[1], GROUND_Y, 0.5, postOrigin);
    put(wire, POST_X[0], WIRE_TOP, 0, 0);
    if (wire === 'wire-tight' && next !== 'staple') for (const y of STRANDS) put('staple', POST_X[1], y);

    // Sign: prints on the ground, and wool on the wire for sheep.
    if (stop.sign) {
      put('sign-' + stop.sign.kind, POST_X[1], 452);
      if (stop.sign.kind === 'sheep') {      // the wool sits on the middle strand, wherever the wire has sagged to
        const sag = { 'wire-slack': 58, 'wire-down': 84, 'wire-broken': 30, 'wire-tight': 0 }[wire];
        put('wool', 330, STRANDS[1] + sag * 4 * 0.383 * 0.617);
      }
    }

    // The tools, along the bottom. The one this section needs next is ringed.
    const tk = this.fit(150, 0.2, 1);
    const ty = ay + side * 0.8;
    TOOLS.forEach((name, i) => {
      const tx = ax + side * (0.2 + i * 0.3);
      const im = this.add.image(tx, ty, this.tex('tool-' + { strain: 'strainer', staple: 'staples', post: 'post' }[name])).setScale(tk);
      c.add(im);
      const label = this.add.text(tx, ty + im.displayHeight / 2 + 4, this.T.tools[name].label, TEXT.smallFaint).setOrigin(0.5, 0);
      c.add(label);
      if (stop.todo[0] === name) {
        const ring = this.add.graphics().lineStyle(5, COLOURS.accent, 1)
          .strokeRoundedRect(tx - im.displayWidth / 2 - 4, ty - im.displayHeight / 2 - 4, im.displayWidth + 8, im.displayHeight + 8, 14);
        c.add(ring);
      }
      this.clickable(im, {
        can: () => game.sim.canRoundStep(name),
        text: ok => (ok ? `${this.T.steps[name].hint} · ${duration(this.T.steps[name].min)}` : this.T.ui.wrongStep),
        act: () => this.doStep(name),
      });
    });
    this.wireShape = { im: c.list.find(o => o.texture?.key === this.tex(wire)), name: wire };
  }

  // A small shake of the wire when you strain it, a nudge for the others.
  animate(step, arg, done) {
    const im = this.wireShape?.im;
    if (!im) { done(); return; }
    this.tweens.add({ targets: im, scaleY: im.scaleY * (step === 'strain' ? 1.08 : 1.02), duration: MS / 2, yoyo: true, onComplete: done });
  }

  stopPanel(ui, stop) {
    const D = game.data;
    const T = this.T;
    ui.text(T.sections[stop.fix ?? 'sound'][stop.text], TEXT.body, 10);
    if (stop.fix) {
      if (stop.todo.length) ui.text(fill(D, T.ui.next, { step: T.steps[stop.todo[0]].hint.charAt(0).toLowerCase() + T.steps[stop.todo[0]].hint.slice(1) }), TEXT.highlight, 10);
      else ui.text(T.ui.allDone, TEXT.highlight, 10);
    }
    if (stop.sign) {
      const sign = T.signs[stop.sign.kind];
      ui.text(sign.look, TEXT.body, 10);
      if (!stop.sign.read) {
        ui.text(T.ui.askSign, TEXT.heading, 6);
        T.signOrder.forEach(kind => ui.btn(T.signs[kind].name, {
          height: 40, onClick: () => this.doStep('read', kind),
        }));
      } else {
        const right = stop.sign.right;
        ui.text(fill(D, right ? T.ui.signRight : T.ui.signWrong, { meaning: sign.meaning }), right ? TEXT.highlight : TEXT.body, 10);
        if (right && ['pig', 'deer'].includes(stop.sign.kind)) ui.text(T.ui.marked, TEXT.dim, 10);
      }
    }
    ui.gap(6);
    this.walkOn(ui, this.round.at === this.round.stops.length - 1 ? T.ui.finish : T.steps.close.hint);
  }

  resultPanel(ui, r) {
    const D = game.data;
    const T = this.T;
    ui.text(T.ui.grade[r.grade], r.grade === 'rough' ? TEXT.body : TEXT.highlight);
    const vars = { ...r, time: duration(this.round.minutes) };
    ui.text(fill(D, r.problems ? T.ui.summary : T.ui.summaryClean, vars), TEXT.body);
    this.round.stops.forEach((s, i) => {
      if (!s.fix && !s.sign) return;
      const what = s.fix ? T.ui.left[isMended(s) ? 'mended' : 'open'] : T.ui.left.clean;
      const sign = s.sign ? `; ${fill(D, T.ui.signRecap, { sign: T.signs[s.sign.kind].name.toLowerCase(), verdict: s.sign.right ? 'read right' : s.sign.read ? 'read wrong' : 'not read' })}` : '';
      ui.text(`${i + 1}. ${what}${sign}`, TEXT.small, 2);
    });
    ui.gap(8);
    if (r.marked.length) ui.text(T.ui.hunter, TEXT.highlight);
    if (r.stock) ui.text(T.ui.stock, TEXT.dim);
    ui.btn(T.ui.back, { accent: true, center: true, onClick: () => this.back() });
  }
}
