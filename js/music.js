/**
 * music.js — simple free music search + 30s preview player
 * Uses Apple's iTunes Search API (no key, no login).
 * YouTube Music has no simple free public player API for this use case.
 */

const Music = {
  /**
   * Provider-shaped helper (manual favourites or itunes search results).
   * @param {"manual"|"itunes"} provider
   */
  getTopArtists: async function (provider, options) {
    options = options || {};
    if (provider === "manual" || provider === "itunes") {
      return (options.favourites || []).map(function (name, i) {
        return {
          name: name,
          playcount: null,
          rank: i + 1,
          source: provider,
          imageUrl: null,
        };
      });
    }
    throw new Error("Unknown music provider: " + provider);
  },

  getTopTracks: async function (provider, options) {
    options = options || {};
    if (provider === "manual" || provider === "itunes") {
      return (options.favourites || []).map(function (name, i) {
        return {
          name: name,
          artist: "",
          playcount: null,
          rank: i + 1,
          source: provider,
          imageUrl: null,
        };
      });
    }
    throw new Error("Unknown music provider: " + provider);
  },

  /**
   * Search songs via iTunes Search API.
   * @returns {Promise<Array<{id,name,artist,album,imageUrl,previewUrl,trackViewUrl}>>}
   */
  searchTracks: async function (query) {
    var q = String(query || "").trim();
    if (!q) throw new Error("Type a song or artist to search.");

    var url =
      "https://itunes.apple.com/search?term=" +
      encodeURIComponent(q) +
      "&entity=song&limit=12";

    var res;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new Error("Network error — check your connection and try again.");
    }
    if (!res.ok) throw new Error("Music search failed (" + res.status + ").");

    var data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error("Unexpected search response.");
    }

    var results = data.results || [];
    return results
      .filter(function (t) {
        return t.trackName && t.previewUrl;
      })
      .map(function (t) {
        var art = t.artworkUrl100 || "";
        return {
          id: String(t.trackId),
          name: t.trackName,
          artist: t.artistName || "",
          album: t.collectionName || "",
          imageUrl: art ? art.replace("100x100", "600x600") : null,
          previewUrl: t.previewUrl,
          trackViewUrl: t.trackViewUrl || "",
          source: "itunes",
        };
      });
  },

  /** One-off artwork lookup (also used by Wrapped slides). */
  lookupArtwork: async function (term) {
    var q = String(term || "").trim();
    if (!q) return null;
    try {
      var tracks = await Music.searchTracks(q);
      return tracks[0] && tracks[0].imageUrl ? tracks[0].imageUrl : null;
    } catch (err) {
      return null;
    }
  },

  initials: function (name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },
};
