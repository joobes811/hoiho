// Small helpers shared by the simulation files.

// Keep a value between lo and hi (0 to 100 by default, the range of most levels).
export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
