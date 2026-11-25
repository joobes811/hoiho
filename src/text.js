// Turns simulation events into sentences, using the messages in data/messages.js.
// Pure code with no Phaser or DOM, so the game, the tests and
// tools/simulate.js can all use it.

export function plural(n, word, many) {
  return `${n} ${n === 1 ? word : (many || word + 's')}`;
}

// 1290 -> "9:30pm"
export function clock(minutes) {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const hh = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${hh}:${String(mm).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
}

// 75 -> "1h 15m"
export function duration(minutes) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h${mm ? ' ' + mm + 'm' : ''}` : `${mm}m`;
}

export function zoneName(D, id) {
  return D.zones.zones.find(z => z.id === id)?.name ?? id;
}

// Fill a message's gaps: {zone}, {place} (zone name in lower case), {name}, {n:word}, {n:word:plural}.
export function fill(D, template, vars) {
  const all = { ...vars };
  if (typeof vars.zone === 'string') {
    all.zone = zoneName(D, vars.zone);
    all.place = all.zone.toLowerCase();
  }
  return template.replace(/\{(\w+)(?::([^}:]+))?(?::([^}]+))?\}/g, (whole, key, word, many) => {
    const v = all[key];
    if (v === undefined) throw new Error(`Message gap {${key}} has no value in: ${template}`);
    return word ? plural(v, word, many) : String(v);
  });
}

// Which version of a message with several versions to use.
const VERSION = {
  stockCollected: e => e.kind,
  bait: e => e.level,
  fence: e => (e.breaks ? 'mended' : 'sound'),
  planted: e => e.grade,
  lost: e => `${e.what}.${e.cause}`,
  trapLine: e => e.grade,
  goalMet: e => e.goal,
  cowFreed: e => e.grade,
  cattleShifted: e => e.grade,
  sheepOver: e => e.grade,
};

function message(D, key, e) {
  let m = D.messages[key] ?? D.nests?.messages?.[key];   // the nest check keeps its own lines in data/nests.js
  if (m && typeof m === 'object') m = m[VERSION[key]?.(e)];
  if (typeof m !== 'string') throw new Error(`No message for "${key}" in data/messages.js`);
  return m;
}

// One event -> one sentence. Throws if data/messages.js has no words for it.
export function describe(D, e) {
  const M = D.messages;
  const say = (key, vars = e) => fill(D, message(D, key, e), vars);
  switch (e.k) {
    case 'event':
      return fill(D, D.events.list.find(ev => ev.k === e.event).text, e);
    case 'notebook':
      return say('notebook', { title: D.notebook.find(n => n.k === e.note)?.title ?? e.note });
    case 'seaHint':
      return D.weather.sea[e.sea].hint;
    case 'nestsTaken': {
      const where = e.where.map(([zone, n]) => fill(D, M.nestsWhere, { zone, n })).join(', ');
      return say('nestsTaken', { pairs: e.pairs, where }) + (e.noSite ? fill(D, M.noSite, e) : '');
    }
    case 'nestCheck': {
      const lines = e.nests.map(n => {
        const status = n.chicks ? (n.light ? M.nestStatus.chicksLight : M.nestStatus.chicks)
          : n.eggs ? M.nestStatus.eggs : (n.beforeLaying ? M.nestStatus.noEggsYet : M.nestStatus.empty);
        return fill(D, M.nestLine, { ...n, status: fill(D, status, n) });
      });
      return say('nestCheck', { zone: e.zone, lines: lines.join('. ') });
    }
    case 'hunter':
      return say('hunter', { got: e.got.join(' and ') });
    case 'ashore': {
      let s = say(e.sealion ? 'ashoreSealion' : 'ashore');
      if (e.quirk !== null) s += ' ' + D.penguins.quirks[e.quirk].line;
      if (e.thin) s += ' ' + M.thin;
      if (e.tent) s += ' ' + M.inTent;
      return s;
    }
    case 'ambient':
      return D.countLines.ambient[e.i];
    case 'talk':
      return `“${D.countLines.talk[e.i].say}”`;
    case 'arrive':
      return say('arrive', { weather: D.weather.weather.find(w => w.k === e.weather).t });
    case 'arriveLate':
      return say('arriveLate', { late: duration(e.late) });
    default:
      return say(e.k);
  }
}
