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

