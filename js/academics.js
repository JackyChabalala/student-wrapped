/**
 * academics.js — simple average, highest, lowest, strongest module
 * Never claims a weighted / official average.
 */

const Academics = {
  /**
   * Validate a mark string/number. Returns { ok, mark?, error? }.
   */
  validateMark: function (value) {
    if (value === "" || value == null) {
      return { ok: false, error: "Enter a mark between 0 and 100." };
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return { ok: false, error: "Mark must be a number (0–100)." };
    }
    if (n < 0 || n > 100) {
      return { ok: false, error: "Mark must be between 0 and 100." };
    }
    return { ok: true, mark: n };
  },

  /** Simple (unweighted) average, or null if empty. */
  simpleAverage: function (modules) {
    if (!Array.isArray(modules) || modules.length === 0) return null;
    const sum = modules.reduce(function (acc, m) {
      return acc + Number(m.mark);
    }, 0);
    return Math.round((sum / modules.length) * 10) / 10;
  },

  /** Module with the highest mark, or null. */
  highest: function (modules) {
    if (!Array.isArray(modules) || modules.length === 0) return null;
    return modules.reduce(function (best, m) {
      return !best || Number(m.mark) > Number(best.mark) ? m : best;
    }, null);
  },

  /** Module with the lowest mark, or null. */
  lowest: function (modules) {
    if (!Array.isArray(modules) || modules.length === 0) return null;
    return modules.reduce(function (worst, m) {
      return !worst || Number(m.mark) < Number(worst.mark) ? m : worst;
    }, null);
  },

  /** Alias for strongest = highest mark module. */
  bestModule: function (modules) {
    return Academics.highest(modules);
  },

  /**
   * Split list in half by order for a simple "early vs later" compare.
   * Needs at least 4 modules. Returns null otherwise.
   */
  halfComparison: function (modules) {
    if (!Array.isArray(modules) || modules.length < 4) return null;
    const mid = Math.floor(modules.length / 2);
    const early = modules.slice(0, mid);
    const later = modules.slice(mid);
    return {
      earlyAverage: Academics.simpleAverage(early),
      laterAverage: Academics.simpleAverage(later),
      earlyCount: early.length,
      laterCount: later.length,
    };
  },
};
