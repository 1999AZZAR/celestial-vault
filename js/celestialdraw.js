/**
 * CelestialDraw: Archival Astrometry & Procedural Planisphere Synthesis Engine
 * Version: 1.0.0
 * Design System: Swiss-Archival Standard
 * Author: Azzar Budiyanto
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CelestialDraw = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // --- 1. Deterministic Cryptographic & Hashing Utilities ---
  function fnv1a(str) {
    var FNV_PRIME = 0x01000193;
    var hash = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, FNV_PRIME);
    }
    return hash >>> 0;
  }

  function Mulberry32(seed) {
    return function () {
      var t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Base32 crockford-esque
  function encodeBase32(val, len) {
    var res = "";
    val = val >>> 0;
    for (var i = 0; i < len; i++) {
      res = ALPHABET[val % 32] + res;
      val = Math.floor(val / 32);
    }
    return res;
  }

  function decodeBase32(str) {
    var val = 0;
    for (var i = 0; i < str.length; i++) {
      var idx = ALPHABET.indexOf(str[i].toUpperCase());
      if (idx === -1) idx = 0;
      val = val * 32 + idx;
    }
    return val >>> 0;
  }

  function generateSequenceIdentifier(hashVal) {
    var prefix = "CSV";
    var high = (hashVal >>> 16) & 0xFFFF;
    var low = hashVal & 0xFFFF;
    var p1 = encodeBase32(high, 2);
    var p2 = encodeBase32(low, 6);
    return prefix + "-" + p1 + "-" + p2;
  }

  function recoverHashFromId(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    var parts = identifier.trim().toUpperCase().split('-');
    if (parts.length === 3 && parts[0] === 'CSV') {
      var high = decodeBase32(parts[1]);
      var low = decodeBase32(parts[2]);
      return ((high << 16) | low) >>> 0;
    }
    return null;
  }

  // --- 2. Latin Binomial Constellation Nomenclature ---
  var ASTRONOMICAL_PREFIXES = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
    "Corona", "Draco", "Cygnus", "Lyra", "Orion", "Centaurus", "Ursa",
    "Cassiopeia", "Pegasus", "Aquila", "Andromeda", "Perseus", "Hydra",
    "Phoenix", "Serpens", "Lupus", "Auriga", "Monoceros", "Vulpecula",
    "Sagitta", "Boötes", "Taurus", "Triangulum", "Pavo", "Vela", "Carina"
  ];

  var ASTRONOMICAL_EPITHETS = [
    "Borealis", "Australis", "Stellata", "Occidentalis", "Orientalis",
    "Nebularis", "Precessionalis", "Armillaris", "Ethereus", "Spiralis",
    "Polaris", "Zodiacalis", "Nocturna", "Achromatica", "Caelestis",
    "Harmonica", "Astrolabica", "Meridiana", "Ecliptica", "Geometrica",
    "Solstitialis", "Cosmica", "Sideralis", "Astrometrica", "Magnifica"
  ];

  function deriveConstellationName(hashVal) {
    var pIdx = (hashVal >>> 7) % ASTRONOMICAL_PREFIXES.length;
    var eIdx = (hashVal >>> 13) % ASTRONOMICAL_EPITHETS.length;
    return ASTRONOMICAL_PREFIXES[pIdx] + " " + ASTRONOMICAL_EPITHETS[eIdx];
  }

  // --- 3. Compact Hershey Simplex Vector Font Engine ---
  var HERSHEY_RAW = {
    ' ': " 1 -9  9",
    '.': " 6 -2  2 R  1  9 R  2  8 R  2  9 R  1 10 R  0  9 R  1  8",
    ',': " 8 -2  2 R  1  9 R  2  8 R  2  9 R  1 10 R  0  9 R  1  8 R  1 10 R  0 12",
    '-': " 3 -3  3 R -3  3 R  3  3",
    '(': " 7 -4  1 R  0 -8 R -2 -4 R -2  0 R -2  4 R  0  8",
    ')': " 7 -1  4 R -2 -8 R  0 -4 R  0  0 R  0  4 R -2  8",
    '0': "12 -5  5 R -3 -5 R -1 -7 R  1 -7 R  3 -5 R  3  5 R  1  7 R -1  7 R -3  5 R -3 -5",
    '1': " 5 -3  3 R -1 -5 R  0 -7 R  0  7",
    '2': "10 -5  5 R -3 -5 R -1 -7 R  1 -7 R  3 -5 R  3 -3 R -3  7 R  3  7",
    '3': "13 -5  5 R -3 -7 R  3 -7 R  0 -3 R  2 -3 R  3 -1 R  3  3 R  1  7 R -2  7 R -3  5",
    '4': " 7 -5  5 R  1  7 R  1 -7 R -3  2 R  3  2",
    '5': "12 -5  5 R  2 -7 R -3 -7 R -3 -2 R  2 -2 R  3  0 R  3  4 R  1  7 R -2  7 R -3  5",
    '6': "13 -5  5 R  2 -7 R -1 -7 R -3 -3 R -3  4 R -1  7 R  1  7 R  3  4 R  3  0 R  1 -2 R -3 -2",
    '7': " 6 -5  5 R -3 -7 R  3 -7 R -1  7",
    '8': "17 -5  5 R -1 -7 R  1 -7 R  3 -5 R  3 -3 R  1 -1 R -1 -1 R -3  1 R -3  5 R -1  7 R  1  7 R  3  5 R  3  1 R  1 -1 R -1 -1 R -3 -3 R -3 -5 R -1 -7",
    '9': "13 -5  5 R  3  2 R -1  2 R -3  0 R -3 -4 R -1 -7 R  1 -7 R  3 -4 R  3  3 R  1  7 R -2  7",
    'A': " 9 -6  6 R  0 -7 R -4  7 R  0 -7 R  4  7 R -3  2 R  3  2",
    'B': "16 -5  5 R -3 -7 R -3  7 R -3 -7 R  1 -7 R  3 -5 R  3 -3 R  1 -1 R -3 -1 R  1 -1 R  3  1 R  3  5 R  1  7 R -3  7",
    'C': "11 -6  5 R  3 -5 R  1 -7 R -2 -7 R -4 -4 R -4  4 R -2  7 R  1  7 R  3  5",
    'D': "11 -5  5 R -3 -7 R -3  7 R -3 -7 R  1 -7 R  3 -5 R  3  5 R  1  7 R -3  7",
    'E': "11 -5  5 R -3 -7 R -3  7 R -3 -7 R  3 -7 R -3  0 R  1  0 R -3  7 R  3  7",
    'F': " 9 -5  5 R -3 -7 R -3  7 R -3 -7 R  3 -7 R -3  0 R  1  0",
    'G': "14 -6  5 R  3 -5 R  1 -7 R -2 -7 R -4 -4 R -4  4 R -2  7 R  1  7 R  3  5 R  3  1 R  0  1",
    'H': " 9 -6  6 R -4 -7 R -4  7 R -4  0 R  4  0 R  4 -7 R  4  7",
    'I': " 3 -1  1 R  0 -7 R  0  7",
    'J': " 8 -4  4 R  2 -7 R  2  4 R  0  7 R -2  7 R -3  5",
    'K': " 9 -5  5 R -3 -7 R -3  7 R -3  1 R  3 -7 R -1 -1 R  3  7",
    'L': " 6 -5  4 R -3 -7 R -3  7 R  3  7",
    'M': "12 -7  7 R -5  7 R -5 -7 R  0  2 R  5 -7 R  5  7",
    'N': " 9 -6  6 R -4  7 R -4 -7 R  4  7 R  4 -7",
    'O': "13 -6  6 R -2 -7 R  2 -7 R  4 -4 R  4  4 R  2  7 R -2  7 R -4  4 R -4 -4 R -2 -7",
    'P': "10 -5  5 R -3  7 R -3 -7 R  1 -7 R  3 -5 R  3 -2 R  1  0 R -3  0",
    'Q': "16 -6  6 R -2 -7 R  2 -7 R  4 -4 R  4  4 R  2  7 R -2  7 R -4  4 R -4 -4 R -2 -7 R  1  3 R  4  7",
    'R': "13 -5  5 R -3  7 R -3 -7 R  1 -7 R  3 -5 R  3 -2 R  1  0 R -3  0 R  0  0 R  3  7",
    'S': "13 -5  5 R  3 -5 R  1 -7 R -2 -7 R -3 -5 R  3  0 R  3  5 R  1  7 R -2  7 R -3  5",
    'T': " 6 -5  5 R  0 -7 R  0  7 R -4 -7 R  4 -7",
    'U': " 9 -6  6 R -4 -7 R -4  4 R -2  7 R  2  7 R  4  4 R  4 -7",
    'V': " 6 -6  6 R -4 -7 R  0  7 R  4 -7",
    'W': "12 -7  7 R -5 -7 R -3  7 R  0  0 R  3  7 R  5 -7",
    'X': " 6 -6  6 R -4 -7 R  4  7 R -4  7 R  4 -7",
    'Y': " 7 -6  6 R -4 -7 R  0 -1 R  0  7 R  0 -1 R  4 -7",
    'Z': " 8 -5  5 R -3 -7 R  3 -7 R -3  7 R  3  7",
    'a': "14 -4  4 R  3 -2 R  1 -4 R -1 -4 R -3 -2 R -3  1 R -1  3 R  1  3 R  3  1 R  3 -3 R  3  3",
    'b': "14 -4  4 R -3 -7 R -3  3 R -3  0 R -1 -4 R  1 -4 R  3 -2 R  3  1 R  1  3 R -1  3 R -3  1",
    'c': "10 -4  4 R  3 -2 R  1 -4 R -1 -4 R -3 -2 R -3  1 R -1  3 R  1  3 R  3  1",
    'd': "14 -4  4 R  3 -7 R  3  3 R  3  0 R  1 -4 R -1 -4 R -3 -2 R -3  1 R -1  3 R  1  3 R  3  1",
    'e': "13 -4  4 R -3  0 R  3  0 R  3 -2 R  1 -4 R -1 -4 R -3 -2 R -3  1 R -1  3 R  1  3 R  3  2",
    'f': " 9 -3  3 R  2 -7 R  0 -7 R -1 -5 R -1  3 R -3 -3 R  1 -3",
    'g': "18 -4  4 R  3 -2 R  1 -4 R -1 -4 R -3 -2 R -3  1 R -1  3 R  1  3 R  3  1 R  3 -3 R  3  5 R  1  7 R -2  7 R -3  5",
    'h': "10 -4  4 R -3 -7 R -3  3 R -3  0 R -1 -4 R  1 -4 R  3 -2 R  3  3",
    'i': " 7 -1  2 R  0 -4 R  0  3 R  0 -7 R  0 -6",
    'j': "10 -2  2 R  0 -4 R  0  5 R -1  7 R -2  7 R  0 -7 R  0 -6",
    'k': " 9 -4  3 R -3 -7 R -3  3 R -3  0 R  2 -4 R -1 -1 R  2  3",
    'l': " 5 -1  2 R  0 -7 R  0  2 R  1  3",
    'm': "15 -6  6 R -4 -4 R -4  3 R -4  0 R -2 -4 R  0 -4 R  1 -2 R  1  3 R  1  0 R  3 -4 R  4 -2 R  4  3",
    'n': "10 -4  4 R -3 -4 R -3  3 R -3  0 R -1 -4 R  1 -4 R  3 -2 R  3  3",
    'o': "13 -4  4 R -1 -4 R  1 -4 R  3 -2 R  3  1 R  1  3 R -1  3 R -3  1 R -3 -2 R -1 -4",
    'p': "14 -4  4 R -3 -4 R -3  7 R -3 -1 R -1 -4 R  1 -4 R  3 -2 R  3  1 R  1  3 R -1  3 R -3  1",
    'q': "14 -4  4 R  3 -4 R  3  7 R  3 -1 R  1 -4 R -1 -4 R -3 -2 R -3  1 R -1  3 R  1  3 R  3  1",
    'r': " 8 -3  3 R -2 -4 R -2  3 R -2 -1 R -1 -4 R  1 -4 R  2 -3",
    's': "12 -3  3 R  2 -3 R  0 -4 R -1 -4 R -2 -3 R  1 -1 R  2  0 R -1  3 R -2  2",
    't': " 7 -3  2 R -1 -7 R -1  2 R  1  3 R -3 -4 R  1 -4",
    'u': "10 -4  4 R -3 -4 R -3  1 R -1  3 R  1  3 R  3  1 R  3 -4 R  3  3",
    'v': " 6 -4  4 R -3 -4 R  0  3 R  3 -4",
    'w': "12 -5  5 R -4 -4 R -2  3 R  0 -1 R  2  3 R  4 -4",
    'x': " 6 -4  4 R -3 -4 R  3  3 R -3  3 R  3 -4",
    'y': "10 -4  4 R -3 -4 R -3  1 R -1  3 R  1  3 R  3  1 R  3 -4 R  3  5 R  1  7 R -2  7",
    'z': " 8 -4  4 R -2 -4 R  2 -4 R -2  3 R  2  3"
  };

  var HERSHEY_CACHE = {};
  function compileHershey(ch) {
    if (HERSHEY_CACHE[ch]) return HERSHEY_CACHE[ch];
    var raw = HERSHEY_RAW[ch] || HERSHEY_RAW[' '];
    var parts = raw.trim().split(/\s+/);
    var xmin = parseInt(parts[1], 10);
    var xmax = parseInt(parts[2], 10);
    var polylines = [];
    var curr = [];
    for (var i = 3; i < parts.length; i++) {
      if (parts[i] === 'R') {
        if (curr.length > 0) { polylines.push(curr); curr = []; }
      } else {
        var x = parseInt(parts[i], 10);
        var y = parseInt(parts[++i], 10);
        curr.push([x, y]);
      }
    }
    if (curr.length > 0) polylines.push(curr);
    var res = { xmin: xmin, xmax: xmax, polylines: polylines };
    HERSHEY_CACHE[ch] = res;
    return res;
  }

  function putHersheyText(txt) {
    var polylines = [];
    var curX = 0;
    for (var i = 0; i < txt.length; i++) {
      var glyph = compileHershey(txt[i]);
      var shiftX = curX - glyph.xmin;
      for (var p = 0; p < glyph.polylines.length; p++) {
        var line = [];
        for (var pt = 0; pt < glyph.polylines[p].length; pt++) {
          line.push([glyph.polylines[p][pt][0] + shiftX, glyph.polylines[p][pt][1]]);
        }
        polylines.push(line);
      }
      curX += (glyph.xmax - glyph.xmin) + 2;
    }
    return [curX, polylines];
  }

  function hersheyToSvgPaths(text, x, y, scale) {
    var out = putHersheyText(text);
    var width = out[0];
    var polylines = out[1];
    var pathData = [];
    for (var i = 0; i < polylines.length; i++) {
      var pts = polylines[i];
      if (pts.length < 2) continue;
      var d = "M " + (x + pts[0][0] * scale).toFixed(2) + " " + (y + pts[0][1] * scale).toFixed(2);
      for (var j = 1; j < pts.length; j++) {
        d += " L " + (x + pts[j][0] * scale).toFixed(2) + " " + (y + pts[j][1] * scale).toFixed(2);
      }
      pathData.push('<path d="' + d + '" fill="none" />');
    }
    return pathData.join("\n    ");
  }

  // --- 4. Astrometric Color Palettes (Swiss-Archival Curated) ---
  var PALETTES = {
    vellum: {
      id: "vellum",
      name: "Archival Vellum",
      paper: "#EFE9DC",
      ink: "#2A2520",
      meta: "#7A7068",
      accent: "#8B1A1A",
      grid: "#C4BCB0",
      starAlpha: "#2A2520",
      starHalo: "rgba(139, 26, 26, 0.12)"
    },
    cyanotype: {
      id: "cyanotype",
      name: "Prussian Cyanotype",
      paper: "#0D1B2A",
      ink: "#E0E1DD",
      meta: "#778DA9",
      accent: "#E29578",
      grid: "#1B263B",
      starAlpha: "#FFFFFF",
      starHalo: "rgba(226, 149, 120, 0.25)"
    },
    obsidian: {
      id: "obsidian",
      name: "Obsidian Night",
      paper: "#151413",
      ink: "#ECE6DA",
      meta: "#787169",
      accent: "#B83227",
      grid: "#2B2825",
      starAlpha: "#F5F0E6",
      starHalo: "rgba(184, 50, 39, 0.20)"
    },
    indigo: {
      id: "indigo",
      name: "Midnight Indigo",
      paper: "#111422",
      ink: "#E2E8F0",
      meta: "#64748B",
      accent: "#F43F5E",
      grid: "#1E293B",
      starAlpha: "#F8FAFC",
      starHalo: "rgba(244, 63, 94, 0.22)"
    },
    golden: {
      id: "golden",
      name: "Celestial Gold",
      paper: "#F7F2E7",
      ink: "#3D2B1F",
      meta: "#8A735E",
      accent: "#A63A24",
      grid: "#DDD2BF",
      starAlpha: "#3D2B1F",
      starHalo: "rgba(166, 58, 36, 0.15)"
    }
  };

  // --- 5. Core Procedural Astrometry Synthesizer ---
  var BAYER_GREEK = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ"];

  function synthesize(seedInput, options) {
    options = options || {};
    var rawSeed = typeof seedInput === 'string' ? seedInput.trim() : 'Archival Astrometric Synthesis';
    var hashVal = 0;

    if (rawSeed && rawSeed.indexOf('-') > -1) {
      var rec = recoverHashFromId(rawSeed);
      hashVal = rec !== null ? rec : fnv1a(rawSeed);
    } else {
      hashVal = fnv1a(rawSeed || 'Archival Celestial Map');
    }

    var rng = Mulberry32(hashVal);
    var accessionId = generateSequenceIdentifier(hashVal);
    var hexHash = (hashVal >>> 0).toString(16).toUpperCase().padStart(8, '0');
    var constellationName = deriveConstellationName(hashVal);

    // Dimensions
    var width = options.width || 600;
    var height = options.height || 600;
    var minDim = Math.min(width, height);
    var cx = width / 2;
    var cy = height / 2;
    
    // Astrometric Projection Radius
    var margin = options.margin || Math.round(minDim * 0.024);
    var borderGap = Math.max(3, Math.round(minDim * 0.007));
    var availableRadius = (minDim / 2) - margin - borderGap - Math.round(minDim * 0.075);
    var celestialRadius = Math.max(80, Math.round(availableRadius));

    // 1. Procedural Star Generation (Primary Asterism + Field Stars)
    var primaryStarCount = Math.floor(rng() * 4) + 6; // 6 to 9 primary constellation nodes
    var fieldStarCount = Math.floor(rng() * 30) + 45; // 45 to 75 ambient background stars
    var stars = [];

    // Primary Constellation Stars
    var centerBiasAngle = rng() * Math.PI * 2;
    for (var i = 0; i < primaryStarCount; i++) {
      var rNorm = Math.pow(rng(), 0.75) * 0.72; // Biased toward inner half
      var angle = centerBiasAngle + (rng() - 0.5) * 2.8 + (i / primaryStarCount) * Math.PI * 1.6;
      var dist = rNorm * celestialRadius;
      var sx = cx + Math.cos(angle) * dist;
      var sy = cy + Math.sin(angle) * dist;
      var mag = i === 0 ? (0.2 + rng() * 0.6) : (1.0 + rng() * 2.4); // i=0 is Alpha star
      stars.push({
        x: sx,
        y: sy,
        mag: mag,
        isPrimary: true,
        bayer: BAYER_GREEK[i] || "",
        id: i
      });
    }

    // Ambient Field Stars
    for (var f = 0; f < fieldStarCount; f++) {
      var fDist = Math.sqrt(rng()) * (celestialRadius * 0.96);
      var fAngle = rng() * Math.PI * 2;
      var fx = cx + Math.cos(fAngle) * fDist;
      var fy = cy + Math.sin(fAngle) * fDist;
      var fMag = 3.2 + rng() * 2.8; // Fainter magnitude (3.2 to 6.0)
      stars.push({
        x: fx,
        y: fy,
        mag: fMag,
        isPrimary: false,
        bayer: "",
        id: primaryStarCount + f
      });
    }

    // 2. Asterism Vector Connectivity (Minimum Spanning Tree / Linked Constellation Figures)
    var primaries = stars.filter(function(s) { return s.isPrimary; });
    var asterismEdges = [];
    var connected = [primaries[0]];
    var unconnected = primaries.slice(1);

    while (unconnected.length > 0) {
      var bestDist = Infinity;
      var bestUIdx = -1;
      var bestC = null;
      for (var cIdx = 0; cIdx < connected.length; cIdx++) {
        var uStar = connected[cIdx];
        for (var vIdx = 0; vIdx < unconnected.length; vIdx++) {
          var vStar = unconnected[vIdx];
          var d = Math.hypot(uStar.x - vStar.x, uStar.y - vStar.y);
          if (d < bestDist) {
            bestDist = d;
            bestUIdx = vIdx;
            bestC = uStar;
          }
        }
      }
      if (bestUIdx > -1) {
        asterismEdges.push([bestC, unconnected[bestUIdx]]);
        connected.push(unconnected[bestUIdx]);
        unconnected.splice(bestUIdx, 1);
      }
    }

    // Add 1 or 2 cross-structural bridges for closed polygon asterism loops
    if (primaries.length >= 5 && rng() > 0.3) {
      var pA = primaries[1];
      var pB = primaries[primaries.length - 1];
      asterismEdges.push([pA, pB]);
    }
    if (primaries.length >= 7 && rng() > 0.4) {
      var pC = primaries[2];
      var pD = primaries[4];
      asterismEdges.push([pC, pD]);
    }

    // 3. Ecliptic & Precessional Ring Angles
    var eclipticTilt = 23.44 * (Math.PI / 180);
    var eclipticRotation = rng() * Math.PI * 2;
    var precessionEpochYear = 1900 + Math.floor(rng() * 200);

    // 4. Astrometric Telemetry Metadata
    var alphaStar = stars[0];
    var raHours = Math.floor(rng() * 24);
    var raMin = Math.floor(rng() * 60);
    var raSec = Math.floor(rng() * 60);
    var decDeg = (rng() > 0.35 ? "+" : "-") + Math.floor(rng() * 88);
    var decMin = Math.floor(rng() * 60);

    var metrics = {
      narrative: rawSeed,
      seed: hashVal,
      accessionId: accessionId,
      hashHex: "0x" + hexHash,
      constellation: constellationName,
      epoch: "J" + precessionEpochYear + ".0",
      coordinates: raHours + "h " + raMin + "m " + raSec + "s / " + decDeg + "° " + decMin + "'",
      alphaMagnitude: alphaStar.mag.toFixed(2) + " mag",
      asterismNodes: primaries.length + " Vertices (" + asterismEdges.length + " Rays)",
      starFieldPopulation: stars.length + " Cataloged Stars",
      projection: "Stereographic Planisphere (1:60' Arc)",
      precessionRate: "+50.29\" / Century",
      celestialRadius: celestialRadius
    };

    return {
      hashVal: hashVal,
      accessionId: accessionId,
      hexHash: hexHash,
      constellation: constellationName,
      stars: stars,
      asterismEdges: asterismEdges,
      cx: cx,
      cy: cy,
      celestialRadius: celestialRadius,
      eclipticRotation: eclipticRotation,
      eclipticTilt: eclipticTilt,
      metrics: metrics
    };
  }

  // --- 6. Standalone SVG Plate Generator (Swiss-Archival Format) ---
  function generateSvgPlate(targetData, options) {
    options = options || {};
    var data = targetData;
    if (!data || !data.stars) {
      data = synthesize(options.seed || options.narrative || "Celestial Archival Specimen", options);
    }

    var width = options.width || 600;
    var height = options.height || 600;
    var minDim = Math.min(width, height);
    var margin = options.margin || Math.round(minDim * 0.024);
    var borderGap = Math.max(3, Math.round(minDim * 0.007));
    var outerLineWidth = Math.max(1.0, (minDim / 600) * 1.0);
    var innerLineWidth = Math.max(0.5, (minDim / 600) * 0.5);

    var paletteKey = options.palette || "vellum";
    var p = PALETTES[paletteKey] || PALETTES.vellum;
    var strokeColor = options.stroke || p.ink;
    var metaColor = options.metaColor || p.meta;

    var cx = data.cx || width / 2;
    var cy = data.cy || height / 2;
    var R = data.celestialRadius || Math.round(minDim * 0.38);

    // Astrometric Drafting Scale Bar (Bottom-Left: 60' Arc Rule)
    var scaleFactor = minDim / 600;
    var barW = Math.round(64 * scaleFactor);
    var barH = Math.max(3, Math.round(3.5 * scaleFactor));
    var segW = barW / 4;
    var tickH = Math.max(2, Math.round(3 * scaleFactor));
    var scaleFontSize = Math.max(7, Math.round(8.5 * scaleFactor));
    var captionFontSize = Math.max(6, Math.round(6.8 * scaleFactor));
    var scaleBarX = margin + borderGap + Math.round(minDim * 0.02);
    var scaleBarY = height - margin - borderGap - barH - captionFontSize - Math.max(4, Math.round(minDim * 0.012));

    // Archival Vermilion Seal Chop (Bottom-Right: 星 纬 典 藏)
    var sealSize = Math.max(26, Math.round(minDim * 0.062));
    var sealX = width - margin - borderGap - sealSize - Math.round(minDim * 0.02);
    var sealY = height - margin - borderGap - sealSize - Math.max(4, Math.round(minDim * 0.012));
    var sealInset = Math.max(1.5, sealSize * 0.06);
    var sealFontSize = Math.round(sealSize * 0.36);

    // Cursive Hershey Latin Constellation Title (Bottom-Center)
    var cursiveScale = Math.max(0.26, (minDim / 600) * 0.34);
    var cursiveY = height - margin - Math.max(12, Math.round(minDim * 0.025));
    var textOut = putHersheyText(data.constellation);
    var cursiveX = Math.round((width - textOut[0] * cursiveScale) / 2);
    var hersheySvgPaths = hersheyToSvgPaths(data.constellation, cursiveX, cursiveY, cursiveScale);

    // --- Build Armillary / Astrolabe Coordinate Rings ---
    var coordinateRings = [];

    // Concentric Declination Parallels (30°, 60°, 75°)
    var ring30 = (R * 0.35).toFixed(2);
    var ring60 = (R * 0.68).toFixed(2);
    var ring75 = (R * 0.88).toFixed(2);
    coordinateRings.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + ring30 + '" fill="none" stroke="' + metaColor + '" stroke-width="0.5" stroke-dasharray="1.5 3" opacity="0.65" />');
    coordinateRings.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + ring60 + '" fill="none" stroke="' + metaColor + '" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.65" />');
    coordinateRings.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + ring75 + '" fill="none" stroke="' + metaColor + '" stroke-width="0.5" stroke-dasharray="2 4" opacity="0.65" />');

    // Right Ascension Radial Meridian Spokes (every 30° / 2 Hours)
    for (var deg = 0; deg < 360; deg += 30) {
      var rad = deg * (Math.PI / 180);
      var mx1 = (cx + Math.cos(rad) * (R * 0.15)).toFixed(2);
      var my1 = (cy + Math.sin(rad) * (R * 0.15)).toFixed(2);
      var mx2 = (cx + Math.cos(rad) * R).toFixed(2);
      var my2 = (cy + Math.sin(rad) * R).toFixed(2);
      coordinateRings.push('<line x1="' + mx1 + '" y1="' + my1 + '" x2="' + mx2 + '" y2="' + my2 + '" stroke="' + metaColor + '" stroke-width="0.4" stroke-dasharray="1.5 3.5" opacity="0.5" />');
    }

    // Outer Dual Astrolabe Limbs
    var rOuter = R;
    var rInner = R - Math.max(5, Math.round(minDim * 0.016));
    coordinateRings.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + rOuter + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + (outerLineWidth * 1.1).toFixed(2) + '" />');
    coordinateRings.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + rInner + '" fill="none" stroke="' + metaColor + '" stroke-width="' + (innerLineWidth * 0.9).toFixed(2) + '" />');

    // Degree Ticks along the Astrolabe Rim
    var tickLines = [];
    var tickLabels = [];
    var rimFontSize = Math.max(6, Math.round(7.5 * scaleFactor));
    for (var d = 0; d < 360; d += 5) {
      var a = d * (Math.PI / 180);
      var isMajor = d % 30 === 0;
      var isSemi = d % 15 === 0;
      var tLen = isMajor ? (rOuter - rInner + 2) : (isSemi ? (rOuter - rInner - 1) : 2.5);
      var tStroke = isMajor ? 0.75 : 0.4;
      var x1 = (cx + Math.cos(a) * rOuter).toFixed(2);
      var y1 = (cy + Math.sin(a) * rOuter).toFixed(2);
      var x2 = (cx + Math.cos(a) * (rOuter - tLen)).toFixed(2);
      var y2 = (cy + Math.sin(a) * (rOuter - tLen)).toFixed(2);
      tickLines.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + strokeColor + '" stroke-width="' + tStroke + '" />');

      if (isMajor) {
        var numR = rOuter + Math.max(5, Math.round(8 * scaleFactor));
        var nx = (cx + Math.cos(a) * numR).toFixed(2);
        var ny = (cy + Math.sin(a) * numR + (rimFontSize * 0.32)).toFixed(2);
        tickLabels.push('<text x="' + nx + '" y="' + ny + '" font-family="\'JetBrains Mono\', monospace" font-size="' + rimFontSize + '" font-weight="600" fill="' + metaColor + '" text-anchor="middle">' + d + '°</text>');
      }
    }

    // Ecliptic Tilted Great Ellipse
    var eclipticA = (R * 0.98).toFixed(2);
    var eclipticB = (R * 0.88).toFixed(2);
    var eclipticRotDeg = ((data.eclipticRotation * 180) / Math.PI).toFixed(2);
    var eclipticPath = '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + eclipticA + '" ry="' + eclipticB + '" fill="none" stroke="' + p.accent + '" stroke-width="0.75" stroke-dasharray="3 4" transform="rotate(' + eclipticRotDeg + ' ' + cx + ' ' + cy + ')" opacity="0.65" />';

    // --- Build Constellation Asterism Rays ---
    var asterismLines = [];
    for (var e = 0; e < data.asterismEdges.length; e++) {
      var sA = data.asterismEdges[e][0];
      var sB = data.asterismEdges[e][1];
      asterismLines.push('<line x1="' + sA.x.toFixed(2) + '" y1="' + sA.y.toFixed(2) + '" x2="' + sB.x.toFixed(2) + '" y2="' + sB.y.toFixed(2) + '" stroke="' + strokeColor + '" stroke-width="' + (outerLineWidth * 0.9).toFixed(2) + '" stroke-linecap="round" opacity="0.85" />');
      asterismLines.push('<line x1="' + sA.x.toFixed(2) + '" y1="' + sA.y.toFixed(2) + '" x2="' + sB.x.toFixed(2) + '" y2="' + sB.y.toFixed(2) + '" stroke="' + p.accent + '" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.65" />');
    }

    // --- Build Star Glyphs (Discs, Halos, Diffraction Crosshairs, Bayer Labels) ---
    var starElements = [];
    var bayerFontSize = Math.max(7, Math.round(8.5 * scaleFactor));
    for (var s = 0; s < data.stars.length; s++) {
      var star = data.stars[s];
      var baseR = Math.max(0.6, (5.5 - star.mag * 0.72) * scaleFactor);

      if (star.isPrimary) {
        // Prominent Constellation Star with Astrometric Halo
        var haloR = (baseR * 2.2).toFixed(2);
        starElements.push('<circle cx="' + star.x.toFixed(2) + '" cy="' + star.y.toFixed(2) + '" r="' + haloR + '" fill="' + p.starHalo + '" />');
        
        // 4-Point Starlight Diffraction Spikes for 1st Magnitude (Alpha) Stars
        if (star.mag < 1.2) {
          var spLen = (baseR * 3.4).toFixed(2);
          starElements.push('<line x1="' + (star.x - spLen).toFixed(2) + '" y1="' + star.y.toFixed(2) + '" x2="' + (star.x + parseFloat(spLen)).toFixed(2) + '" y2="' + star.y.toFixed(2) + '" stroke="' + strokeColor + '" stroke-width="0.5" opacity="0.75" />');
          starElements.push('<line x1="' + star.x.toFixed(2) + '" y1="' + (star.y - spLen).toFixed(2) + '" x2="' + star.x.toFixed(2) + '" y2="' + (star.y + parseFloat(spLen)).toFixed(2) + '" stroke="' + strokeColor + '" stroke-width="0.5" opacity="0.75" />');
        }

        // Star Core Disc
        starElements.push('<circle cx="' + star.x.toFixed(2) + '" cy="' + star.y.toFixed(2) + '" r="' + baseR.toFixed(2) + '" fill="' + p.starAlpha + '" stroke="' + strokeColor + '" stroke-width="0.5" />');

        // Bayer Designation Annotation
        if (star.bayer) {
          var tx = (star.x + baseR + 3).toFixed(2);
          var ty = (star.y - baseR - 1).toFixed(2);
          starElements.push('<text x="' + tx + '" y="' + ty + '" font-family="\'Noto Serif SC\', serif" font-style="italic" font-size="' + bayerFontSize + '" fill="' + p.accent + '">' + star.bayer + '</text>');
        }
      } else {
        // Field Star Point
        starElements.push('<circle cx="' + star.x.toFixed(2) + '" cy="' + star.y.toFixed(2) + '" r="' + baseR.toFixed(2) + '" fill="' + strokeColor + '" opacity="' + (star.mag > 4.5 ? '0.45' : '0.75') + '" />');
      }
    }

    // Central Polar Meridian Reticle
    var centerReticle = [
      '<line x1="' + (cx - 7).toFixed(2) + '" y1="' + cy.toFixed(2) + '" x2="' + (cx + 7).toFixed(2) + '" y2="' + cy.toFixed(2) + '" stroke="' + metaColor + '" stroke-width="0.6" />',
      '<line x1="' + cx.toFixed(2) + '" y1="' + (cy - 7).toFixed(2) + '" x2="' + cx.toFixed(2) + '" y2="' + (cy + 7).toFixed(2) + '" stroke="' + metaColor + '" stroke-width="0.6" />',
      '<circle cx="' + cx.toFixed(2) + '" cy="' + cy.toFixed(2) + '" r="2" fill="none" stroke="' + metaColor + '" stroke-width="0.6" />'
    ].join('\n    ');

    var lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '">',
      '  <!-- Archival Astrometry Vellum Plate -->',
      '  <rect width="100%" height="100%" fill="' + p.paper + '" />',
      '',
      '  <!-- Archival Drafting Borders (Swiss-Archival Standard) -->',
      '  <rect x="' + margin + '" y="' + margin + '" width="' + (width - margin * 2) + '" height="' + (height - margin * 2) + '" fill="none" stroke="' + strokeColor + '" stroke-width="' + outerLineWidth.toFixed(2) + '" />',
      '  <rect x="' + (margin + borderGap) + '" y="' + (margin + borderGap) + '" width="' + (width - (margin + borderGap) * 2) + '" height="' + (height - (margin + borderGap) * 2) + '" fill="none" stroke="' + metaColor + '" stroke-width="' + innerLineWidth.toFixed(2) + '" />',
      '',
      '  <!-- Astrolabe Coordinate Grid & Armillary Rings -->',
      '  <g class="celestial-grid">',
      '    ' + coordinateRings.join('\n    '),
      '    ' + tickLines.join('\n    '),
      '    ' + tickLabels.join('\n    '),
      '    ' + eclipticPath,
      '    ' + centerReticle,
      '  </g>',
      '',
      '  <!-- Constellation Asterism Vectors -->',
      '  <g class="constellation-asterism">',
      '    ' + asterismLines.join('\n    '),
      '  </g>',
      '',
      '  <!-- Stellar Catalog & Magnitude Hierarchy -->',
      '  <g class="stellar-catalog">',
      '    ' + starElements.join('\n    '),
      '  </g>',
      '',
      '  <!-- Astrometric Drafting Scale Bar (60\' Arc Rule) -->',
      '  <g class="drafting-scale-bar" transform="translate(' + scaleBarX + ', ' + scaleBarY + ')">',
      '    <rect x="0" y="0" width="' + segW + '" height="' + barH + '" fill="' + strokeColor + '" />',
      '    <rect x="' + segW + '" y="0" width="' + segW + '" height="' + barH + '" fill="none" stroke="' + strokeColor + '" stroke-width="0.75" />',
      '    <rect x="' + (segW * 2) + '" y="0" width="' + segW + '" height="' + barH + '" fill="' + strokeColor + '" />',
      '    <rect x="' + (segW * 3) + '" y="0" width="' + segW + '" height="' + barH + '" fill="none" stroke="' + strokeColor + '" stroke-width="0.75" />',
      '    <rect x="0" y="0" width="' + barW + '" height="' + barH + '" fill="none" stroke="' + strokeColor + '" stroke-width="0.75" />',
      '    <line x1="0" y1="' + (-tickH) + '" x2="0" y2="0" stroke="' + strokeColor + '" stroke-width="0.75" />',
      '    <line x1="' + (segW * 2) + '" y1="' + (-tickH) + '" x2="' + (segW * 2) + '" y2="0" stroke="' + strokeColor + '" stroke-width="0.75" />',
      '    <line x1="' + barW + '" y1="' + (-tickH) + '" x2="' + barW + '" y2="0" stroke="' + strokeColor + '" stroke-width="0.75" />',
      '    <text x="0" y="' + (-tickH - 2) + '" font-family="\'JetBrains Mono\', monospace" font-size="' + scaleFontSize + '" font-weight="600" fill="' + strokeColor + '" text-anchor="middle">0</text>',
      '    <text x="' + (segW * 2) + '" y="' + (-tickH - 2) + '" font-family="\'JetBrains Mono\', monospace" font-size="' + scaleFontSize + '" font-weight="600" fill="' + strokeColor + '" text-anchor="middle">30\'</text>',
      '    <text x="' + barW + '" y="' + (-tickH - 2) + '" font-family="\'JetBrains Mono\', monospace" font-size="' + scaleFontSize + '" font-weight="600" fill="' + strokeColor + '" text-anchor="middle">60\' ARC</text>',
      '    <text x="0" y="' + (barH + captionFontSize + 2) + '" font-family="\'JetBrains Mono\', monospace" font-size="' + captionFontSize + '" font-weight="500" fill="' + metaColor + '">ASTROMETRIC SCALE 1:60\'</text>',
      '  </g>',
      '',
      '  <!-- Archival Vermilion Seal Chop (朱砂印章 · 星纬典藏) -->',
      '  <g class="archival-seal" transform="translate(' + sealX + ', ' + sealY + ')">',
      '    <rect width="' + sealSize + '" height="' + sealSize + '" fill="#B83227" fill-opacity="0.06" stroke="#B83227" stroke-width="' + Math.max(1.2, sealSize * 0.05).toFixed(2) + '" />',
      '    <rect x="' + sealInset + '" y="' + sealInset + '" width="' + (sealSize - sealInset * 2) + '" height="' + (sealSize - sealInset * 2) + '" fill="none" stroke="#B83227" stroke-width="' + Math.max(0.5, sealSize * 0.02).toFixed(2) + '" />',
      '    <line x1="' + (sealSize / 2) + '" y1="' + sealInset + '" x2="' + (sealSize / 2) + '" y2="' + (sealSize - sealInset) + '" stroke="#B83227" stroke-opacity="0.35" stroke-width="0.5" />',
      '    <line x1="' + sealInset + '" y1="' + (sealSize / 2) + '" x2="' + (sealSize - sealInset) + '" y2="' + (sealSize / 2) + '" stroke="#B83227" stroke-opacity="0.35" stroke-width="0.5" />',
      '    <text x="' + (sealSize * 0.28) + '" y="' + (sealSize * 0.38) + '" font-family="\'Noto Serif SC\', \'Source Han Serif\', \'Songti SC\', \'SimSun\', serif" font-weight="bold" font-size="' + sealFontSize + '" fill="#B83227" text-anchor="middle">星</text>',
      '    <text x="' + (sealSize * 0.72) + '" y="' + (sealSize * 0.38) + '" font-family="\'Noto Serif SC\', \'Source Han Serif\', \'Songti SC\', \'SimSun\', serif" font-weight="bold" font-size="' + sealFontSize + '" fill="#B83227" text-anchor="middle">典</text>',
      '    <text x="' + (sealSize * 0.28) + '" y="' + (sealSize * 0.80) + '" font-family="\'Noto Serif SC\', \'Source Han Serif\', \'Songti SC\', \'SimSun\', serif" font-weight="bold" font-size="' + sealFontSize + '" fill="#B83227" text-anchor="middle">纬</text>',
      '    <text x="' + (sealSize * 0.72) + '" y="' + (sealSize * 0.80) + '" font-family="\'Noto Serif SC\', \'Source Han Serif\', \'Songti SC\', \'SimSun\', serif" font-weight="bold" font-size="' + sealFontSize + '" fill="#B83227" text-anchor="middle">藏</text>',
      '  </g>',
      '',
      '  <!-- Engraved Cursive Astrometric Title -->',
      '  <g stroke="' + strokeColor + '" stroke-width="' + (outerLineWidth * 1.05).toFixed(2) + '" stroke-linecap="round" stroke-linejoin="round">',
      '    ' + hersheySvgPaths,
      '  </g>',
      '</svg>'
    ];

    return lines.join('\n');
  }

  // --- 7. Canvas Direct Renderer (300 DPI Export Support) ---
  function renderToCanvas(data, canvas, options) {
    options = options || {};
    var width = canvas.width;
    var height = canvas.height;
    var ctx = canvas.getContext("2d");
    var svgString = generateSvgPlate(data, {
      width: width,
      height: height,
      palette: options.palette || "vellum"
    });

    var blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var img = new Image();

    return new Promise(function (resolve, reject) {
      img.onload = function () {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas);
      };
      img.onerror = function (err) {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  // --- 8. Public API Namespace Export ---
  return {
    synthesize: synthesize,
    generateSpecimen: function(options) {
      options = options || {};
      var seed = options.narrative || options.seed || options.id || "Archival Astrometric Specimen";
      return synthesize(seed, options);
    },
    generateSvgPlate: generateSvgPlate,
    renderToCanvas: renderToCanvas,
    PALETTES: PALETTES,
    fnv1a: fnv1a,
    generateSequenceIdentifier: generateSequenceIdentifier,
    recoverHashFromId: recoverHashFromId
  };
});
