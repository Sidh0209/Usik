// Usik - Supabase Client & Authentication Layer
import { createClient } from "@supabase/supabase-js";

// Check environment variables or local storage for credentials
const storedConfig = JSON.parse(localStorage.getItem("usik_supabase_config") || "{}");
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseUrl = envUrl || storedConfig.url || "";
let supabaseAnonKey = envAnonKey || storedConfig.anonKey || "";

let supabase = null;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("http"));
}

export function initSupabase() {
  if (isSupabaseConfigured()) {
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      console.log("⚡ Supabase initialized successfully:", supabaseUrl);
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      supabase = null;
    }
  } else {
    supabase = null;
  }
  return supabase;
}

// Initial setup
initSupabase();

export function saveSupabaseConfig(url, anonKey) {
  supabaseUrl = (url || "").trim();
  supabaseAnonKey = (anonKey || "").trim();
  localStorage.setItem("usik_supabase_config", JSON.stringify({ url: supabaseUrl, anonKey: supabaseAnonKey }));
  return initSupabase();
}

export function getSupabaseConfig() {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isConfigured: isSupabaseConfigured()
  };
}

export async function signUpUser({ email, password, fullName }) {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split("@")[0]
        }
      }
    });
    if (error) throw error;
    return data;
  }

  // Demo / Fallback Mock Mode (so UI works immediately without setting up Supabase)
  await new Promise((res) => setTimeout(res, 450));
  const mockUser = {
    id: "demo-user-" + Date.now(),
    email,
    user_metadata: {
      full_name: fullName || email.split("@")[0]
    }
  };
  localStorage.setItem("usik_demo_user", JSON.stringify(mockUser));
  return { user: mockUser, session: { user: mockUser, access_token: "demo-token" } };
}

export async function signInUser({ email, password }) {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // Demo / Fallback Mock Mode
  await new Promise((res) => setTimeout(res, 450));
  const mockUser = {
    id: "demo-user-1",
    email,
    user_metadata: {
      full_name: email.split("@")[0]
    }
  };
  localStorage.setItem("usik_demo_user", JSON.stringify(mockUser));
  return { user: mockUser, session: { user: mockUser, access_token: "demo-token" } };
}

export async function signOutUser() {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return;
  }

  localStorage.removeItem("usik_demo_user");
}

export async function getCurrentUser() {
  if (isSupabaseConfigured() && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  const stored = localStorage.getItem("usik_demo_user");
  return stored ? JSON.parse(stored) : null;
}

export function onAuthStateChange(callback) {
  if (isSupabaseConfigured() && supabase) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session ? session.user : null);
    });
    return subscription;
  }

  // If in demo mode, emit initial demo user
  const stored = localStorage.getItem("usik_demo_user");
  const user = stored ? JSON.parse(stored) : null;
  callback("INITIAL_SESSION", user);

  return {
    unsubscribe: () => {}
  };
}

// Default library state for new users / guests
export const DEFAULT_LIBRARY = {
  likedTracks: ["track-1", "track-3"],
  playlists: ["Chill Lo-Fi Vibes", "Cyberpunk 2099", "Deep Focus Room"],
  customTracks: [],
  settings: {
    volume: 0.85,
    currentEnv: "cosmic",
    isShuffle: false,
    repeatMode: "off"
  }
};

export async function fetchUserLibrary(userId = "guest") {
  const localKey = `usik_library_${userId}`;
  const localRaw = localStorage.getItem(localKey);
  let localData = localRaw ? JSON.parse(localRaw) : { ...DEFAULT_LIBRARY };
  if (!Array.isArray(localData.customTracks)) localData.customTracks = [];

  if (isSupabaseConfigured() && supabase && userId && userId !== "guest") {
    try {
      const { data, error } = await supabase
        .from("user_library")
        .select("liked_tracks, playlists, custom_tracks, settings")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data) {
        const remoteData = {
          likedTracks: Array.isArray(data.liked_tracks) ? data.liked_tracks : localData.likedTracks,
          playlists: Array.isArray(data.playlists) ? data.playlists : localData.playlists,
          customTracks: Array.isArray(data.custom_tracks) ? data.custom_tracks : (localData.customTracks || []),
          settings: data.settings ? { ...DEFAULT_LIBRARY.settings, ...data.settings } : localData.settings
        };
        localStorage.setItem(localKey, JSON.stringify(remoteData));
        return remoteData;
      }
    } catch (err) {
      console.warn("Could not fetch remote user_library, using local storage:", err);
    }
  }

  return localData;
}

export async function syncUserLibrary(userId = "guest", data) {
  const localKey = `usik_library_${userId}`;
  localStorage.setItem(localKey, JSON.stringify(data));

  if (isSupabaseConfigured() && supabase && userId && userId !== "guest") {
    try {
      const { error } = await supabase
        .from("user_library")
        .upsert(
          {
            user_id: userId,
            liked_tracks: data.likedTracks || [],
            playlists: data.playlists || [],
            custom_tracks: data.customTracks || [],
            settings: data.settings || DEFAULT_LIBRARY.settings,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.warn("Supabase user_library sync notice (run schema.sql if table is missing):", error.message);
      }
    } catch (err) {
      console.warn("Supabase user_library network sync error:", err);
    }
  }
}

// ==============================================================================
// DEDICATED RELATIONAL SONGS TABLE OPERATIONS (public.songs)
// ==============================================================================

/**
 * Inserts a single song into the public.songs table in Supabase.
 * Returns the created row object (including the generated UUID id) or null if Supabase not configured.
 */
export async function saveSongToSupabase(songData, userId = null, uploaderName = "Community") {
  if (!isSupabaseConfigured() || !supabase) {
    console.warn("Supabase is not configured. Song saved to local storage only.");
    return null;
  }

  // Check if userId is a valid UUID (auth.users id format)
  const isUUID = typeof userId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
  const safeUserId = isUUID ? userId : null;

  try {
    const payload = {
      user_id: safeUserId,
      uploader_name: uploaderName || "Community",
      title: songData.title || "Untitled Track",
      artist: songData.artist || "Unknown Artist",
      url: songData.audioUrl || songData.url || "",
      embed_url: songData.embedUrl || null,
      cover_url: songData.coverUrl || songData.cover || null,
      provider: songData.type || songData.provider || "youtube",
      duration: songData.duration || 180,
      genre: songData.genre || "Custom"
    };

    const { data, error } = await supabase
      .from("songs")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase songs insert error:", error.message, error.details || error.hint || "");
      return null;
    }

    console.log("⚡ Song successfully saved to Supabase 'songs' table:", data.id);
    return data;
  } catch (err) {
    console.error("❌ Supabase saveSongToSupabase exception:", err);
    return null;
  }
}

/**
 * Fetches all community songs across all users from public.songs for universal playback & feed discovery.
 * Returns formatted track objects matching Usik application data structure.
 */
export async function fetchAllPublicSongs(limit = 100) {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.warn("Supabase public songs fetch notice:", error.message);
      return [];
    }

    if (!Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      uploaderName: row.uploader_name || "Community",
      title: row.title,
      artist: row.artist,
      album: row.provider === "youtube" ? "YouTube Stream" : "Audio Stream",
      genre: row.genre || "Community Drop",
      duration: row.duration || 180,
      audioUrl: row.url,
      embedUrl: row.embed_url,
      coverUrl: row.cover_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
      color: "#a855f7",
      secondaryColor: "#c084fc",
      type: row.provider || "youtube",
      videoId: (row.url && row.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)) ? RegExp.$1 : null,
      isCustom: true,
      isPublic: true,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.warn("Supabase fetchAllPublicSongs error:", err);
    return [];
  }
}

/**
 * Fetches songs created by a specific user from public.songs, ordered by creation date descending.
 */
export async function fetchUserSongs(userId) {
  if (!isSupabaseConfigured() || !supabase || !userId || userId === "guest") {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase songs fetch notice:", error.message);
      return [];
    }

    if (!Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      uploaderName: row.uploader_name || "You",
      title: row.title,
      artist: row.artist,
      album: row.provider === "youtube" ? "YouTube Stream" : "Audio Stream",
      genre: row.genre || "Imported",
      duration: row.duration || 180,
      audioUrl: row.url,
      embedUrl: row.embed_url,
      coverUrl: row.cover_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
      color: "#a855f7",
      secondaryColor: "#c084fc",
      type: row.provider || "youtube",
      videoId: (row.url && row.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)) ? RegExp.$1 : null,
      isCustom: true,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.warn("Supabase fetchUserSongs error:", err);
    return [];
  }
}

/**
 * Subscribes to real-time additions to public.songs so the live feed updates instantly
 * across all connected users without refreshing.
 */
export function subscribeToNewSongs(onNewSong) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const channel = supabase
      .channel("public-songs-live-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "songs"
        },
        (payload) => {
          if (payload && payload.new) {
            const row = payload.new;
            const newTrack = {
              id: row.id,
              userId: row.user_id,
              uploaderName: row.uploader_name || "Community",
              title: row.title,
              artist: row.artist,
              album: row.provider === "youtube" ? "YouTube Stream" : "Audio Stream",
              genre: row.genre || "Community Drop",
              duration: row.duration || 180,
              audioUrl: row.url,
              embedUrl: row.embed_url,
              coverUrl: row.cover_url || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
              color: "#a855f7",
              secondaryColor: "#c084fc",
              type: row.provider || "youtube",
              videoId: (row.url && row.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)) ? RegExp.$1 : null,
              isCustom: true,
              isPublic: true,
              createdAt: row.created_at
            };
            onNewSong(newTrack);
          }
        }
      )
      .subscribe();

    return channel;
  } catch (err) {
    console.warn("Could not establish real-time subscription on public.songs:", err);
    return null;
  }
}

/**
 * Deletes a song from public.songs by UUID and user_id.
 */
export async function deleteSongFromSupabase(songId, userId) {
  if (!isSupabaseConfigured() || !supabase || !userId || userId === "guest") {
    return false;
  }

  try {
    const { error } = await supabase
      .from("songs")
      .delete()
      .eq("id", songId)
      .eq("user_id", userId);

    if (error) {
      console.warn("Supabase deleteSongFromSupabase notice:", error.message);
      return false;
    }
    console.log("⚡ Song successfully deleted from Supabase 'songs' table:", songId);
    return true;
  } catch (err) {
    console.warn("Supabase deleteSongFromSupabase error:", err);
    return false;
  }
}

