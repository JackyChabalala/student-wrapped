/**
 * config.js — app constants
 * Loaded first so every other script can read these globals.
 *
 * Music uses the free iTunes Search API (no key, ~30s previews).
 */

/** localStorage key for the single studentData object */
const STORAGE_KEY = "studentWrapped_v1";

/** Story auto-advance delay (ms) */
const STORY_AUTO_ADVANCE_MS = 7000;

/** Transition lock so rapid taps do not break card animations (ms) */
const STORY_TRANSITION_LOCK_MS = 550;

/** Valid view ids used by navigation */
const APP_VIEWS = [
  "dashboard",
  "profile",
  "academics",
  "achievements",
  "music",
  "lifestyle",
  "study-clock",
  "wrapped",
  "settings",
];

/** Views under the mobile "More" sheet */
const MORE_VIEWS = ["profile", "achievements", "music", "lifestyle", "settings"];

/** Relatable study-habit chip options (optional) */
const STUDY_HABIT_OPTIONS = [
  "Late-night studying",
  "Library sessions",
  "Desk at home",
  "Study with friends",
  "Headphones on",
  "Phone on silent",
  "Coffee shop vibes",
  "Weekend catch-up",
  "Cram before tests",
  "Early morning focus",
];

/** Background photos for later Wrapped slides only (music → end) */
const WRAPPED_PHOTOS = {
  music:
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900&q=80&auto=format&fit=crop",
  lifestyle:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80&auto=format&fit=crop",
  final:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80&auto=format&fit=crop",
};

/** Story card colour themes (cycle for extra slides) */
const STORY_THEMES = [
  { from: "#3b1cff", to: "#ff3d9a", accent: "#ffe14d" },
  { from: "#00c2a8", to: "#0a2a6b", accent: "#d7ff3f" },
  { from: "#ff7a18", to: "#d6155b", accent: "#fff2a8" },
  { from: "#7c3aed", to: "#1e1b4b", accent: "#5eead4" },
  { from: "#06b6d4", to: "#4f46e5", accent: "#fde047" },
  { from: "#f43f5e", to: "#7f1d1d", accent: "#fde68a" },
  { from: "#ff3d9a", to: "#3b1cff", accent: "#ffe14d" },
];
