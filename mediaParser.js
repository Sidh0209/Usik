// Usik - Media URL Detection & Zero-Key Metadata Parser
// Supports: YouTube, YouTube Music, and Direct Audio Streams (.mp3, .wav, .m4a, web radio)

export function detectMediaUrl(value) {
  try {
    const trimmed = (value || "").trim();
    if (!trimmed) return { error: "Please enter a URL." };

    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { error: "Enter a valid web URL." };
    }

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const isYouTube = host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";

    // 1. Raw Audio Stream (e.g. .mp3, .m4a, .aac, .ogg)
    if (!isYouTube) {
      return {
        type: "audio",
        url: url.href,
        label: "Audio stream",
        filename: decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "Audio Stream")
      };
    }

    // 2. YouTube / YouTube Music
    let videoId = "";
    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0];
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2];
    } else {
      videoId = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1);
    }

    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) {
      return { error: "That YouTube link does not include a playable video ID." };
    }

    const provider = host === "music.youtube.com" ? "YouTube Music" : "YouTube";
    const origin = typeof window !== "undefined" ? window.location.origin : "*";
    const params = new URLSearchParams({
      enablejsapi: "1",
      playsinline: "1",
      controls: "0",
      modestbranding: "1",
      rel: "0",
      origin: origin
    });

    return {
      type: "youtube",
      provider,
      videoId,
      url: url.href,
      embedUrl: `https://www.youtube.com/embed/${videoId}?${params.toString()}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  } catch (err) {
    return { error: "Invalid URL format." };
  }
}

export function extractArtistAndSong(title = "", author = "") {
  // 1. Strip channel clutter
  let cleanAuthor = (author || "").trim()
    .replace(/ - Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/ Official$/i, "")
    .replace(/ Channel$/i, "")
    .replace(/ Records$/i, "")
    .trim();

  // 2. Strip video clutter (HD, 4K, Official Video, Visualizer, Lyrics, etc.)
  let cleanTitle = (title || "").trim().replace(
    /\s*(\(|\[)(official\s*(music\s*)?video|official\s*audio|lyrics?|audio|video|visualizer|hd|4k|mv|remastered|lyrics\s*video)(\)|\])/gi,
    ""
  ).trim();

  let artist = "";
  let song = "";
  const separators = [" - ", " – ", " — ", " : ", " | "];
  const matchedSep = separators.find((sep) => cleanTitle.includes(sep));

  // 3. Extract Artist vs Title
  if (matchedSep) {
    const parts = cleanTitle.split(matchedSep);
    artist = parts[0].trim();
    song = parts.slice(1).join(matchedSep).trim();
  } else if (cleanAuthor) {
    artist = cleanAuthor;
    song = cleanTitle || "Untitled Track";
  } else {
    artist = "Unknown Artist";
    song = cleanTitle || "Audio Track";
  }

  song = song.replace(/\s*(\(|\[)(lyrics?|audio|video)(\)|\])/gi, "").trim();

  return {
    artist: artist || cleanAuthor || "Unknown Artist",
    song: song || cleanTitle || "Unknown Track"
  };
}

export async function parseMediaMetadata(urlStr) {
  const detected = detectMediaUrl(urlStr);
  if (detected.error) return { error: detected.error };

  let rawTitle = "";
  let authorName = "";
  let coverUrl = "";

  if (detected.type === "youtube") {
    coverUrl = detected.thumbnailUrl;
    try {
      const pageUrl = `https://www.youtube.com/watch?v=${detected.videoId}`;
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`);
      if (res.ok) {
        const json = await res.json();
        rawTitle = json.title || "";
        authorName = json.author_name || "";
        if (json.thumbnail_url) {
          coverUrl = json.thumbnail_url;
        }
      }
    } catch (err) {
      console.warn("oEmbed fetch notice (falling back to URL parsing):", err);
    }
  } else {
    // For raw audio, fallback to clean filename
    try {
      const path = new URL(urlStr).pathname;
      const file = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
      rawTitle = file.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ");
      authorName = "Web Stream";
      coverUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80";
    } catch {}
  }

  const { artist, song } = extractArtistAndSong(rawTitle, authorName);

  return {
    ...detected,
    artist,
    title: song,
    song,
    author: authorName,
    coverUrl: coverUrl || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
  };
}
