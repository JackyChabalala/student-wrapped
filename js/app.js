/**
 * app.js — navigation, forms, rendering, Study Clock UI, Wrapped player
 * Workshop-friendly: small functions, clear comments, no frameworks.
 */

(function initApp() {
  "use strict";

  var state = Storage.load();
  var currentView = "dashboard";
  var clockTimerId = null;
  var story = {
    slides: [],
    index: 0,
    locked: false,
    autoId: null,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    touchStartX: null,
  };

  var toastRegion = document.getElementById("toast-region");
  var moreSheet = document.getElementById("more-sheet");

  /* ===================== Toasts & helpers ===================== */

  function showToast(message, type) {
    if (!toastRegion) return;
    var el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " toast--error" : "");
    el.textContent = message;
    toastRegion.appendChild(el);
    window.setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function persist() {
    var result = Storage.save(state);
    if (!result.ok) {
      showToast(result.error || "Could not save.", "error");
      return false;
    }
    return true;
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".field__error").forEach(function (el) {
      el.hidden = true;
      el.textContent = "";
    });
  }

  function setFieldError(form, name, message) {
    var el = form.querySelector('[data-error-for="' + name + '"]');
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ===================== Navigation ===================== */

  function openMoreSheet() {
    if (!moreSheet) return;
    moreSheet.hidden = false;
    var first = moreSheet.querySelector(".sheet__link");
    if (first) first.focus();
  }

  function closeMoreSheet() {
    if (!moreSheet) return;
    moreSheet.hidden = true;
  }

  function showView(viewId) {
    if (!APP_VIEWS.includes(viewId)) {
      showToast("Unknown page.", "error");
      return;
    }
    currentView = viewId;

    document.querySelectorAll("[data-view-panel]").forEach(function (panel) {
      var match = panel.getAttribute("data-view-panel") === viewId;
      panel.hidden = !match;
      panel.classList.toggle("is-active", match);
      panel.setAttribute("aria-hidden", match ? "false" : "true");
    });

    document.querySelectorAll("[data-view]").forEach(function (btn) {
      var match = btn.getAttribute("data-view") === viewId;
      btn.classList.toggle("is-active", match);
      if (match) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    document.querySelectorAll(".tabbar__item").forEach(function (item) {
      if (item.getAttribute("data-action") === "open-more") {
        item.classList.toggle("is-active", MORE_VIEWS.includes(viewId));
      }
    });

    closeMoreSheet();
    document.body.classList.toggle("story-open", viewId === "wrapped");

    if (viewId !== "wrapped") {
      stopStoryAuto();
      stopWrappedSoundtrack();
    } else {
      renderWrapped();
      startWrappedSoundtrack();
    }

    if (viewId === "study-clock") renderStudyClock();
    if (viewId === "music") renderMusic();
    if (viewId === "academics") renderAcademics();
    if (viewId === "achievements") renderAchievements();
    if (viewId === "profile") fillProfileForm();
    if (viewId === "lifestyle") fillLifestyleForm();
    if (viewId === "dashboard") renderDashboard();
    if (viewId === "settings") renderSettingsHints();

    var main = document.getElementById("main");
    if (main) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: story.reducedMotion ? "auto" : "smooth" });
  }

  /* ===================== Dashboard ===================== */

  function profileCompletion() {
    var p = state.profile;
    var fields = [p.name, p.institution, p.fieldOfStudy, p.yearOfStudy];
    var filled = fields.filter(Boolean).length;
    var extras = 0;
    if (state.academics.length) extras += 1;
    if (state.achievements.length) extras += 1;
    if (state.studySessions.length) extras += 1;
    if (
      (state.music.topArtists && state.music.topArtists.length) ||
      state.music.favouriteArtists.length ||
      state.music.favouriteSongs.length
    ) {
      extras += 1;
    }
    // 4 profile fields + 4 content areas = 8
    return Math.round(((filled + extras) / 8) * 100);
  }

  function renderDashboard() {
    var name = state.profile.name;
    var greeting = document.querySelector("[data-dash-greeting]");
    if (greeting) {
      greeting.textContent = name ? "Hey, " + name : "Student Wrapped";
    }

    var pct = profileCompletion();
    var pctEl = document.querySelector("[data-completion-pct]");
    if (pctEl) pctEl.textContent = pct + "%";
    var circle = document.querySelector("[data-completion-circle]");
    if (circle) {
      var circumference = 2 * Math.PI * 52;
      circle.style.strokeDasharray = String(circumference);
      circle.style.strokeDashoffset = String(circumference * (1 - pct / 100));
    }
    var hint = document.querySelector("[data-completion-hint]");
    if (hint) {
      hint.textContent = pct >= 75
        ? "Looking full — open your Wrapped when you are ready."
        : "Fill in Profile and a few sections to enrich your Wrapped.";
    }

    var avg = Academics.simpleAverage(state.academics);
    var hours =
      Math.round((StudyClock.overallTotalSeconds(state.studySessions) / 3600) * 10) / 10;
    setText("[data-stat-modules]", String(state.academics.length));
    setText("[data-stat-average]", avg == null ? "—" : String(avg));
    setText("[data-stat-study]", hours + "h");
    setText("[data-stat-achievements]", String(state.achievements.length));
  }

  function setText(sel, text) {
    var el = document.querySelector(sel);
    if (el) el.textContent = text;
  }

  /* ===================== Profile ===================== */

  function fillProfileForm() {
    var form = document.getElementById("form-profile");
    if (!form) return;
    form.name.value = state.profile.name || "";
    form.institution.value = state.profile.institution || "";
    form.fieldOfStudy.value = state.profile.fieldOfStudy || "";
    form.yearOfStudy.value = state.profile.yearOfStudy || "";
    clearFieldErrors(form);
  }

  function onProfileSubmit(event) {
    event.preventDefault();
    var form = event.target;
    clearFieldErrors(form);
    var name = form.name.value.trim();
    if (!name) {
      setFieldError(form, "name", "Name is required.");
      showToast("Add your name to save.", "error");
      return;
    }
    state.profile = {
      name: name,
      institution: form.institution.value.trim(),
      fieldOfStudy: form.fieldOfStudy.value.trim(),
      yearOfStudy: form.yearOfStudy.value.trim(),
    };
    if (persist()) {
      showToast("Profile saved.");
      renderDashboard();
    }
  }

  /* ===================== Academics ===================== */

  function renderAcademics() {
    var avg = Academics.simpleAverage(state.academics);
    var high = Academics.highest(state.academics);
    var low = Academics.lowest(state.academics);
    var best = Academics.bestModule(state.academics);
    setText("[data-acad-avg]", avg == null ? "—" : String(avg));
    setText("[data-acad-high]", high ? String(high.mark) : "—");
    setText("[data-acad-low]", low ? String(low.mark) : "—");
    setText("[data-acad-best]", best ? best.moduleName : "—");

    var list = document.getElementById("module-list");
    if (!list) return;
    if (!state.academics.length) {
      list.innerHTML = '<p class="empty-state">No modules yet. Add one above.</p>';
      return;
    }
    list.innerHTML = state.academics
      .map(function (m) {
        return (
          '<article class="list-item">' +
          '<div><strong>' +
          escapeHtml(m.moduleName) +
          '</strong><p class="muted">' +
          escapeHtml(String(m.mark)) +
          "%</p></div>" +
          '<div class="list-item__actions">' +
          '<button type="button" class="btn btn--secondary btn--small" data-edit-module="' +
          escapeHtml(m.id) +
          '">Edit</button>' +
          '<button type="button" class="btn btn--danger btn--small" data-delete-module="' +
          escapeHtml(m.id) +
          '">Delete</button>' +
          "</div></article>"
        );
      })
      .join("");
  }

  function resetModuleForm() {
    var form = document.getElementById("form-module");
    if (!form) return;
    form.reset();
    document.getElementById("module-edit-id").value = "";
    document.querySelector("[data-module-submit]").textContent = "Add module";
    document.getElementById("module-cancel-edit").hidden = true;
    clearFieldErrors(form);
  }

  function onModuleSubmit(event) {
    event.preventDefault();
    var form = event.target;
    clearFieldErrors(form);
    var moduleName = form.moduleName.value.trim();
    var markCheck = Academics.validateMark(form.mark.value);
    var ok = true;
    if (!moduleName) {
      setFieldError(form, "moduleName", "Module name is required.");
      ok = false;
    }
    if (!markCheck.ok) {
      setFieldError(form, "mark", markCheck.error);
      ok = false;
    }
    if (!ok) {
      showToast("Check the module fields.", "error");
      return;
    }

    var editId = document.getElementById("module-edit-id").value;
    if (editId) {
      state.academics = state.academics.map(function (m) {
        if (m.id !== editId) return m;
        return { id: m.id, moduleName: moduleName, mark: markCheck.mark };
      });
      showToast("Module updated.");
    } else {
      state.academics.push({
        id: makeId("mod"),
        moduleName: moduleName,
        mark: markCheck.mark,
      });
      showToast("Module saved.");
    }
    persist();
    resetModuleForm();
    renderAcademics();
    renderDashboard();
    populateClockModules();
  }

  /* ===================== Achievements ===================== */

  function renderAchievements() {
    var list = document.getElementById("achievement-list");
    if (!list) return;
    if (!state.achievements.length) {
      list.innerHTML = '<p class="empty-state">No achievements yet.</p>';
      return;
    }
    list.innerHTML = state.achievements
      .map(function (a) {
        return (
          '<article class="list-item">' +
          "<div><strong>" +
          escapeHtml(a.title) +
          "</strong>" +
          (a.date ? '<p class="muted">' + escapeHtml(a.date) + "</p>" : "") +
          (a.description
            ? "<p>" + escapeHtml(a.description) + "</p>"
            : "") +
          '</div><div class="list-item__actions">' +
          '<button type="button" class="btn btn--secondary btn--small" data-edit-achievement="' +
          escapeHtml(a.id) +
          '">Edit</button>' +
          '<button type="button" class="btn btn--danger btn--small" data-delete-achievement="' +
          escapeHtml(a.id) +
          '">Delete</button>' +
          "</div></article>"
        );
      })
      .join("");
  }

  function resetAchievementForm() {
    var form = document.getElementById("form-achievement");
    if (!form) return;
    form.reset();
    document.getElementById("achievement-edit-id").value = "";
    document.querySelector("[data-achievement-submit]").textContent = "Add achievement";
    document.getElementById("achievement-cancel-edit").hidden = true;
    clearFieldErrors(form);
  }

  function onAchievementSubmit(event) {
    event.preventDefault();
    var form = event.target;
    clearFieldErrors(form);
    var title = form.title.value.trim();
    if (!title) {
      setFieldError(form, "title", "Title is required.");
      showToast("Add a title.", "error");
      return;
    }
    var payload = {
      title: title,
      description: form.description.value.trim(),
      date: form.date.value,
    };
    var editId = document.getElementById("achievement-edit-id").value;
    if (editId) {
      state.achievements = state.achievements.map(function (a) {
        if (a.id !== editId) return a;
        return Object.assign({ id: a.id }, payload);
      });
      showToast("Achievement updated.");
    } else {
      state.achievements.push(Object.assign({ id: makeId("ach") }, payload));
      showToast("Achievement saved.");
    }
    persist();
    resetAchievementForm();
    renderAchievements();
    renderDashboard();
  }

  /* ===================== Lifestyle ===================== */

  function fillLifestyleForm() {
    var form = document.getElementById("form-lifestyle");
    if (!form) return;
    form.coffeeConsumption.value = state.lifestyle.coffeeConsumption || "";
    form.studyEnvironment.value = state.lifestyle.studyEnvironment || "";
    var wrap = document.getElementById("habit-chips");
    if (!wrap) return;
    wrap.innerHTML = STUDY_HABIT_OPTIONS.map(function (habit) {
      var selected = state.lifestyle.studyHabits.indexOf(habit) !== -1;
      return (
        '<button type="button" class="chip' +
        (selected ? " is-selected" : "") +
        '" data-habit="' +
        escapeHtml(habit) +
        '" aria-pressed="' +
        selected +
        '">' +
        escapeHtml(habit) +
        "</button>"
      );
    }).join("");
    renderLifestyleSaved();
  }

  function renderLifestyleSaved() {
    var panel = document.getElementById("lifestyle-saved");
    var body = document.getElementById("lifestyle-saved-body");
    if (!panel || !body) return;
    var life = state.lifestyle || {};
    var habits = life.studyHabits || [];
    var has =
      Boolean(life.coffeeConsumption) ||
      Boolean(life.studyEnvironment) ||
      habits.length > 0;
    panel.hidden = !has;
    if (!has) {
      body.innerHTML = "";
      return;
    }
    body.innerHTML =
      "<dt>Coffee / drinks</dt><dd>" +
      escapeHtml(life.coffeeConsumption || "—") +
      "</dd>" +
      "<dt>Study environment</dt><dd>" +
      escapeHtml(life.studyEnvironment || "—") +
      "</dd>" +
      "<dt>Study habits</dt><dd>" +
      escapeHtml(habits.length ? habits.join(" · ") : "—") +
      "</dd>";
  }

  function onLifestyleSubmit(event) {
    event.preventDefault();
    var form = event.target;
    var selected = [];
    document.querySelectorAll("#habit-chips .chip.is-selected").forEach(function (chip) {
      selected.push(chip.getAttribute("data-habit"));
    });
    state.lifestyle = {
      coffeeConsumption: form.coffeeConsumption.value.trim(),
      studyEnvironment: form.studyEnvironment.value.trim(),
      studyHabits: selected,
    };
    if (persist()) {
      renderLifestyleSaved();
      renderDashboard();
      showToast("Lifestyle saved.");
    }
  }

  /* ===================== Music (iTunes 30s previews) ===================== */

  var latestSearchResults = [];
  var currentPreviewTrack = null;

  function renderSettingsHints() {
    /* settings are static buttons */
  }

  function renderMusic() {
    renderSavedTracks();
  }

  function renderSavedTracks() {
    var root = document.getElementById("music-saved-results");
    var status = document.getElementById("music-saved-status");
    if (!root) return;
    var tracks = (state.music.topTracks || []).slice().sort(function (a, b) {
      return (b.playCount || 0) - (a.playCount || 0);
    });
    state.music.topTracks = tracks.map(function (t, i) {
      return Object.assign({}, t, { rank: i + 1 });
    });
    if (!tracks.length) {
      root.innerHTML = "";
      if (status) {
        status.textContent =
          "Every time you hit Play, that song moves up your ranking for Wrapped.";
      }
      return;
    }
    if (status) {
      status.textContent =
        tracks.length +
        " track" +
        (tracks.length === 1 ? "" : "s") +
        " ranked by how many times you played them.";
    }
    root.innerHTML =
      '<ol class="rank-list">' +
      tracks
        .map(function (t, i) {
          var plays = Number(t.playCount) || 0;
          return (
            "<li>" +
            artTile(t.name, t.imageUrl) +
            "<div><strong>" +
            escapeHtml(i + 1 + ". " + t.name) +
            "</strong>" +
            (t.artist
              ? '<p class="muted">' + escapeHtml(t.artist) + "</p>"
              : "") +
            '<p class="muted">' +
            escapeHtml(String(plays)) +
            (plays === 1 ? " play" : " plays") +
            "</p>" +
            '</div><button type="button" class="btn btn--danger btn--small" data-remove-saved="' +
            i +
            '">Remove</button></li>'
          );
        })
        .join("") +
      "</ol>";
  }

  function rebuildTopArtistsFromTracks() {
    var artistMap = {};
    (state.music.topTracks || []).forEach(function (t) {
      if (!t.artist) return;
      if (!artistMap[t.artist]) {
        artistMap[t.artist] = {
          name: t.artist,
          playCount: 0,
          source: "itunes",
          imageUrl: t.imageUrl || null,
        };
      }
      artistMap[t.artist].playCount += Number(t.playCount) || 0;
      if (!artistMap[t.artist].imageUrl && t.imageUrl) {
        artistMap[t.artist].imageUrl = t.imageUrl;
      }
    });
    state.music.topArtists = Object.keys(artistMap)
      .map(function (k) {
        return artistMap[k];
      })
      .sort(function (a, b) {
        return (b.playCount || 0) - (a.playCount || 0);
      })
      .slice(0, 5)
      .map(function (a, i) {
        return Object.assign({}, a, { rank: i + 1 });
      });
  }

  function recordTrackPlay(track) {
    if (!track) return;
    state.music.topTracks = state.music.topTracks || [];
    var existing = null;
    for (var i = 0; i < state.music.topTracks.length; i++) {
      var t = state.music.topTracks[i];
      if (
        (track.id && t.id === track.id) ||
        (t.name === track.name && t.artist === track.artist)
      ) {
        existing = t;
        break;
      }
    }
    if (existing) {
      existing.playCount = (Number(existing.playCount) || 0) + 1;
      if (track.imageUrl) existing.imageUrl = track.imageUrl;
      if (track.previewUrl) existing.previewUrl = track.previewUrl;
      if (track.id) existing.id = track.id;
    } else {
      state.music.topTracks.push({
        id: track.id || "",
        name: track.name,
        artist: track.artist || "",
        rank: 1,
        playCount: 1,
        source: "itunes",
        imageUrl: track.imageUrl || null,
        previewUrl: track.previewUrl || "",
      });
    }
    state.music.topTracks.sort(function (a, b) {
      return (b.playCount || 0) - (a.playCount || 0);
    });
    state.music.topTracks = state.music.topTracks.slice(0, 20).map(function (t, idx) {
      return Object.assign({}, t, { rank: idx + 1 });
    });
    rebuildTopArtistsFromTracks();
    state.music.source = "itunes";
    state.music.fetchedAt = new Date().toISOString();
    persist();
    renderSavedTracks();
    renderDashboard();
  }

  function artTile(name, url) {
    if (url) {
      return (
        '<img class="art-tile" src="' +
        escapeHtml(url) +
        '" alt="" width="56" height="56" loading="lazy" />'
      );
    }
    return (
      '<span class="art-tile art-tile--fallback" aria-hidden="true">' +
      escapeHtml(Music.initials(name)) +
      "</span>"
    );
  }

  function renderSearchResults(tracks) {
    latestSearchResults = tracks || [];
    var root = document.getElementById("music-search-results");
    if (!root) return;
    if (!latestSearchResults.length) {
      root.innerHTML =
        '<p class="empty-state">No previews found. Try another search.</p>';
      return;
    }
    root.innerHTML = latestSearchResults
      .map(function (t, i) {
        return (
          '<article class="track-row">' +
          artTile(t.name, t.imageUrl) +
          '<div class="track-row__meta"><strong>' +
          escapeHtml(t.name) +
          '</strong><p class="muted">' +
          escapeHtml(t.artist) +
          (t.album ? " · " + escapeHtml(t.album) : "") +
          "</p></div>" +
          '<button type="button" class="btn btn--primary btn--small" data-play-track="' +
          i +
          '">Play</button>' +
          "</article>"
        );
      })
      .join("");
  }

  function playSearchTrack(index) {
    var track = latestSearchResults[index];
    if (!track || !track.previewUrl) {
      showToast("No preview available for that track.", "error");
      return;
    }

    currentPreviewTrack = track;
    var wrap = document.getElementById("music-player-wrap");
    var audio = document.getElementById("music-audio");
    var title = document.getElementById("music-now-playing");
    var artist = document.getElementById("music-now-artist");
    var art = document.getElementById("music-now-art");
    var status = document.getElementById("music-search-status");

    if (wrap) wrap.hidden = false;
    if (title) title.innerHTML = "<strong>" + escapeHtml(track.name) + "</strong>";
    if (artist) artist.textContent = track.artist || "";
    if (art) {
      if (track.imageUrl) {
        art.src = track.imageUrl;
        art.hidden = false;
      } else {
        art.hidden = true;
      }
    }
    if (audio) {
      audio.src = track.previewUrl;
      audio.play().catch(function () {
        showToast("Press play on the audio control if autoplay is blocked.");
      });
    }
    if (status) status.textContent = "Playing 30s preview…";
    recordTrackPlay(track);
    showToast("Playing preview: " + track.name);
  }

  /* ===================== Study Clock ===================== */

  function populateClockModules() {
    var select = document.getElementById("clock-module-select");
    if (!select) return;
    var current = select.value;
    var names = state.academics.map(function (m) {
      return m.moduleName;
    });
    // Also include modules that only exist on past sessions
    state.studySessions.forEach(function (s) {
      if (names.indexOf(s.moduleName) === -1) names.push(s.moduleName);
    });
    select.innerHTML =
      names
        .map(function (n) {
          return (
            '<option value="' +
            escapeHtml(n) +
            '">' +
            escapeHtml(n) +
            "</option>"
          );
        })
        .join("") + '<option value="__new__">+ Add new module…</option>';
    if (current && [].some.call(select.options, function (o) { return o.value === current; })) {
      select.value = current;
    }
    toggleNewModuleField();
  }

  function toggleNewModuleField() {
    var select = document.getElementById("clock-module-select");
    var field = document.getElementById("clock-new-module-field");
    if (!select || !field) return;
    field.hidden = select.value !== "__new__";
  }

  function getSelectedClockModule() {
    var select = document.getElementById("clock-module-select");
    if (!select) return "";
    if (select.value === "__new__") {
      return document.getElementById("clock-new-module").value.trim();
    }
    return select.value.trim();
  }

  function startClockTick() {
    stopClockTick();
    clockTimerId = window.setInterval(updateClockDisplay, 250);
  }

  function stopClockTick() {
    if (clockTimerId) {
      clearInterval(clockTimerId);
      clockTimerId = null;
    }
  }

  var CLOCK_RING_C = 2 * Math.PI * 120;

  function setClockRing(fraction) {
    var ring = document.getElementById("clock-ring");
    if (!ring) return;
    var f = Math.max(0, Math.min(1, Number(fraction) || 0));
    ring.style.strokeDasharray = String(CLOCK_RING_C);
    ring.style.strokeDashoffset = String(CLOCK_RING_C * (1 - f));
  }

  function updateClockDisplay() {
    var session = state.activeSession;
    var timeEl = document.getElementById("clock-time");
    var metaEl = document.getElementById("clock-meta");
    var overEl = document.getElementById("clock-over");
    var endEl = document.getElementById("clock-end");
    var targetInput = document.getElementById("clock-target");

    if (!session) {
      var minutes = Number(targetInput && targetInput.value);
      if (!Number.isFinite(minutes) || minutes < 1) minutes = 25;
      var idleSeconds = Math.floor(minutes * 60);
      if (timeEl) timeEl.textContent = StudyClock.formatCountdown(idleSeconds);
      if (metaEl) metaEl.textContent = "Ready";
      if (overEl) overEl.hidden = true;
      if (endEl) endEl.textContent = "Set a target, then start";
      setClockRing(1);
      return;
    }

    var elapsed = StudyClock.getElapsedSeconds(session);
    var target = Math.max(1, Number(session.targetSeconds) || 1);
    var remaining = Math.max(0, target - elapsed);
    var over = elapsed > target;

    if (timeEl) {
      timeEl.textContent = over
        ? "+" + StudyClock.formatCountdown(elapsed - target)
        : StudyClock.formatCountdown(remaining);
    }
    setClockRing(over ? 0 : remaining / target);

    if (endEl) {
      if (session.status === "paused") {
        endEl.textContent = "Paused";
      } else if (over) {
        endEl.textContent = "Over target";
      } else {
        var endAt = Date.now() + remaining * 1000;
        endEl.textContent = StudyClock.formatEndTime(endAt);
      }
    }

    if (metaEl) {
      metaEl.textContent =
        session.moduleName +
        " · target " +
        StudyClock.formatCountdown(target) +
        (session.status === "paused" ? " · paused" : " · running");
    }
    if (overEl) overEl.hidden = !over;
  }

  function syncClockButtons() {
    var session = state.activeSession;
    var start = document.getElementById("clock-start");
    var pause = document.getElementById("clock-pause");
    var resume = document.getElementById("clock-resume");
    var complete = document.getElementById("clock-complete");
    var cancel = document.getElementById("clock-cancel");
    var setup = document.getElementById("form-clock-setup");

    var active = Boolean(session);
    if (start) start.hidden = active;
    if (pause) pause.hidden = !(active && session.status === "running");
    if (resume) resume.hidden = !(active && session.status === "paused");
    if (complete) complete.hidden = !active;
    if (cancel) cancel.hidden = !active;
    if (setup) {
      setup.querySelectorAll("input, select").forEach(function (el) {
        el.disabled = active;
      });
    }
  }

  function renderStudyClock() {
    populateClockModules();
    syncClockButtons();
    updateClockDisplay();
    if (state.activeSession && state.activeSession.status === "running") {
      startClockTick();
    } else {
      stopClockTick();
    }

    var overall = StudyClock.overallTotalSeconds(state.studySessions);
    setText("#clock-overall-total", "Overall: " + StudyClock.formatDuration(overall));

    var history = document.getElementById("session-history");
    if (!history) return;
    var groups = StudyClock.summariseByModule(state.studySessions);
    if (!groups.length) {
      history.innerHTML = '<p class="empty-state">No saved sessions yet.</p>';
      return;
    }
    history.innerHTML = groups
      .map(function (g) {
        var items = g.sessions
          .map(function (s) {
            return (
              "<li>" +
              escapeHtml(StudyClock.formatDuration(s.elapsedSeconds)) +
              (s.completedDate ? " · " + escapeHtml(s.completedDate) : "") +
              (s.elapsedSeconds > s.targetSeconds ? ' <span class="badge">over target</span>' : "") +
              "</li>"
            );
          })
          .join("");
        return (
          '<div class="session-group"><h3>' +
          escapeHtml(g.moduleName) +
          '</h3><p class="muted">Total ' +
          escapeHtml(StudyClock.formatDuration(g.totalSeconds)) +
          "</p><ul>" +
          items +
          "</ul></div>"
        );
      })
      .join("");
  }

  function onClockStart() {
    if (state.activeSession) {
      showToast("Finish or cancel the current session first.", "error");
      return;
    }
    var moduleName = getSelectedClockModule();
    if (!moduleName) {
      showToast("Choose or enter a module name.", "error");
      return;
    }
    var minutes = Number(document.getElementById("clock-target").value);
    if (!Number.isFinite(minutes) || minutes < 1) {
      showToast("Target must be at least 1 minute.", "error");
      return;
    }

    // If new module name is not in academics, leave academics alone —
    // sessions can use module names freely (simplest option).
    state.activeSession = StudyClock.createSession(moduleName, minutes);
    persist();
    renderStudyClock();
    showToast("Session started.");
  }

  function onClockPause() {
    if (!state.activeSession) return;
    state.activeSession = StudyClock.pause(state.activeSession);
    persist();
    renderStudyClock();
    showToast("Paused — time is not counting.");
  }

  function onClockResume() {
    if (!state.activeSession) return;
    state.activeSession = StudyClock.resume(state.activeSession);
    persist();
    renderStudyClock();
    showToast("Resumed.");
  }

  function onClockCancel() {
    if (!state.activeSession) return;
    if (!window.confirm("Cancel this session? It will not be saved.")) return;
    state.activeSession = null;
    persist();
    renderStudyClock();
    showToast("Session cancelled — nothing saved.");
  }

  function onClockComplete() {
    if (!state.activeSession) return;
    var record = StudyClock.complete(state.activeSession);
    if (!record || record.elapsedSeconds <= 0) {
      showToast("Nothing to save yet — study a little longer.", "error");
      return;
    }
    state.studySessions.push(record);
    state.activeSession = null;
    persist();
    renderStudyClock();
    renderDashboard();
    showToast(
      "Saved " + StudyClock.formatDuration(record.elapsedSeconds) + " for " + record.moduleName + "."
    );
  }

  /* ===================== Wrapped story ===================== */

  function stopStoryAuto() {
    if (story.autoId) {
      clearTimeout(story.autoId);
      story.autoId = null;
    }
  }

  function scheduleStoryAuto() {
    stopStoryAuto();
    if (story.reducedMotion) return;
    if (story.index >= story.slides.length - 1) return;
    story.autoId = window.setTimeout(function () {
      goStory(1);
    }, STORY_AUTO_ADVANCE_MS);
  }

  /* ===================== Wrapped soundtrack (#1 track, loop while open) ===================== */

  function getWrappedNumberOneTrack() {
    var tracks = (state.music.topTracks || []).slice().sort(function (a, b) {
      return (b.playCount || 0) - (a.playCount || 0);
    });
    return tracks.length ? tracks[0] : null;
  }

  function stopWrappedSoundtrack() {
    var audio = document.getElementById("wrapped-soundtrack");
    if (!audio) return;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch (err) {
      /* ignore */
    }
  }

  /**
   * Play the #1 saved Wrapped track on loop while My Wrapped is open.
   * Stops automatically when leaving the view.
   */
  async function startWrappedSoundtrack() {
    var audio = document.getElementById("wrapped-soundtrack");
    if (!audio) return;

    // Don't play on the empty "add some info" screen
    var built = Wrapped.buildSlides(state);
    if (built.empty) {
      stopWrappedSoundtrack();
      return;
    }

    var track = getWrappedNumberOneTrack();
    if (!track) {
      stopWrappedSoundtrack();
      return;
    }

    // Pause the Music-page player so two clips don't overlap
    var musicAudio = document.getElementById("music-audio");
    if (musicAudio) {
      try {
        musicAudio.pause();
      } catch (err) {
        /* ignore */
      }
    }

    var previewUrl = track.previewUrl || "";
    if (!previewUrl) {
      try {
        var q = (track.artist ? track.artist + " " : "") + track.name;
        var found = await Music.searchTracks(q);
        if (found[0] && found[0].previewUrl) {
          previewUrl = found[0].previewUrl;
          // Cache on the saved track for next time
          track.previewUrl = previewUrl;
          if (found[0].imageUrl && !track.imageUrl) track.imageUrl = found[0].imageUrl;
          persist();
        }
      } catch (err) {
        previewUrl = "";
      }
    }

    // User may have left Wrapped while we were fetching
    if (currentView !== "wrapped" || !previewUrl) {
      if (!previewUrl && currentView === "wrapped") {
        showToast("No preview available for your #1 track.", "error");
      }
      return;
    }

    audio.loop = true;
    audio.src = previewUrl;
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (err) {
      showToast("Tap anywhere on Wrapped to start the music.");
      var unlock = function () {
        if (currentView !== "wrapped") return;
        audio.play().catch(function () {
          /* ignore */
        });
        document.removeEventListener("pointerdown", unlock);
      };
      document.addEventListener("pointerdown", unlock, { once: true });
    }
  }

  function renderWrapped() {
    var built = Wrapped.buildSlides(state);
    var emptyEl = document.getElementById("wrapped-empty");
    var player = document.getElementById("wrapped-player");
    var suggestions = document.getElementById("wrapped-suggestions");

    if (built.empty) {
      stopWrappedSoundtrack();
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.setAttribute("aria-hidden", "false");
      }
      if (player) {
        player.hidden = true;
        player.setAttribute("aria-hidden", "true");
      }
      stopStoryAuto();
      if (suggestions) {
        suggestions.innerHTML = built.suggestions
          .map(function (s) {
            return (
              '<button type="button" class="btn btn--primary" data-view="' +
              escapeHtml(s.view) +
              '">' +
              escapeHtml(s.label) +
              "</button>"
            );
          })
          .join("");
      }
      return;
    }

    if (emptyEl) {
      emptyEl.hidden = true;
      emptyEl.setAttribute("aria-hidden", "true");
    }
    if (player) {
      player.hidden = false;
      player.setAttribute("aria-hidden", "false");
    }
    story.slides = built.slides;
    story.index = 0;
    mountStorySlides(true);
    scheduleStoryAuto();
  }

  function mountStorySlides(instant) {
    var stack = document.getElementById("story-stack");
    var progress = document.getElementById("story-progress");
    if (!stack || !progress) return;

    progress.innerHTML = story.slides
      .map(function (_, i) {
        var cls = "story-progress__seg";
        if (i < story.index) cls += " is-done";
        if (i === story.index) cls += " is-current";
        return '<span class="' + cls + '"><i></i></span>';
      })
      .join("");

    stack.innerHTML = story.slides
      .map(function (slide, i) {
        return (
          '<article class="story-card' +
          (slide.photo ? " story-card--photo" : "") +
          '" data-story-index="' +
          i +
          '" style="--from:' +
          slide.theme.from +
          ";--to:" +
          slide.theme.to +
          ";--accent:" +
          slide.theme.accent +
          (slide.photo ? ";--photo:url('" + escapeHtml(slide.photo) + "')" : "") +
          ";" +
          (i === story.index ? "" : "visibility:hidden;") +
          '">' +
          renderSlideInner(slide) +
          "</article>"
        );
      })
      .join("");

    // Ensure current card visible on top
    if (story.index < 0 || story.index >= story.slides.length) {
      story.index = 0;
    }
    var cards = stack.querySelectorAll(".story-card");
    cards.forEach(function (card, i) {
      card.style.transform = "";
      card.style.opacity = "";
      if (i === story.index) {
        card.style.visibility = "visible";
        card.style.zIndex = "3";
        if (!instant && !story.reducedMotion) animateCardEnter(card);
        else runCountUps(card);
        bindFinalActions(card);
      } else {
        card.style.visibility = "hidden";
        card.style.zIndex = "1";
      }
    });

    // Desktop tilt
    bindStoryTilt(stack.querySelector('.story-card[data-story-index="' + story.index + '"]'));

    // Load music artwork for music slides asynchronously
    story.slides.forEach(function (slide, i) {
      if (slide.type !== "music" || slide.artworkUrl || !slide.artworkTerm) return;
      Music.lookupArtwork(slide.artworkTerm).then(function (url) {
        if (!url) return;
        slide.artworkUrl = url;
        var img = stack.querySelector(
          '.story-card[data-story-index="' + i + '"] [data-story-art]'
        );
        if (img) {
          img.style.backgroundImage = "url('" + url + "')";
          img.textContent = "";
        }
      });
    });
  }

  function renderSlideInner(slide) {
    var shapes =
      '<span class="story-shape story-shape--a" aria-hidden="true"></span>' +
      '<span class="story-shape story-shape--b" aria-hidden="true"></span>' +
      '<span class="story-dots" aria-hidden="true"></span>';

    if (slide.type === "intro") {
      return (
        shapes +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<h2 class="story-title stagger">' +
        escapeHtml(slide.title) +
        "</h2>" +
        '<p class="story-sub stagger">' +
        escapeHtml(slide.subtitle) +
        "</p>"
      );
    }

    if (slide.type === "stat" || slide.type === "study") {
      return (
        shapes +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<p class="story-label stagger">' +
        escapeHtml(slide.label) +
        "</p>" +
        '<p class="story-number stagger" data-count="' +
        escapeHtml(String(slide.value)) +
        '">0</p>' +
        (slide.suffix
          ? '<p class="story-suffix stagger">' + escapeHtml(slide.suffix) + "</p>"
          : "") +
        '<p class="story-sub stagger">' +
        escapeHtml(slide.detail || "") +
        "</p>" +
        (slide.footnote
          ? '<p class="story-footnote stagger">' + escapeHtml(slide.footnote) + "</p>"
          : "")
      );
    }

    if (slide.type === "highlight") {
      return (
        shapes +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<h2 class="story-title stagger">' +
        escapeHtml(slide.title) +
        "</h2>" +
        '<p class="story-number stagger" data-count="' +
        escapeHtml(String(slide.value)) +
        '">0</p>' +
        '<p class="story-suffix stagger">' +
        escapeHtml(slide.suffix || "") +
        "</p>" +
        '<p class="story-sub stagger">' +
        escapeHtml(slide.detail || "") +
        "</p>"
      );
    }

    if (slide.type === "compare") {
      return (
        shapes +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<h2 class="story-title stagger">' +
        escapeHtml(slide.title) +
        "</h2>" +
        '<div class="story-compare stagger">' +
        "<div><span>" +
        escapeHtml(slide.leftLabel) +
        '</span><strong data-count="' +
        escapeHtml(String(slide.leftValue)) +
        '">0</strong></div>' +
        "<div><span>" +
        escapeHtml(slide.rightLabel) +
        '</span><strong data-count="' +
        escapeHtml(String(slide.rightValue)) +
        '">0</strong></div>' +
        "</div>" +
        '<p class="story-sub stagger">' +
        escapeHtml(slide.detail || "") +
        "</p>"
      );
    }

    if (slide.type === "achievements") {
      return (
        shapes +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<h2 class="story-title stagger">' +
        escapeHtml(slide.title) +
        "</h2>" +
        "<ul class=\"story-list\">" +
        slide.items
          .map(function (item) {
            return '<li class="stagger">' + escapeHtml(item) + "</li>";
          })
          .join("") +
        "</ul>"
      );
    }

    if (slide.type === "music") {
      var art =
        '<div class="story-art stagger" data-story-art' +
        (slide.artworkUrl
          ? ' style="background-image:url(\'' + escapeHtml(slide.artworkUrl) + "')\""
          : "") +
        ">" +
        (slide.artworkUrl
          ? ""
          : escapeHtml(Music.initials(slide.artist || slide.track || "?"))) +
        "</div>";
      return (
        shapes +
        art +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<h2 class="story-title stagger">' +
        escapeHtml(slide.title) +
        "</h2>" +
        (slide.artist
          ? '<p class="story-sub stagger"><strong>' +
            escapeHtml(slide.artist) +
            "</strong></p>"
          : "") +
        (slide.track
          ? '<p class="story-sub stagger">' + escapeHtml(slide.track) + "</p>"
          : "") +
        (slide.scrobbles != null
          ? '<p class="story-number stagger" data-count="' +
            escapeHtml(String(slide.scrobbles)) +
            '">0</p><p class="story-suffix stagger">' +
            escapeHtml(slide.playsLabel || "plays") +
            "</p>"
          : "")
      );
    }

    if (slide.type === "lifestyle") {
      return (
        shapes +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<h2 class="story-title stagger">' +
        escapeHtml(slide.title) +
        "</h2>" +
        (slide.coffee
          ? '<p class="story-sub stagger">Coffee / drinks: ' +
            escapeHtml(slide.coffee) +
            "</p>"
          : "") +
        (slide.environment
          ? '<p class="story-sub stagger">Environment: ' +
            escapeHtml(slide.environment) +
            "</p>"
          : "") +
        (slide.habits && slide.habits.length
          ? '<p class="story-sub stagger">' +
            escapeHtml(slide.habits.join(" · ")) +
            "</p>"
          : "") +
        '<p class="story-footnote stagger">' +
        escapeHtml(slide.footnote || "") +
        "</p>"
      );
    }

    if (slide.type === "final") {
      return (
        shapes +
        '<p class="story-kicker stagger">' +
        escapeHtml(slide.kicker) +
        "</p>" +
        '<h2 class="story-title stagger">' +
        escapeHtml(slide.title) +
        "</h2>" +
        '<p class="story-sub stagger">' +
        escapeHtml(slide.subtitle) +
        "</p>" +
        '<div class="story-pills stagger">' +
        (slide.pills || [])
          .map(function (p) {
            return (
              '<span class="story-pill"><small>' +
              escapeHtml(p.label) +
              "</small><strong>" +
              escapeHtml(p.value) +
              "</strong></span>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="story-final-actions">' +
        '<button type="button" class="btn btn--primary" data-share-wrapped>Share my Wrapped</button>' +
        '<button type="button" class="btn btn--secondary" data-download-wrapped>Download image</button>' +
        '<button type="button" class="btn btn--secondary" data-print-wrapped>Print / Save as PDF</button>' +
        '<button type="button" class="btn btn--secondary" data-replay-wrapped>Replay</button>' +
        '<a class="btn btn--secondary" id="story-wa-link" target="_blank" rel="noopener noreferrer">Share text on WhatsApp</a>' +
        '<button type="button" class="btn btn--secondary" data-copy-wrapped>Copy share text</button>' +
        '<p class="story-footnote">On mobile, pick WhatsApp then Status. On desktop, download the image and upload it.</p>' +
        "</div>"
      );
    }

    return shapes + '<p class="story-title">Slide</p>';
  }

  function animateCardEnter(card) {
    if (!card.animate) {
      runCountUps(card);
      return;
    }
    card.animate(
      [
        { transform: "scale(0.9) translateY(40px)", opacity: 0.85 },
        { transform: "scale(1) translateY(0)", opacity: 1 },
      ],
      { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
    );
    card.querySelectorAll(".stagger").forEach(function (el, i) {
      el.animate(
        [
          { opacity: 0, transform: "translateY(16px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 420,
          delay: 80 + i * 70,
          easing: "ease-out",
          fill: "both",
        }
      );
    });
    runCountUps(card);
  }

  function runCountUps(card) {
    card.querySelectorAll("[data-count]").forEach(function (el) {
      var target = Number(el.getAttribute("data-count"));
      if (!Number.isFinite(target)) {
        el.textContent = el.getAttribute("data-count");
        return;
      }
      if (story.reducedMotion) {
        el.textContent = formatCount(target);
        return;
      }
      var start = performance.now();
      var duration = 900;
      function frame(now) {
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = formatCount(target * eased);
        if (t < 1) requestAnimationFrame(frame);
        else el.textContent = formatCount(target);
      }
      requestAnimationFrame(frame);
    });
  }

  function formatCount(n) {
    if (Math.abs(n) >= 100) return String(Math.round(n));
    return String(Math.round(n * 10) / 10);
  }

  function goStory(dir) {
    if (story.locked || !story.slides.length) return;
    var next = story.index + dir;
    if (next < 0 || next >= story.slides.length) return;

    var stack = document.getElementById("story-stack");
    if (!stack) return;
    var current = stack.querySelector(
      '.story-card[data-story-index="' + story.index + '"]'
    );
    var incoming = stack.querySelector('.story-card[data-story-index="' + next + '"]');
    if (!current || !incoming) return;

    story.locked = true;
    stopStoryAuto();

    incoming.style.visibility = "visible";
    incoming.style.zIndex = "2";
    current.style.zIndex = "3";

    var forward = dir > 0;
    var reduce = story.reducedMotion || !current.animate;
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      if (current.getAnimations) {
        current.getAnimations().forEach(function (a) {
          a.cancel();
        });
      }
      if (incoming.getAnimations) {
        incoming.getAnimations().forEach(function (a) {
          a.cancel();
        });
      }
      current.style.visibility = "hidden";
      current.style.transform = "";
      current.style.opacity = "";
      incoming.style.transform = "";
      incoming.style.opacity = "";
      incoming.style.zIndex = "3";
      story.index = next;
      story.locked = false;
      mountStoryProgressOnly();
      runCountUps(incoming);
      bindFinalActions(incoming);
      bindStoryTilt(incoming);
      scheduleStoryAuto();
    }

    if (reduce) {
      finish();
      return;
    }

    if (forward) {
      current.animate(
        [
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
          { transform: "translate(-22%, 120%) rotate(-24deg)", opacity: 0.2 },
        ],
        { duration: STORY_TRANSITION_LOCK_MS, easing: "cubic-bezier(.55,.1,.45,1)", fill: "forwards" }
      );
      incoming.animate(
        [
          { transform: "scale(0.9) translateY(40px)", opacity: 0.7 },
          { transform: "scale(1) translateY(0)", opacity: 1 },
        ],
        { duration: STORY_TRANSITION_LOCK_MS, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
      ).onfinish = finish;
    } else {
      // Going back: previous card returns along the fall path
      incoming.style.transform = "translate(-22%, 120%) rotate(-24deg)";
      incoming.style.opacity = "0.2";
      incoming.animate(
        [
          { transform: "translate(-22%, 120%) rotate(-24deg)", opacity: 0.2 },
          { transform: "translate(0,0) rotate(0)", opacity: 1 },
        ],
        { duration: STORY_TRANSITION_LOCK_MS, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
      );
      current.animate(
        [
          { transform: "scale(1) translateY(0)", opacity: 1 },
          { transform: "scale(0.9) translateY(40px)", opacity: 0.5 },
        ],
        { duration: STORY_TRANSITION_LOCK_MS, easing: "cubic-bezier(.55,.1,.45,1)", fill: "forwards" }
      ).onfinish = finish;
    }

    window.setTimeout(function () {
      if (story.locked) finish();
    }, STORY_TRANSITION_LOCK_MS + 80);
  }

  function mountStoryProgressOnly() {
    var progress = document.getElementById("story-progress");
    if (!progress) return;
    progress.innerHTML = story.slides
      .map(function (_, i) {
        var cls = "story-progress__seg";
        if (i < story.index) cls += " is-done";
        if (i === story.index) cls += " is-current";
        return '<span class="' + cls + '"><i></i></span>';
      })
      .join("");
  }

  function bindFinalActions(card) {
    if (!card) return;
    var text = Share.buildShareText(state);
    var wa = card.querySelector("#story-wa-link");
    if (wa) wa.href = Share.whatsappLink(text);

    var shareBtn = card.querySelector("[data-share-wrapped]");
    if (shareBtn) {
      shareBtn.onclick = async function () {
        showToast("Building image…");
        var blob = await Share.generateImage(state);
        var result = await Share.shareImage(blob, text);
        if (result.cancelled) return;
        if (!result.ok) showToast(result.error || "Share failed.", "error");
        else if (result.method === "download") {
          showToast("Share not available — image downloaded instead.");
        } else showToast("Share sheet opened.");
      };
    }

    var dl = card.querySelector("[data-download-wrapped]");
    if (dl) {
      dl.onclick = async function () {
        var blob = await Share.generateImage(state);
        if (!blob) {
          showToast("Could not build the image.", "error");
          return;
        }
        Share.downloadBlob(blob, "student-wrapped.png");
        showToast("Image downloaded.");
      };
    }

    var printBtn = card.querySelector("[data-print-wrapped]");
    if (printBtn) {
      printBtn.onclick = function () {
        buildPrintReport();
        window.print();
      };
    }

    var replay = card.querySelector("[data-replay-wrapped]");
    if (replay) {
      replay.onclick = function () {
        story.index = 0;
        mountStorySlides(true);
        scheduleStoryAuto();
      };
    }

    var copyBtn = card.querySelector("[data-copy-wrapped]");
    if (copyBtn) {
      copyBtn.onclick = async function () {
        var result = await Share.copyText(text);
        if (result.ok) showToast("Share text copied.");
        else showToast(result.error || "Could not copy.", "error");
      };
    }
  }

  function bindStoryTilt(card) {
    if (!card || story.reducedMotion) return;
    if (window.matchMedia("(pointer: fine)").matches === false) return;
    card.onmousemove = function (event) {
      var rect = card.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        "perspective(900px) rotateY(" + x * 8 + "deg) rotateX(" + -y * 8 + "deg)";
    };
    card.onmouseleave = function () {
      card.style.transform = "";
    };
  }

  /* ===================== Print report ===================== */

  function buildPrintReport() {
    var root = document.getElementById("print-report");
    if (!root) return;
    var avg = Academics.simpleAverage(state.academics);
    var hours =
      Math.round((StudyClock.overallTotalSeconds(state.studySessions) / 3600) * 10) / 10;
    var html = "<h1>Student Wrapped</h1>";
    html += "<p><strong>" + escapeHtml(state.profile.name || "Student") + "</strong>";
    if (state.profile.institution) html += " · " + escapeHtml(state.profile.institution);
    if (state.profile.fieldOfStudy) html += " · " + escapeHtml(state.profile.fieldOfStudy);
    if (state.profile.yearOfStudy) html += " · " + escapeHtml(state.profile.yearOfStudy);
    html += "</p>";

    html += "<h2>Academics</h2>";
    if (!state.academics.length) html += "<p>No modules.</p>";
    else {
      html += "<p>Simple average: " + escapeHtml(String(avg)) + "</p><ul>";
      state.academics.forEach(function (m) {
        html +=
          "<li>" +
          escapeHtml(m.moduleName) +
          ": " +
          escapeHtml(String(m.mark)) +
          "%</li>";
      });
      html += "</ul>";
    }

    html += "<h2>Achievements</h2>";
    if (!state.achievements.length) html += "<p>None.</p>";
    else {
      html += "<ul>";
      state.achievements.forEach(function (a) {
        html +=
          "<li><strong>" +
          escapeHtml(a.title) +
          "</strong>" +
          (a.date ? " (" + escapeHtml(a.date) + ")" : "") +
          (a.description ? " — " + escapeHtml(a.description) : "") +
          "</li>";
      });
      html += "</ul>";
    }

    html += "<h2>Study Clock</h2><p>Total: " + escapeHtml(String(hours)) + " hours</p>";
    html += "<h2>Music</h2>";
    if (state.music.topArtists && state.music.topArtists.length) {
      html += "<p>From music search</p><ul>";
      state.music.topArtists.forEach(function (a) {
        html += "<li>" + escapeHtml(a.name) + "</li>";
      });
      html += "</ul>";
    } else if (state.music.favouriteArtists.length) {
      html += "<p>Entered by you</p><ul>";
      state.music.favouriteArtists.forEach(function (a) {
        html += "<li>" + escapeHtml(a) + "</li>";
      });
      html += "</ul>";
    } else html += "<p>No music data.</p>";

    html += "<h2>Lifestyle</h2>";
    html +=
      "<p>Coffee: " +
      escapeHtml(state.lifestyle.coffeeConsumption || "—") +
      "<br>Environment: " +
      escapeHtml(state.lifestyle.studyEnvironment || "—") +
      "<br>Habits: " +
      escapeHtml((state.lifestyle.studyHabits || []).join(", ") || "—") +
      "</p>";
    html +=
      "<p class=\"print-privacy\">Your data stays in this browser. It is not synced across devices. Clearing browser data removes it.</p>";
    root.innerHTML = html;
  }

  /* ===================== Settings ===================== */

  function onExport() {
    Storage.exportJson(state);
    showToast("Export downloaded.");
  }

  function onClear() {
    if (!window.confirm("Clear all Student Wrapped data on this device?")) return;
    var result = Storage.clear();
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    state = createEmptyStudentData();
    stopClockTick();
    stopStoryAuto();
    refreshAll();
    showToast("All data cleared.");
  }

  function onSample() {
    if (
      !window.confirm(
        "Load sample demo data? This replaces what is currently saved. Everything is labelled Sample."
      )
    ) {
      return;
    }
    state = Storage.createSampleData();
    persist();
    refreshAll();
    showToast("Sample data loaded.");
  }

  function refreshAll() {
    renderDashboard();
    fillProfileForm();
    renderAcademics();
    renderAchievements();
    fillLifestyleForm();
    renderMusic();
    renderStudyClock();
    if (currentView === "wrapped") renderWrapped();
  }

  /* ===================== Events ===================== */

  document.addEventListener("click", function (event) {
    var playBtn = event.target.closest("[data-play-track]");
    if (playBtn) {
      playSearchTrack(Number(playBtn.getAttribute("data-play-track")));
      return;
    }

    var removeSaved = event.target.closest("[data-remove-saved]");
    if (removeSaved) {
      var ri = Number(removeSaved.getAttribute("data-remove-saved"));
      state.music.topTracks.splice(ri, 1);
      rebuildTopArtistsFromTracks();
      persist();
      renderSavedTracks();
      renderDashboard();
      showToast("Removed from Wrapped list.");
      return;
    }

    var target = event.target.closest(
      "[data-view], [data-action], [data-go], [data-edit-module], [data-delete-module], [data-edit-achievement], [data-delete-achievement], [data-habit]"
    );
    if (!target) return;

    if (target.hasAttribute("data-go")) {
      showView(target.getAttribute("data-go"));
      return;
    }

    var action = target.getAttribute("data-action");
    if (action === "open-more") {
      openMoreSheet();
      return;
    }
    if (action === "close-more") {
      closeMoreSheet();
      return;
    }

    if (target.hasAttribute("data-view")) {
      showView(target.getAttribute("data-view"));
      return;
    }

    if (target.hasAttribute("data-edit-module")) {
      var mid = target.getAttribute("data-edit-module");
      var mod = state.academics.find(function (m) {
        return m.id === mid;
      });
      if (!mod) return;
      document.getElementById("module-edit-id").value = mod.id;
      document.getElementById("module-name").value = mod.moduleName;
      document.getElementById("module-mark").value = mod.mark;
      document.querySelector("[data-module-submit]").textContent = "Save changes";
      document.getElementById("module-cancel-edit").hidden = false;
      return;
    }

    if (target.hasAttribute("data-delete-module")) {
      var delId = target.getAttribute("data-delete-module");
      if (!window.confirm("Delete this module?")) return;
      state.academics = state.academics.filter(function (m) {
        return m.id !== delId;
      });
      persist();
      renderAcademics();
      renderDashboard();
      populateClockModules();
      showToast("Module deleted.");
      return;
    }

    if (target.hasAttribute("data-edit-achievement")) {
      var aid = target.getAttribute("data-edit-achievement");
      var ach = state.achievements.find(function (a) {
        return a.id === aid;
      });
      if (!ach) return;
      document.getElementById("achievement-edit-id").value = ach.id;
      document.getElementById("achievement-title").value = ach.title;
      document.getElementById("achievement-description").value = ach.description || "";
      document.getElementById("achievement-date").value = ach.date || "";
      document.querySelector("[data-achievement-submit]").textContent = "Save changes";
      document.getElementById("achievement-cancel-edit").hidden = false;
      return;
    }

    if (target.hasAttribute("data-delete-achievement")) {
      var adel = target.getAttribute("data-delete-achievement");
      if (!window.confirm("Delete this achievement?")) return;
      state.achievements = state.achievements.filter(function (a) {
        return a.id !== adel;
      });
      persist();
      renderAchievements();
      renderDashboard();
      showToast("Achievement deleted.");
      return;
    }

    if (target.hasAttribute("data-habit")) {
      target.classList.toggle("is-selected");
      target.setAttribute("aria-pressed", target.classList.contains("is-selected"));
      return;
    }

  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && moreSheet && !moreSheet.hidden) {
      closeMoreSheet();
    }
    if (currentView === "wrapped" && !document.getElementById("wrapped-player").hidden) {
      if (event.key === "ArrowRight") goStory(1);
      if (event.key === "ArrowLeft") goStory(-1);
    }
  });

  // Forms
  document.getElementById("form-profile").addEventListener("submit", onProfileSubmit);
  document.getElementById("form-module").addEventListener("submit", onModuleSubmit);
  document.getElementById("module-cancel-edit").addEventListener("click", resetModuleForm);
  document.getElementById("form-achievement").addEventListener("submit", onAchievementSubmit);
  document
    .getElementById("achievement-cancel-edit")
    .addEventListener("click", resetAchievementForm);
  document.getElementById("form-lifestyle").addEventListener("submit", onLifestyleSubmit);

  document.getElementById("form-music-search").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = document.getElementById("music-search").value;
    var status = document.getElementById("music-search-status");
    if (status) status.textContent = "Searching…";
    Music.searchTracks(q)
      .then(function (tracks) {
        if (status) {
          status.textContent = tracks.length
            ? tracks.length + " previews found"
            : "No previews found";
        }
        renderSearchResults(tracks);
      })
      .catch(function (err) {
        if (status) status.textContent = "";
        showToast(err.message || "Search failed.", "error");
      });
  });
  // Study clock buttons
  document.getElementById("clock-module-select").addEventListener("change", toggleNewModuleField);
  document.getElementById("clock-target").addEventListener("input", function () {
    if (!state.activeSession) updateClockDisplay();
  });
  document.getElementById("clock-start").addEventListener("click", onClockStart);
  document.getElementById("clock-pause").addEventListener("click", onClockPause);
  document.getElementById("clock-resume").addEventListener("click", onClockResume);
  document.getElementById("clock-cancel").addEventListener("click", onClockCancel);
  document.getElementById("clock-complete").addEventListener("click", onClockComplete);

  // Settings
  document.getElementById("btn-export").addEventListener("click", onExport);
  document.getElementById("btn-clear").addEventListener("click", onClear);
  document.getElementById("btn-sample").addEventListener("click", onSample);

  // Story controls
  document.getElementById("story-next").addEventListener("click", function () {
    goStory(1);
  });
  document.getElementById("story-back").addEventListener("click", function () {
    goStory(-1);
  });
  document.getElementById("story-tap-next").addEventListener("click", function () {
    goStory(1);
  });
  document.getElementById("story-tap-back").addEventListener("click", function () {
    goStory(-1);
  });

  var phone = document.getElementById("wrapped-root");
  phone.addEventListener(
    "touchstart",
    function (e) {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      story.touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  phone.addEventListener(
    "touchend",
    function (e) {
      if (story.touchStartX == null || !e.changedTouches || !e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - story.touchStartX;
      story.touchStartX = null;
      if (Math.abs(dx) < 40) return;
      if (dx < 0) goStory(1);
      else goStory(-1);
    },
    { passive: true }
  );

  // Dashboard cards keyboard
  document.querySelectorAll(".dash-card[data-go]").forEach(function (card) {
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showView(card.getAttribute("data-go"));
      }
    });
  });

  /* ===================== Boot ===================== */

  window.StudentWrappedApp = {
    showView: showView,
    showToast: showToast,
    getState: function () {
      return state;
    },
  };

  // Resume active study session after refresh
  if (state.activeSession) {
    showToast(
      state.activeSession.status === "paused"
        ? "Study session restored (paused)."
        : "Study session restored — still running."
    );
  }

  showView("dashboard");
  renderStudyClock();
  renderMusic();
})();
