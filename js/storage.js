/**
 * storage.js — save / load / clear / export / import + validation
 * Never crashes on corrupt data; repairs missing keys and wrong types.
 */

/** Create a fresh, empty studentData object. */
function createEmptyStudentData() {
  return {
    profile: {
      name: "",
      institution: "",
      fieldOfStudy: "",
      yearOfStudy: "",
    },
    academics: [],
    achievements: [],
    music: {
      source: "manual",
      favouriteArtists: [],
      favouriteSongs: [],
      topArtists: [],
      topTracks: [],
      fetchedAt: null,
    },
    lifestyle: {
      coffeeConsumption: "",
      studyEnvironment: "",
      studyHabits: [],
    },
    studySessions: [],
    activeSession: null,
  };
}

/** Coerce a value to a trimmed string. */
function asString(value) {
  if (value == null) return "";
  return String(value).trim();
}

/** Coerce to a finite number or fallback. */
function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Unique-ish id for list items. */
function makeId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

/**
 * Validate and repair any saved payload into a safe studentData shape.
 * @param {*} raw
 * @returns {object}
 */
function validateStudentData(raw) {
  const base = createEmptyStudentData();
  if (!raw || typeof raw !== "object") return base;

  // Profile
  const p = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
  base.profile.name = asString(p.name);
  base.profile.institution = asString(p.institution);
  base.profile.fieldOfStudy = asString(p.fieldOfStudy);
  base.profile.yearOfStudy = asString(p.yearOfStudy);

  // Academics
  if (Array.isArray(raw.academics)) {
    base.academics = raw.academics
      .map(function (row) {
        if (!row || typeof row !== "object") return null;
        const moduleName = asString(row.moduleName);
        const mark = asNumber(row.mark, NaN);
        if (!moduleName || !Number.isFinite(mark)) return null;
        const clamped = Math.max(0, Math.min(100, mark));
        return {
          id: asString(row.id) || makeId("mod"),
          moduleName: moduleName,
          mark: clamped,
        };
      })
      .filter(Boolean);
  }

  // Achievements
  if (Array.isArray(raw.achievements)) {
    base.achievements = raw.achievements
      .map(function (row) {
        if (!row || typeof row !== "object") return null;
        const title = asString(row.title);
        if (!title) return null;
        return {
          id: asString(row.id) || makeId("ach"),
          title: title,
          description: asString(row.description),
          date: asString(row.date),
        };
      })
      .filter(Boolean);
  }

  // Music (itunes previews or manual)
  const m = raw.music && typeof raw.music === "object" ? raw.music : {};
  base.music.favouriteArtists = Array.isArray(m.favouriteArtists)
    ? m.favouriteArtists.map(asString).filter(Boolean)
    : [];
  base.music.favouriteSongs = Array.isArray(m.favouriteSongs)
    ? m.favouriteSongs.map(asString).filter(Boolean)
    : [];
  base.music.topArtists = Array.isArray(m.topArtists)
    ? m.topArtists
        .map(function (row) {
          if (!row || typeof row !== "object") return null;
          const name = asString(row.name);
          if (!name) return null;
          return {
            name: name,
            rank: Math.max(1, Math.floor(asNumber(row.rank, 1))),
            playCount: Math.max(0, Math.floor(asNumber(row.playCount, 0))),
            source: asString(row.source) || "itunes",
            imageUrl: row.imageUrl ? asString(row.imageUrl) : null,
          };
        })
        .filter(Boolean)
    : [];
  base.music.topTracks = Array.isArray(m.topTracks)
    ? m.topTracks
        .map(function (row) {
          if (!row || typeof row !== "object") return null;
          const name = asString(row.name);
          if (!name) return null;
          return {
            id: asString(row.id),
            name: name,
            artist: asString(row.artist),
            rank: Math.max(1, Math.floor(asNumber(row.rank, 1))),
            playCount: Math.max(0, Math.floor(asNumber(row.playCount, row.playcount || 0))),
            source: asString(row.source) || "itunes",
            imageUrl: row.imageUrl ? asString(row.imageUrl) : null,
            previewUrl: asString(row.previewUrl),
          };
        })
        .filter(Boolean)
        .sort(function (a, b) {
          return (b.playCount || 0) - (a.playCount || 0);
        })
        .map(function (t, i) {
          return Object.assign({}, t, { rank: i + 1 });
        })
    : [];
  base.music.fetchedAt = m.fetchedAt ? asString(m.fetchedAt) : null;
  base.music.source =
    m.source === "itunes" || base.music.topTracks.length || base.music.topArtists.length
      ? "itunes"
      : "manual";

  // Lifestyle
  const life = raw.lifestyle && typeof raw.lifestyle === "object" ? raw.lifestyle : {};
  base.lifestyle.coffeeConsumption = asString(life.coffeeConsumption);
  base.lifestyle.studyEnvironment = asString(life.studyEnvironment);
  base.lifestyle.studyHabits = Array.isArray(life.studyHabits)
    ? life.studyHabits.map(asString).filter(Boolean)
    : [];

  // Study sessions (completed only)
  if (Array.isArray(raw.studySessions)) {
    base.studySessions = raw.studySessions
      .map(function (row) {
        if (!row || typeof row !== "object") return null;
        const moduleName = asString(row.moduleName);
        const elapsedSeconds = asNumber(row.elapsedSeconds, NaN);
        if (!moduleName || !Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) return null;
        return {
          id: asString(row.id) || makeId("ses"),
          moduleName: moduleName,
          startedAt: asString(row.startedAt),
          endedAt: asString(row.endedAt),
          elapsedSeconds: Math.floor(elapsedSeconds),
          targetSeconds: Math.max(0, Math.floor(asNumber(row.targetSeconds, 0))),
          completedDate: asString(row.completedDate),
        };
      })
      .filter(Boolean);
  }

  // Active session (may be null)
  if (raw.activeSession && typeof raw.activeSession === "object") {
    const a = raw.activeSession;
    const moduleName = asString(a.moduleName);
    if (moduleName && (a.status === "running" || a.status === "paused")) {
      base.activeSession = {
        id: asString(a.id) || makeId("ses"),
        moduleName: moduleName,
        targetSeconds: Math.max(60, Math.floor(asNumber(a.targetSeconds, 1500))),
        startedAt: asString(a.startedAt) || new Date().toISOString(),
        accumulatedMs: Math.max(0, asNumber(a.accumulatedMs, 0)),
        runningSince: a.status === "running" ? asNumber(a.runningSince, Date.now()) : null,
        status: a.status,
      };
    }
  }

  return base;
}

const Storage = {
  /** Load and repair data from localStorage. */
  load: function () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyStudentData();
      try {
        return validateStudentData(JSON.parse(raw));
      } catch (parseErr) {
        console.warn("[storage] Corrupt JSON repaired to empty data", parseErr);
        return createEmptyStudentData();
      }
    } catch (err) {
      console.warn("[storage] localStorage unavailable", err);
      return createEmptyStudentData();
    }
  },

  /**
   * Persist studentData.
   * @returns {{ ok: boolean, error?: string }}
   */
  save: function (data) {
    try {
      const safe = validateStudentData(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
      return { ok: true };
    } catch (err) {
      console.warn("[storage] save failed", err);
      return {
        ok: false,
        error: "Could not save. Storage may be full or blocked in this browser.",
      };
    }
  },

  /**
   * Clear all saved data.
   * @returns {{ ok: boolean, error?: string }}
   */
  clear: function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: "Could not clear storage in this browser." };
    }
  },

  /** Trigger a JSON file download of current data. */
  exportJson: function (data) {
    const safe = validateStudentData(data);
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-wrapped-data.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Parse imported JSON text into validated studentData.
   * @returns {{ ok: true, data: object } | { ok: false, error: string }}
   */
  importJson: function (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      return { ok: true, data: validateStudentData(parsed) };
    } catch (err) {
      return { ok: false, error: "That file is not valid Student Wrapped JSON." };
    }
  },

  /** Demo dataset — every label includes "Sample". */
  createSampleData: function () {
    const data = createEmptyStudentData();
    data.profile = {
      name: "Sample Student",
      institution: "Sample University",
      fieldOfStudy: "Sample Computer Science",
      yearOfStudy: "Sample Year 2",
    };
    data.academics = [
      { id: makeId("mod"), moduleName: "Sample Algorithms", mark: 78 },
      { id: makeId("mod"), moduleName: "Sample Databases", mark: 85 },
      { id: makeId("mod"), moduleName: "Sample HCI", mark: 72 },
      { id: makeId("mod"), moduleName: "Sample Networks", mark: 68 },
      { id: makeId("mod"), moduleName: "Sample Web Dev", mark: 91 },
    ];
    data.achievements = [
      {
        id: makeId("ach"),
        title: "Sample Hackathon finalist",
        description: "Built a campus tools demo with a team of four.",
        date: "2025-11-12",
      },
      {
        id: makeId("ach"),
        title: "Sample Dean's list",
        description: "Recognised for consistent coursework.",
        date: "2026-01-20",
      },
    ];
    data.music = {
      source: "itunes",
      favouriteArtists: [],
      favouriteSongs: [],
      topArtists: [
        {
          name: "Sample Artist One",
          rank: 1,
          playCount: 8,
          source: "itunes",
          imageUrl: null,
        },
      ],
      topTracks: [
        {
          id: "sample-1",
          name: "Sample Song A",
          artist: "Sample Artist One",
          rank: 1,
          playCount: 8,
          source: "itunes",
          imageUrl: null,
          previewUrl: "",
        },
        {
          id: "sample-2",
          name: "Sample Song B",
          artist: "Sample Artist Two",
          rank: 2,
          playCount: 3,
          source: "itunes",
          imageUrl: null,
          previewUrl: "",
        },
      ],
      fetchedAt: new Date().toISOString(),
    };
    data.lifestyle = {
      coffeeConsumption: "2 (Sample)",
      studyEnvironment: "Sample library corner",
      studyHabits: ["Late-night studying", "Headphones on"],
    };
    const now = Date.now();
    data.studySessions = [
      {
        id: makeId("ses"),
        moduleName: "Sample Algorithms",
        startedAt: new Date(now - 86400000).toISOString(),
        endedAt: new Date(now - 86400000 + 2700000).toISOString(),
        elapsedSeconds: 2700,
        targetSeconds: 3600,
        completedDate: new Date(now - 86400000).toISOString().slice(0, 10),
      },
      {
        id: makeId("ses"),
        moduleName: "Sample Web Dev",
        startedAt: new Date(now - 3600000).toISOString(),
        endedAt: new Date(now - 1800000).toISOString(),
        elapsedSeconds: 1800,
        targetSeconds: 1500,
        completedDate: new Date().toISOString().slice(0, 10),
      },
    ];
    data.activeSession = null;
    return data;
  },
};
