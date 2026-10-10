/**
 * share.js — 1080×1920 canvas image + share / download / WhatsApp helpers
 * Share only runs on the student's action.
 */

const Share = {
  /** Build a short share text from real stats only. */
  buildShareText: function (studentData) {
    const data = studentData || createEmptyStudentData();
    const name = (data.profile && data.profile.name) || "Student";
    const avg = Academics.simpleAverage(data.academics || []);
    const hours =
      Math.round((StudyClock.overallTotalSeconds(data.studySessions || []) / 3600) * 10) / 10;
    const wins = (data.achievements || []).length;
    const parts = [name + "'s Student Wrapped"];
    if (avg != null) parts.push("Simple average: " + avg);
    if (hours > 0) parts.push("Study time: " + hours + "h");
    if (wins > 0) parts.push("Achievements: " + wins);
    const music = data.music || {};
    if (music.topTracks && music.topTracks[0]) {
      parts.push(
        "Track: " +
          music.topTracks[0].name +
          (music.topTracks[0].artist ? " — " + music.topTracks[0].artist : "")
      );
    } else if (music.favouriteArtists && music.favouriteArtists[0]) {
      parts.push("Favourite artist: " + music.favouriteArtists[0] + " (entered by you)");
    }
    parts.push("Made with Student Wrapped");
    return parts.join(" · ");
  },

  whatsappLink: function (text) {
    return "https://wa.me/?text=" + encodeURIComponent(text);
  },

  /**
   * Generate a 1080×1920 PNG blob.
   * @returns {Promise<Blob|null>}
   */
  generateImage: async function (studentData) {
    const data = studentData || createEmptyStudentData();
    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch (fontErr) {
      /* continue without waiting */
    }

    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#3b1cff");
    grad.addColorStop(0.55, "#141424");
    grad.addColorStop(1, "#ff3d9a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft orbs
    Share._orb(ctx, 200, 280, 320, "rgba(255, 225, 77, 0.22)");
    Share._orb(ctx, 900, 500, 260, "rgba(94, 234, 212, 0.18)");
    Share._orb(ctx, 300, 1500, 380, "rgba(255, 61, 154, 0.25)");

    const name = (data.profile && data.profile.name) || "Student";
    const avg = Academics.simpleAverage(data.academics || []);
    const modules = (data.academics || []).length;
    const hours =
      Math.round((StudyClock.overallTotalSeconds(data.studySessions || []) / 3600) * 10) / 10;
    const wins = (data.achievements || []).length;

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "500 36px Bricolage Grotesque, system-ui, sans-serif";
    ctx.fillText("STUDENT WRAPPED", 80, 160);

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 92px Bricolage Grotesque, system-ui, sans-serif";
    Share._wrapText(ctx, name, 80, 280, W - 160, 100);

    // Headline stats
    const stats = [];
    if (avg != null) stats.push({ label: "Simple average", value: String(avg) });
    if (modules) stats.push({ label: "Modules", value: String(modules) });
    if (hours > 0) stats.push({ label: "Study hours", value: String(hours) });
    if (wins) stats.push({ label: "Achievements", value: String(wins) });

    var y = 520;
    stats.slice(0, 4).forEach(function (stat) {
      ctx.fillStyle = "#ffe14d";
      ctx.font = "800 110px Bricolage Grotesque, system-ui, sans-serif";
      ctx.fillText(stat.value, 80, y);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "500 34px Bricolage Grotesque, system-ui, sans-serif";
      ctx.fillText(stat.label, 80, y + 50);
      y += 170;
    });

    // Music line
    const music = data.music || {};
    var musicLine = "";
    var artUrl = null;
    if (music.topArtists && music.topArtists[0]) {
      musicLine = "Top artist · " + music.topArtists[0].name;
      artUrl = music.topArtists[0].imageUrl || null;
    } else if (music.topTracks && music.topTracks[0]) {
      const t = music.topTracks[0];
      musicLine = "Top track · " + t.name + (t.artist ? " — " + t.artist : "");
      artUrl = t.imageUrl || null;
    } else if (music.favouriteArtists && music.favouriteArtists[0]) {
      musicLine = "Favourite · " + music.favouriteArtists[0] + " (entered by you)";
    }

    if (musicLine) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 40px Bricolage Grotesque, system-ui, sans-serif";
      Share._wrapText(ctx, musicLine, 80, Math.min(y + 40, 1480), W - 160, 48);
    }

    // Try artwork (skip if it would taint the canvas)
    if (artUrl) {
      try {
        const img = await Share._loadImage(artUrl);
        if (img) {
          const size = 180;
          const ix = W - 80 - size;
          const iy = 200;
          ctx.save();
          Share._roundRect(ctx, ix, iy, size, size, 28);
          ctx.clip();
          ctx.drawImage(img, ix, iy, size, size);
          ctx.restore();
        }
      } catch (artErr) {
        /* skip artwork */
      }
    }

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "500 28px Bricolage Grotesque, system-ui, sans-serif";
    ctx.fillText("Student Wrapped · your data stays in your browser", 80, H - 100);

    return await new Promise(function (resolve) {
      canvas.toBlob(
        function (blob) {
          resolve(blob);
        },
        "image/png",
        0.95
      );
    });
  },

  /**
   * Share image via Web Share API when available; otherwise download.
   */
  shareImage: async function (blob, text) {
    if (!blob) {
      return { ok: false, error: "Could not build the share image." };
    }
    const file = new File([blob], "student-wrapped.png", { type: "image/png" });
    const shareData = {
      files: [file],
      title: "Student Wrapped",
      text: text || "My Student Wrapped",
    };

    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData);
        return { ok: true, method: "share" };
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        return { ok: false, error: "Share cancelled.", cancelled: true };
      }
      /* fall through to download */
    }

    Share.downloadBlob(blob, "student-wrapped.png");
    return { ok: true, method: "download" };
  },

  downloadBlob: function (blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "student-wrapped.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  copyText: async function (text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return { ok: true };
      }
    } catch (err) {
      /* fall through */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok ? { ok: true } : { ok: false, error: "Clipboard not available." };
    } catch (err2) {
      return { ok: false, error: "Clipboard not available." };
    }
  },

  _orb: function (ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  },

  _wrapText: function (ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    var line = "";
    var yy = y;
    words.forEach(function (word) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, yy);
  },

  _roundRect: function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  _loadImage: function (url) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = url;
    });
  },
};
