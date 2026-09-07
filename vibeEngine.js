// Usik - Vibe Intelligence Engine
// Classifies acoustic vibes, computes track similarity, and generates seamless mood flows

export const VIBE_DEFINITIONS = {
  relax: {
    id: "relax",
    label: "Chillout & Lo-Fi",
    icon: "🍵",
    color: "#10b981",
    secondaryColor: "#06b6d4",
    keywords: [
      "lofi", "lo-fi", "chill", "chillout", "relax", "cafe", "rain", "breeze",
      "coffee", "study", "soft", "night", "slow", "slowed", "tea", "cozy",
      "peaceful", "shinjuku", "tokyo", "jazz", "piano", "mellow"
    ]
  },
  energy: {
    id: "energy",
    label: "High Voltage & Synth",
    icon: "⚡",
    color: "#ec4899",
    secondaryColor: "#8b5cf6",
    keywords: [
      "synthwave", "energy", "voltage", "electronic", "dance", "edm", "retro",
      "80s", "sub-bass", "bass", "kinetic", "fast", "party", "club", "rave",
      "upbeat", "drive", "power", "quantum", "neon", "beat", "drum"
    ]
  },
  focus: {
    id: "focus",
    label: "Deep Focus & Cyber",
    icon: "🧠",
    color: "#f43f5e",
    secondaryColor: "#fb923c",
    keywords: [
      "cyberpunk", "focus", "tech", "cyber", "neural", "resonance", "synthetic",
      "deep", "matrix", "future", "coding", "flow", "darksynth", "ambient space",
      "solaris", "dimension", "drift", "machine"
    ]
  },
  sleep: {
    id: "sleep",
    label: "Cosmic & Dreamscape",
    icon: "🌌",
    color: "#a855f7",
    secondaryColor: "#38bdf8",
    keywords: [
      "ambient", "space", "sleep", "dream", "starlight", "celestia", "infinite",
      "nebula", "star", "floating", "cosmic", "meditation", "zen", "calm",
      "echoes", "drifting", "lullaby", "voyage"
    ]
  },
  acoustic: {
    id: "acoustic",
    label: "Warm Acoustic & Indie",
    icon: "🎸",
    color: "#f59e0b",
    secondaryColor: "#ef4444",
    keywords: [
      "acoustic", "guitar", "autumn", "sunset", "whispers", "organic", "warm",
      "solitude", "strings", "indie", "folk", "unplugged", "ballad", "vocal"
    ]
  }
};

// Genre affinity relationships (weights between 0.0 and 1.0)
const GENRE_AFFINITY = {
  "Lo-Fi Chill": { "Lo-Fi Chill": 1.0, "Acoustic": 0.8, "Ambient Space": 0.75, "Synthwave": 0.4, "Electronic": 0.35, "Cyberpunk": 0.2 },
  "Acoustic": { "Acoustic": 1.0, "Lo-Fi Chill": 0.8, "Ambient Space": 0.7, "Synthwave": 0.3, "Electronic": 0.2, "Cyberpunk": 0.1 },
  "Ambient Space": { "Ambient Space": 1.0, "Lo-Fi Chill": 0.75, "Acoustic": 0.7, "Focus": 0.65, "Synthwave": 0.5, "Electronic": 0.4 },
  "Synthwave": { "Synthwave": 1.0, "Cyberpunk": 0.85, "Electronic": 0.85, "Ambient Space": 0.5, "Lo-Fi Chill": 0.4, "Acoustic": 0.3 },
  "Cyberpunk": { "Cyberpunk": 1.0, "Synthwave": 0.85, "Electronic": 0.8, "Ambient Space": 0.6, "Focus": 0.9, "Lo-Fi Chill": 0.2 },
  "Electronic": { "Electronic": 1.0, "Synthwave": 0.85, "Cyberpunk": 0.8, "Ambient Space": 0.4, "Lo-Fi Chill": 0.35, "Acoustic": 0.2 }
};

/**
 * Classifies a track into a primary vibe definition.
 * Works seamlessly for curated tracks, community drops, and YouTube imports.
 */
export function classifyTrackVibe(track) {
  if (!track) return VIBE_DEFINITIONS.relax;

  // 1. If explicit mood is set and matches
  const explicitMood = (track.mood || "").toLowerCase();
  if (explicitMood && VIBE_DEFINITIONS[explicitMood]) {
    return VIBE_DEFINITIONS[explicitMood];
  }

  // 2. Keyword score matching across title, artist, album, genre
  const textCorpus = [
    track.title || "",
    track.artist || "",
    track.album || "",
    track.genre || "",
    track.uploaderName || ""
  ].join(" ").toLowerCase();

  let highestScore = 0;
  let bestVibe = VIBE_DEFINITIONS.relax;

  for (const [vibeKey, def] of Object.entries(VIBE_DEFINITIONS)) {
    let score = 0;
    // Check genre match
    if (track.genre && track.genre.toLowerCase().includes(vibeKey)) {
      score += 4;
    }

    // Check keyword hits
    for (const kw of def.keywords) {
      if (textCorpus.includes(kw)) {
        score += 2;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestVibe = def;
    }
  }

  return bestVibe;
}

/**
 * Calculates a normalized similarity score (0.0 to 1.0) between two tracks.
 */
export function calculateVibeSimilarity(trackA, trackB) {
  if (!trackA || !trackB) return 0;
  if (trackA.id === trackB.id) return 1.0;

  let totalScore = 0;
  let maxPossible = 100;

  const vibeA = classifyTrackVibe(trackA);
  const vibeB = classifyTrackVibe(trackB);

  // 1. Primary Vibe Match (Weight: 45)
  if (vibeA.id === vibeB.id) {
    totalScore += 45;
  } else {
    // Neighbor affinity
    const relatedMap = {
      relax: ["acoustic", "sleep"],
      acoustic: ["relax", "sleep"],
      energy: ["focus"],
      focus: ["energy", "sleep"],
      sleep: ["relax", "focus", "acoustic"]
    };
    if (relatedMap[vibeA.id]?.includes(vibeB.id)) {
      totalScore += 25;
    }
  }

  // 2. Genre Affinity (Weight: 30)
  const genreA = trackA.genre || "";
  const genreB = trackB.genre || "";
  if (genreA && genreB && genreA === genreB) {
    totalScore += 30;
  } else if (GENRE_AFFINITY[genreA]?.[genreB]) {
    totalScore += Math.round(GENRE_AFFINITY[genreA][genreB] * 30);
  } else {
    totalScore += 10;
  }

  // 3. Sonic text/keyword overlap (Weight: 15)
  const wordsA = new Set((trackA.title + " " + (trackA.artist || "")).toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const wordsB = new Set((trackB.title + " " + (trackB.artist || "")).toLowerCase().split(/\W+/).filter(w => w.length > 2));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  totalScore += Math.min(15, overlap * 5);

  // 4. Harmonic color closeness (Weight: 10)
  if (trackA.color && trackB.color && trackA.color === trackB.color) {
    totalScore += 10;
  } else {
    totalScore += 5;
  }

  return Math.min(1.0, Math.max(0.0, totalScore / maxPossible));
}

/**
 * Generates an upcoming playback queue tailored specifically to the vibe of seedTrack.
 * Candidate tracks are sorted by similarity, with soft shuffling among top tiers to keep the flow organic.
 */
export function generateVibeQueue(seedTrack, allTracks = [], maxResults = 25) {
  if (!seedTrack || !Array.isArray(allTracks) || allTracks.length === 0) {
    return allTracks;
  }

  // Filter out the seed track itself
  const candidates = allTracks.filter(t => t.id !== seedTrack.id);

  // Calculate similarity for each candidate
  const scored = candidates.map(t => {
    const similarity = calculateVibeSimilarity(seedTrack, t);
    // Add subtle jitter (up to ±0.06) so subsequent radio sessions don't produce an identical robotic order
    const organicWeight = similarity + (Math.random() * 0.12 - 0.06);
    return { track: t, similarity, organicWeight };
  });

  // Sort by organic weight descending
  scored.sort((a, b) => b.organicWeight - a.organicWeight);

  // Return the seed track followed by top matching tracks
  return [seedTrack, ...scored.slice(0, maxResults).map(item => item.track)];
}

/**
 * Selects the next best matching vibe track from a pool, excluding recently played history.
 */
export function getNextVibeTrack(currentTrack, allTracks = [], playedHistoryIds = []) {
  if (!currentTrack || !Array.isArray(allTracks) || allTracks.length === 0) return null;

  const historySet = new Set(playedHistoryIds);
  historySet.add(currentTrack.id);

  // Find unplayed candidates first
  let available = allTracks.filter(t => !historySet.has(t.id));
  if (available.length === 0) {
    available = allTracks.filter(t => t.id !== currentTrack.id);
  }
  if (available.length === 0) return currentTrack;

  // Score candidates
  const scored = available.map(t => ({
    track: t,
    score: calculateVibeSimilarity(currentTrack, t) + (Math.random() * 0.1 - 0.05)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.track || available[0];
}
