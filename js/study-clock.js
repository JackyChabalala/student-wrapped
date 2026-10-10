/**
 * study-clock.js — timestamp-based timer
 * Elapsed time uses Date.now() segments. setInterval only refreshes the UI.
 * Paused time is never counted. Cancel never writes a session.
 */

const StudyClock = {
  /**
   * Build a new active session object.
   * @param {string} moduleName
   * @param {number} targetMinutes
   */
  createSession: function (moduleName, targetMinutes) {
    const minutes = Math.max(1, Math.floor(Number(targetMinutes) || 25));
    const now = Date.now();
    return {
      id: makeId("ses"),
      moduleName: String(moduleName).trim(),
      targetSeconds: minutes * 60,
      startedAt: new Date(now).toISOString(),
      accumulatedMs: 0,
      runningSince: now,
      status: "running",
    };
  },

  /** Elapsed study milliseconds (paused time excluded). */
  getElapsedMs: function (session, now) {
    if (!session) return 0;
    const t = typeof now === "number" ? now : Date.now();
    var total = Math.max(0, Number(session.accumulatedMs) || 0);
    if (session.status === "running" && session.runningSince) {
      total += Math.max(0, t - Number(session.runningSince));
    }
    return total;
  },

  getElapsedSeconds: function (session, now) {
    return Math.floor(StudyClock.getElapsedMs(session, now) / 1000);
  },

  pause: function (session) {
    if (!session || session.status !== "running") return session;
    const now = Date.now();
    return Object.assign({}, session, {
      accumulatedMs: StudyClock.getElapsedMs(session, now),
      runningSince: null,
      status: "paused",
    });
  },

  resume: function (session) {
    if (!session || session.status !== "paused") return session;
    return Object.assign({}, session, {
      runningSince: Date.now(),
      status: "running",
    });
  },

  /**
   * Build a completed session record from the active session.
   * Duration = actual elapsed, not the target.
   */
  complete: function (session) {
    if (!session) return null;
    const now = Date.now();
    const elapsedSeconds = StudyClock.getElapsedSeconds(session, now);
    return {
      id: session.id || makeId("ses"),
      moduleName: session.moduleName,
      startedAt: session.startedAt,
      endedAt: new Date(now).toISOString(),
      elapsedSeconds: elapsedSeconds,
      targetSeconds: session.targetSeconds,
      completedDate: new Date(now).toISOString().slice(0, 10),
    };
  },

  /** Format seconds as H:MM:SS or M:SS. */
  formatDuration: function (totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    if (h > 0) return h + ":" + mm + ":" + ss;
    return m + ":" + ss;
  },

  /** iOS-style countdown MM:SS (or H:MM:SS). */
  formatCountdown: function (totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(sec).padStart(2, "0");
    if (h > 0) return h + ":" + mm + ":" + ss;
    return mm + ":" + ss;
  },

  /** Wall-clock end time label, e.g. "4:46 PM". */
  formatEndTime: function (date) {
    try {
      return new Date(date).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (err) {
      return "";
    }
  },

  /** Group completed sessions by module with totals. */
  summariseByModule: function (sessions) {
    const map = {};
    (sessions || []).forEach(function (ses) {
      const key = ses.moduleName;
      if (!map[key]) {
        map[key] = { moduleName: key, totalSeconds: 0, sessions: [] };
      }
      map[key].totalSeconds += Number(ses.elapsedSeconds) || 0;
      map[key].sessions.push(ses);
    });
    return Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .sort(function (a, b) {
        return b.totalSeconds - a.totalSeconds;
      });
  },

  overallTotalSeconds: function (sessions) {
    return (sessions || []).reduce(function (acc, s) {
      return acc + (Number(s.elapsedSeconds) || 0);
    }, 0);
  },

  mostStudiedModule: function (sessions) {
    const groups = StudyClock.summariseByModule(sessions);
    return groups.length ? groups[0] : null;
  },
};
