/**
 * wrapped.js — build story slides from real studentData only
 * Never invents marks, listening history or stats. Skips empty sections.
 */

const Wrapped = {
  /**
   * @param {object} studentData
   * @returns {{ slides: object[], empty: boolean, suggestions: object[] }}
   */
  buildSlides: function (studentData) {
    const data = studentData || createEmptyStudentData();
    const slides = [];
    const themes = STORY_THEMES;
    var themeIndex = 0;

    function nextTheme() {
      const t = themes[themeIndex % themes.length];
      themeIndex += 1;
      return t;
    }

    const name = (data.profile && data.profile.name) || "";
    const modules = data.academics || [];
    const achievements = data.achievements || [];
    const sessions = data.studySessions || [];
    const music = data.music || {};
    const lifestyle = data.lifestyle || {};

    const avg = Academics.simpleAverage(modules);
    const best = Academics.bestModule(modules);
    const compare = Academics.halfComparison(modules);
    const studyTotal = StudyClock.overallTotalSeconds(sessions);
    const mostStudied = StudyClock.mostStudiedModule(sessions);

    const savedArtists = music.topArtists || [];
    const savedTracks = music.topTracks || [];
    const manualArtists = music.favouriteArtists || [];
    const manualSongs = music.favouriteSongs || [];
    const hasSavedMusic = savedArtists.length > 0 || savedTracks.length > 0;
    const hasManualMusic = manualArtists.length > 0 || manualSongs.length > 0;
    const hasMusic = hasSavedMusic || hasManualMusic;

    const hasLifestyle = Boolean(
      lifestyle.coffeeConsumption ||
        lifestyle.studyEnvironment ||
        (lifestyle.studyHabits && lifestyle.studyHabits.length)
    );

    const hasAnything =
      Boolean(name) ||
      modules.length > 0 ||
      achievements.length > 0 ||
      sessions.length > 0 ||
      hasMusic ||
      hasLifestyle;

    if (!hasAnything) {
      return {
        slides: [],
        empty: true,
        suggestions: [
          { view: "profile", label: "Add your profile" },
          { view: "academics", label: "Add a module mark" },
          { view: "study-clock", label: "Log study time" },
          { view: "music", label: "Add music" },
        ],
      };
    }

    function withPhoto(slide, photoKey) {
      if (typeof WRAPPED_PHOTOS !== "undefined" && WRAPPED_PHOTOS[photoKey]) {
        slide.photo = WRAPPED_PHOTOS[photoKey];
      }
      return slide;
    }

    // Intro
    slides.push({
      type: "intro",
      theme: nextTheme(),
      title: name ? name + "'s Wrapped" : "Your Student Wrapped",
      subtitle: name
        ? "A year built from what you actually entered."
        : "Add your name in Profile to personalise this.",
      kicker: "Student Wrapped",
    });

    // Modules + average
    if (modules.length > 0 && avg != null) {
      slides.push({
        type: "stat",
        theme: nextTheme(),
        kicker: "Academics",
        label: "Simple average",
        value: avg,
        suffix: "",
        detail: modules.length + (modules.length === 1 ? " module" : " modules"),
        footnote: "Not an official weighted average.",
      });
    }

    // Top module
    if (best) {
      slides.push({
        type: "highlight",
        theme: nextTheme(),
        kicker: "Strongest module",
        title: best.moduleName,
        value: best.mark,
        suffix: "%",
        detail: "Your highest entered mark.",
      });
    }

    // Early vs later modules (only if enough data)
    if (compare) {
      slides.push({
        type: "compare",
        theme: nextTheme(),
        kicker: "Module stretch",
        title: "Early list vs later list",
        leftLabel: "First " + compare.earlyCount,
        leftValue: compare.earlyAverage,
        rightLabel: "Later " + compare.laterCount,
        rightValue: compare.laterAverage,
        detail: "Simple averages by the order you added modules.",
      });
    }

    // Achievements
    if (achievements.length > 0) {
      const top = achievements.slice(0, 3);
      slides.push({
        type: "achievements",
        theme: nextTheme(),
        kicker: "Wins",
        title:
          achievements.length === 1
            ? "1 achievement locked in"
            : achievements.length + " achievements locked in",
        items: top.map(function (a) {
          return a.title;
        }),
      });
    }

    // Study clock
    if (sessions.length > 0 && studyTotal > 0) {
      const hours = Math.round((studyTotal / 3600) * 10) / 10;
      slides.push({
        type: "study",
        theme: nextTheme(),
        kicker: "Study Clock",
        label: "Hours studied",
        value: hours,
        suffix: "h",
        detail: mostStudied
          ? "Most time: " + mostStudied.moduleName
          : sessions.length + " saved sessions",
      });
    }

    // Music
    if (hasMusic) {
      const fromSearch = savedTracks.length > 0 || savedArtists.length > 0;
      const topArtist = fromSearch
        ? savedArtists[0] || (savedTracks[0] && { name: savedTracks[0].artist })
        : manualArtists[0]
          ? { name: manualArtists[0], source: "manual" }
          : null;
      const topTrack = fromSearch
        ? savedTracks[0]
        : manualSongs[0]
          ? { name: manualSongs[0], artist: "", source: "manual" }
          : null;
      const playCount =
        topTrack && topTrack.playCount != null && topTrack.playCount > 0
          ? topTrack.playCount
          : null;

      slides.push(
        withPhoto(
          {
            type: "music",
            theme: nextTheme(),
            kicker: fromSearch ? "Most played" : "Entered by you",
            title: "Your sound",
            artist: topArtist ? topArtist.name : null,
            track: topTrack
              ? topTrack.artist
                ? topTrack.name + " — " + topTrack.artist
                : topTrack.name
              : null,
            scrobbles: playCount,
            playsLabel: "plays",
            artworkUrl:
              (topTrack && topTrack.imageUrl) || (topArtist && topArtist.imageUrl) || null,
            artworkTerm: topTrack
              ? (topTrack.artist ? topTrack.artist + " " : "") + topTrack.name
              : topArtist
                ? topArtist.name
                : "",
          },
          "music"
        )
      );
    }

    // Lifestyle
    if (hasLifestyle) {
      slides.push(
        withPhoto(
          {
            type: "lifestyle",
            theme: nextTheme(),
            kicker: "Lifestyle",
            title: "How you study",
            coffee: lifestyle.coffeeConsumption || null,
            environment: lifestyle.studyEnvironment || null,
            habits: lifestyle.studyHabits || [],
            footnote: "You entered this — nothing is tracked automatically.",
          },
          "lifestyle"
        )
      );
    }

    // Final summary pills from real stats only
    const pills = [];
    if (avg != null) pills.push({ label: "Avg", value: String(avg) });
    if (studyTotal > 0) {
      pills.push({
        label: "Study",
        value: (Math.round((studyTotal / 3600) * 10) / 10) + "h",
      });
    }
    if (achievements.length) {
      pills.push({ label: "Wins", value: String(achievements.length) });
    }
    if (hasMusic) {
      const label = savedTracks[0]
        ? savedTracks[0].name
        : savedArtists[0]
          ? savedArtists[0].name
          : manualArtists[0] || manualSongs[0] || "Music";
      pills.push({ label: "Sound", value: label });
    }
    while (pills.length > 3) pills.pop();
    if (pills.length < 3 && modules.length) {
      pills.push({ label: "Modules", value: String(modules.length) });
    }

    slides.push(
      withPhoto(
        {
          type: "final",
          theme: nextTheme(),
          kicker: "That's a wrap",
          title: name ? "You showed up, " + name.split(" ")[0] + "." : "You showed up.",
          subtitle: "Share the highlights you earned — nothing invented.",
          pills: pills.slice(0, 3),
        },
        "final"
      )
    );

    return { slides: slides, empty: false, suggestions: [] };
  },
};
