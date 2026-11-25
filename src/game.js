// The running game: one simulation, saved to the browser after every action,
// with export and import so a save can be kept as a file.
//
// Nothing here touches the page when it's imported; the browser is only
// used inside these functions, when the game calls them.
//
// URL switches (see CLAUDE.md):
//   ?seed=7            start a new game with this seed (replaces the saved game)
//   ?month=5&year=3    start a new game and let the automatic caretaker play
//                      up to May of year 3 (month is the calendar month, 1-12)
import DATA from '../data/index.js';
import { Sim, SAVE_VERSION } from './sim/sim.js';
import { playVisit } from './sim/caretaker.js';

const KEY = `hoiho-save-v${SAVE_VERSION}`;
const OLD_KEYS = Array.from({ length: SAVE_VERSION - 1 }, (_, i) => `hoiho-save-v${SAVE_VERSION - 1 - i}`);   // newest first

export const game = {
  sim: null,
  data: DATA,
  hadSave: false,          // true when start() found a saved game (the title screen offers Continue)

  start(params) {
    const seed = params.get('seed');
    const month = Number(params.get('month'));
    const year = Number(params.get('year'));
    if (seed !== null || month || year) {
      this.newGame(seed ?? randomSeed());
      if (month || year) this.skipTo(month || 8, year || 1);
      return;
    }
    if (!this.load()) this.newGame(randomSeed());
  },

  newGame(seed) {
    this.sim = Sim.newGame(DATA, seed);
    this.save();
  },

  // Let the automatic caretaker play up to a calendar month (1-12) of a year.
  skipTo(month, year) {
    const mi = (month - 8 + 12) % 12;            // August is the first month of the game's year
    while (this.sim.S.year < year || (this.sim.S.year === year && this.sim.S.mi < mi)) {
      playVisit(this.sim, 'busy');
    }
    this.save();
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.sim.S));
    } catch (e) {
      console.warn('Could not save the game', e);
    }
  },

  load() {
    try {
      const text = [KEY, ...OLD_KEYS].map(k => localStorage.getItem(k)).find(Boolean);
      if (!text) return false;
      this.sim = Sim.load(DATA, JSON.parse(text));
      this.hadSave = true;
      return true;
    } catch (e) {
      console.warn('Could not load the saved game', e);
      return false;
    }
  },

  // Download the save as a file.
  exportSave() {
    const blob = new Blob([JSON.stringify(this.sim.S)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hoiho-save-year${this.sim.S.year}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  // Ask for a save file; calls done(true) once it's loaded, done(false) if it wasn't a save.
  importSave(done) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      try {
        const S = JSON.parse(await input.files[0].text());
        this.sim = Sim.load(DATA, S);
        this.save();
        done(true);
      } catch (e) {
        console.warn('Not a save file', e);
        done(false);
      }
    };
    input.click();
  },
};

function randomSeed() {
  return Math.floor(Date.now() % 1e9);          // a fresh world each new game (not part of the simulation)
}
