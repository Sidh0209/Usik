// Usik - Spotify-Inspired Music App Controller
import { TRACKS_DATA, MOODS, ENVIRONMENTS } from "./tracksData.js";
import { SpatialAudioEngine } from "./audioEngine.js";
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig,
  signUpUser,
  signInUser,
  signOutUser,
  onAuthStateChange,
  fetchUserLibrary,
  syncUserLibrary,
  saveSongToSupabase,
  fetchAllPublicSongs,
  subscribeToNewSongs,
  fetchUserSongs,
  deleteSongFromSupabase,
  DEFAULT_LIBRARY
} from "./supabaseClient.js";
import { detectMediaUrl, parseMediaMetadata } from "./mediaParser.js";

class UsikSpotifyApp {
  constructor() {
    this.customTracks = [];
    this.communityTracks = [];
    this.tracks = [...TRACKS_DATA];
    this.activeTrackIndex = 0;
    this.queue = [...TRACKS_DATA];
    this.history = [];
    this.activeGenre = "all";
    this.searchQuery = "";
    this.currentView = "home"; // "home", "search", "library"
    this.isShuffle = false;
    this.repeatMode = "off"; // "off", "all", "one"
    this.currentEnv = "cosmic";
    this.currentUser = null;
    this.authMode = "login"; // "login" | "register"
    this._syncTimeout = null;

    // YouTube Stream Player State & API Client
    this.ytPlayer = null;
    this.ytPlayerReady = false;
    this.pendingYtVideoId = null;
    this.isYouTubePlaying = false;
    this.ytCurrentTime = 0;
    this.ytDuration = 180;
    this._ytProgressInterval = null;
    this.currentParsedTrack = null;
    this._urlDebounceTimer = null;

    // Initial default state before user library load
    this.likedTrackIds = new Set(DEFAULT_LIBRARY.likedTracks);
    this.customPlaylists = [...DEFAULT_LIBRARY.playlists];

    // Engine
    this.audioEngine = new SpatialAudioEngine();

    this.initDOM();
    this.initGreeting();
    this.initEngines();
    this.initAuth();
    this.initImportModal();
    this.renderEnvironmentMenu();
    this.renderGenrePills();
    this.renderRecentsGrid();
    this.renderCommunityShelf();
    this.renderBentoGrid();
    this.renderFeaturedCarousel();
    this.renderTracksTable();
    this.renderLibraryList();
    this.renderQueue();
    this.bindEvents();
    this.bindKeyboardShortcuts();
    this.updatePlayerUI();
    this.updateSidebarLikedCount();
    this.loadGlobalSongs();
    this.initRealtimeFeed();
  }

  initDOM() {
    this.dom = {
      greetingText: document.getElementById("greeting-text"),
      searchInput: document.getElementById("search-input"),
      headerSearchBox: document.getElementById("header-search-box"),
      btnBack: document.getElementById("btn-back"),
      btnForward: document.getElementById("btn-forward"),
      btnEnvMenu: document.getElementById("btn-env-menu"),
      envPopupMenu: document.getElementById("env-popup-menu"),
      headerAmbientGlow: document.getElementById("header-ambient-glow"),
      mainScrollView: document.getElementById("main-scroll-view"),

      // Navigation
      navBrand: document.getElementById("nav-brand"),
      btnNavHome: document.getElementById("btn-nav-home"),
      btnNavSearch: document.getElementById("btn-nav-search"),
      libItemLiked: document.getElementById("lib-item-liked"),
      btnAddPlaylist: document.getElementById("btn-add-playlist"),
      sidebarLikedCount: document.getElementById("sidebar-liked-count"),
      customPlaylistsContainer: document.getElementById("custom-playlists-container"),

      // Pages
      pageHome: document.getElementById("page-home"),
      pageLibrary: document.getElementById("page-library"),

      // Home Components
      recentsGrid: document.getElementById("recents-grid-container"),
      genrePills: document.getElementById("genre-pills-container"),
      communityShelf: document.getElementById("community-shelf-container"),
      bentoGenresGrid: document.getElementById("bento-genres-grid"),
      btnQuickImportShelf: document.getElementById("btn-quick-import-shelf"),
      liveFeedStatus: document.getElementById("live-feed-status"),
      featuredCarousel: document.getElementById("featured-carousel"),
      tracksTableBody: document.getElementById("tracks-table-body"),
      catalogCountBadge: document.getElementById("catalog-count-badge"),

      // Library Components
      libraryTableBody: document.getElementById("library-table-body"),
      playlistHeroName: document.getElementById("playlist-hero-name"),
      playlistSongsCount: document.getElementById("playlist-songs-count"),
      btnPlaylistPlay: document.getElementById("btn-playlist-play"),

      // Bottom Now Playing Bar
      playerThumb: document.getElementById("player-track-thumb"),
      playerTitle: document.getElementById("player-track-title"),
      playerArtist: document.getElementById("player-track-artist"),
      playerLikeBtn: document.getElementById("player-like-btn"),
      btnPlayPause: document.getElementById("btn-play-pause"),
      playPauseIcon: document.getElementById("play-pause-icon"),
      btnPrev: document.getElementById("btn-prev"),
      btnNext: document.getElementById("btn-next"),
      btnShuffle: document.getElementById("btn-shuffle"),
      btnRepeat: document.getElementById("btn-repeat"),
      currentTimeText: document.getElementById("current-time"),
      totalDurationText: document.getElementById("total-duration"),
      progressTrack: document.getElementById("progress-bar-container"),
      progressFill: document.getElementById("progress-fill"),

      // Volume
      volBarTrack: document.getElementById("vol-bar-track"),
      volFill: document.getElementById("vol-fill"),
      btnVolumeMute: document.getElementById("btn-volume-mute"),
      volumeIcon: document.getElementById("volume-icon"),

      // Drawers & Modals
      btnToggleQueue: document.getElementById("btn-toggle-queue"),
      queueDrawer: document.getElementById("queue-drawer"),
      btnCloseQueue: document.getElementById("btn-close-queue"),
      queueItemsList: document.getElementById("queue-items-list"),

      btnToggleLyrics: document.getElementById("btn-toggle-lyrics"),
      lyricsDrawer: document.getElementById("lyrics-drawer"),
      btnCloseLyrics: document.getElementById("btn-close-lyrics"),
      lyricsLinesContainer: document.getElementById("lyrics-lines-container"),

      playlistModal: document.getElementById("playlist-modal"),
      playlistInput: document.getElementById("playlist-name-input"),
      btnSavePlaylist: document.getElementById("btn-save-playlist"),
      btnCancelPlaylist: document.getElementById("btn-cancel-playlist"),

      // Auth Header
      authGuestBtns: document.getElementById("auth-guest-btns"),
      authUserProfile: document.getElementById("auth-user-profile"),
      btnOpenRegister: document.getElementById("btn-open-register"),
      btnOpenLogin: document.getElementById("btn-open-login"),
      btnUserAvatar: document.getElementById("btn-user-avatar"),
      userAvatarInitial: document.getElementById("user-avatar-initial"),
      userPopupMenu: document.getElementById("user-popup-menu"),
      userProfileName: document.getElementById("user-profile-name"),
      userProfileEmail: document.getElementById("user-profile-email"),
      btnOpenSupabaseSettings: document.getElementById("btn-open-supabase-settings"),
      btnUserLogout: document.getElementById("btn-user-logout"),

      // Auth Modal
      authModal: document.getElementById("auth-modal"),
      btnCloseAuthModal: document.getElementById("btn-close-auth-modal"),
      tabBtnLogin: document.getElementById("tab-btn-login"),
      tabBtnRegister: document.getElementById("tab-btn-register"),
      authAlert: document.getElementById("auth-alert"),
      authForm: document.getElementById("auth-form"),
      groupFullName: document.getElementById("group-fullname"),
      inputFullName: document.getElementById("auth-fullname"),
      inputEmail: document.getElementById("auth-email"),
      inputPassword: document.getElementById("auth-password"),
      btnAuthSubmit: document.getElementById("btn-auth-submit"),
      authSubmitText: document.getElementById("auth-submit-text"),
      authSpinner: document.getElementById("auth-spinner"),
      authBackendStatus: document.getElementById("auth-backend-status"),
      btnShowSupabaseConfig: document.getElementById("btn-show-supabase-config"),

      // Supabase Config Modal
      supabaseConfigModal: document.getElementById("supabase-config-modal"),
      btnCloseSupabaseModal: document.getElementById("btn-close-supabase-modal"),
      btnCancelSupabaseConfig: document.getElementById("btn-cancel-supabase-config"),
      btnSaveSupabaseConfig: document.getElementById("btn-save-supabase-config"),
      inputSupabaseUrl: document.getElementById("input-supabase-url"),
      inputSupabaseKey: document.getElementById("input-supabase-key"),
      btnCopySqlSchema: document.getElementById("btn-copy-sql-schema"),

      // Add Track / Import Modal
      btnOpenImport: document.getElementById("btn-open-import"),
      pillImportLib: document.getElementById("pill-import-lib"),
      addTrackModal: document.getElementById("add-track-modal"),
      btnCloseImportModal: document.getElementById("btn-close-import-modal"),
      btnCancelImport: document.getElementById("btn-cancel-import"),
      btnSubmitImport: document.getElementById("btn-submit-import"),
      inputMediaUrl: document.getElementById("input-media-url"),
      importTypeBadge: document.getElementById("import-type-badge"),
      importPreviewCard: document.getElementById("import-preview-card"),
      importPreviewThumb: document.getElementById("import-preview-thumb"),
      importEditTitle: document.getElementById("import-edit-title"),
      importEditArtist: document.getElementById("import-edit-artist"),
      importSourceTag: document.getElementById("import-source-tag"),
      importLoadingState: document.getElementById("import-loading-state"),
      importAlert: document.getElementById("import-alert"),

      // YouTube Audio Stream Dock
      youtubeDock: document.getElementById("youtube-audio-dock"),
      dockHeader: document.getElementById("dock-header"),
      btnToggleDock: document.getElementById("btn-toggle-dock"),
      youtubePlayerMount: document.getElementById("youtube-player-mount"),
      dockTitleText: document.getElementById("dock-title-text"),

      toast: document.getElementById("app-toast"),
      toastMessage: document.getElementById("toast-message")
    };
  }

  initGreeting() {
    const hour = new Date().getHours();
    let text = "Good evening";
    if (hour < 12) text = "Good morning";
    else if (hour < 18) text = "Good afternoon";
    this.dom.greetingText.textContent = text;
  }

  initEngines() {
    this.audioEngine.callbacks.onTimeUpdate = (current, duration) => {
      if (!this.isYouTubePlaying) {
        this.updateProgress(current, duration);
      }
    };

    this.audioEngine.callbacks.onTrackEnd = () => {
      if (!this.isYouTubePlaying) {
        this.handleTrackEnd();
      }
    };

    this.audioEngine.callbacks.onStateChange = (isPlaying) => {
      if (!this.isYouTubePlaying) {
        this.updatePlayStateUI(isPlaying);
      }
    };

    // YouTube IFrame Player API initialization for bidirectional synchronization
    this.initYouTubeAPI();

    // YouTube Audio Dock minimize / expand
    this.dom.btnToggleDock.addEventListener("click", () => {
      this.dom.youtubeDock.classList.toggle("minimized");
    });
    this.dom.dockHeader.addEventListener("click", (e) => {
      if (e.target !== this.dom.btnToggleDock && !this.dom.btnToggleDock.contains(e.target)) {
        this.dom.youtubeDock.classList.toggle("minimized");
      }
    });

    const current = this.getCurrentTrack();
    if (current) {
      this.setTrackTheme(current);
    }
  }

  initYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this.setupYouTubePlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === "function") prevCallback();
        this.setupYouTubePlayer();
      };
    }
  }

  setupYouTubePlayer() {
    if (this.ytPlayer) return;
    try {
      this.ytPlayer = new window.YT.Player("youtube-player-mount", {
        height: "100%",
        width: "100%",
        playerVars: {
          autoplay: 1,
          controls: 1,
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            this.ytPlayerReady = true;
            if (this.ytPlayer && typeof this.ytPlayer.setVolume === "function") {
              this.ytPlayer.setVolume(Math.round(this.audioEngine.volume * 100));
            }
            if (this.pendingYtVideoId) {
              const vid = this.pendingYtVideoId;
              this.pendingYtVideoId = null;
              this.ytPlayer.loadVideoById(vid);
            }
          },
          onStateChange: (event) => {
            this.handleYouTubeStateChange(event.data);
          },
          onError: (event) => {
            console.warn("YouTube player encountered error:", event.data);
            this.showToast("Could not play this YouTube stream (embedding restricted).");
            this.handleTrackEnd();
          }
        }
      });
    } catch (err) {
      console.warn("Failed to initialize YouTube IFrame Player:", err);
    }
  }

  handleYouTubeStateChange(state) {
    // YT.PlayerState: -1 (UNSTARTED), 0 (ENDED), 1 (PLAYING), 2 (PAUSED), 3 (BUFFERING), 5 (CUED)
    if (state === 1) { // PLAYING
      this.isYouTubePlaying = true;
      this.updatePlayStateUI(true);

      if (this.ytPlayer && typeof this.ytPlayer.getDuration === "function") {
        const d = this.ytPlayer.getDuration();
        if (d && d > 0) {
          this.ytDuration = d;
          this.dom.totalDurationText.textContent = this.formatTime(this.ytDuration);
        }
      }
      this.startYtProgressTimer();
    } else if (state === 2) { // PAUSED
      this.isYouTubePlaying = false;
      this.updatePlayStateUI(false);
      this.stopYtProgressTimer();
    } else if (state === 0) { // ENDED
      this.isYouTubePlaying = false;
      this.stopYtProgressTimer();
      this.handleTrackEnd();
    } else if (state === 3) { // BUFFERING
      this.updatePlayStateUI(true);
    }
  }

  startYtProgressTimer() {
    this.stopYtProgressTimer();
    this._ytProgressInterval = setInterval(() => {
      if (this.ytPlayer && this.isYouTubePlaying && typeof this.ytPlayer.getCurrentTime === "function") {
        const curr = this.ytPlayer.getCurrentTime();
        if (typeof curr === "number" && !isNaN(curr)) {
          this.ytCurrentTime = curr;
          const dur = (this.ytDuration && this.ytDuration > 0) ? this.ytDuration : (this.ytPlayer.getDuration() || 180);
          this.ytDuration = dur;
          this.updateProgress(this.ytCurrentTime, dur);
        }
      }
    }, 250);
  }

  stopYtProgressTimer() {
    if (this._ytProgressInterval) {
      clearInterval(this._ytProgressInterval);
      this._ytProgressInterval = null;
    }
  }

  getTrackYouTubeId(track) {
    if (!track) return null;
    if (track.videoId && /^[\w-]{6,}$/.test(track.videoId)) return track.videoId;
    const url = track.audioUrl || track.url || track.embedUrl || "";
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }

  postYouTube(func, args = []) {
    if (!this.ytPlayer) return;
    try {
      if (typeof this.ytPlayer[func] === "function") {
        this.ytPlayer[func](...(Array.isArray(args) ? args : [args]));
      }
    } catch (e) {
      console.warn("postYouTube error:", e);
    }
  }

  getCurrentTrack() {
    return this.queue[this.activeTrackIndex] || this.tracks[0];
  }

  setTrackTheme(track) {
    if (!track) return;
    document.documentElement.style.setProperty("--ambient-primary", track.color);
    document.documentElement.style.setProperty("--ambient-secondary", track.secondaryColor || "#a855f7");
  }

  switchView(viewName) {
    this.currentView = viewName;
    
    // Update sidebar navigation active classes
    this.dom.btnNavHome.classList.toggle("active", viewName === "home");
    this.dom.btnNavSearch.classList.toggle("active", viewName === "search");

    // Toggle pages
    this.dom.pageHome.classList.toggle("active", viewName === "home" || viewName === "search");
    this.dom.pageLibrary.classList.toggle("active", viewName === "library");

    // Focus search if on search tab
    if (viewName === "search") {
      this.dom.searchInput.focus();
    }

    this.dom.mainScrollView.scrollTop = 0;
  }

  renderEnvironmentMenu() {
    this.dom.envPopupMenu.innerHTML = "";
    ENVIRONMENTS.forEach((env) => {
      const item = document.createElement("div");
      item.className = `env-menu-item ${env.id === this.currentEnv ? "selected" : ""}`;
      item.textContent = env.name;
      item.addEventListener("click", () => {
        this.setEnvironment(env.id);
        this.dom.envPopupMenu.classList.remove("open");
        this.showToast(`Theme changed to ${env.name}`);
        this.saveCurrentUserData();
      });
      this.dom.envPopupMenu.appendChild(item);
    });
  }

  setEnvironment(envId) {
    const env = ENVIRONMENTS.find(e => e.id === envId) || ENVIRONMENTS[0];
    document.body.className = env.bgClass;
    this.currentEnv = env.id;
    this.renderEnvironmentMenu();
  }

  renderGenrePills() {
    this.dom.genrePills.innerHTML = "";
    const allChip = document.createElement("button");
    allChip.className = `genre-filter-chip ${this.activeGenre === "all" ? "active" : ""}`;
    allChip.textContent = "All";
    allChip.addEventListener("click", () => {
      this.activeGenre = "all";
      this.renderGenrePills();
      this.renderTracksTable();
    });
    this.dom.genrePills.appendChild(allChip);

    MOODS.filter(m => m.id !== "all").forEach((m) => {
      const chip = document.createElement("button");
      chip.className = `genre-filter-chip ${this.activeGenre === m.id ? "active" : ""}`;
      chip.textContent = `${m.icon} ${m.label}`;
      chip.addEventListener("click", () => {
        this.activeGenre = m.id;
        this.renderGenrePills();
        this.renderTracksTable();
      });
      this.dom.genrePills.appendChild(chip);
    });
  }

  renderRecentsGrid() {
    this.dom.recentsGrid.innerHTML = "";
    const recents = this.tracks.slice(0, 6);
    recents.forEach((track) => {
      const card = document.createElement("div");
      card.className = "recent-card";
      card.innerHTML = `
        <img src="${track.coverUrl}" alt="${track.title}" class="recent-art" loading="lazy" />
        <span class="recent-title">${track.title}</span>
        <button class="recent-play-btn" title="Play">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
        </button>
      `;
      card.addEventListener("click", () => this.playTrackById(track.id));
      this.dom.recentsGrid.appendChild(card);
    });
  }

  renderFeaturedCarousel() {
    if (!this.dom.featuredCarousel) return;
    this.dom.featuredCarousel.innerHTML = "";
    this.tracks.forEach((track) => {
      const card = document.createElement("div");
      card.className = "sp-card";
      card.innerHTML = `
        <div class="sp-card-art-box">
          <img src="${track.coverUrl}" alt="${track.title}" class="sp-card-art-img" loading="lazy" />
          <button class="sp-card-play-btn" title="Play">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#000000"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </button>
        </div>
        <div class="sp-card-title">${track.title}</div>
        <div class="sp-card-desc">${track.artist}</div>
      `;
      card.addEventListener("click", () => this.playTrackById(track.id));
      this.dom.featuredCarousel.appendChild(card);
    });
  }

  renderCommunityShelf() {
    if (!this.dom.communityShelf) return;
    this.dom.communityShelf.innerHTML = "";

    const commList = this.communityTracks || [];

    if (commList.length === 0) {
      const empty = document.createElement("div");
      empty.className = "comm-empty-state";
      empty.innerHTML = `
        <div style="font-size:1.8rem;">🎧</div>
        <div style="font-weight:600; color:#ffffff;">No community drops yet</div>
        <div style="font-size:0.78rem; opacity:0.8;">Import a YouTube or Audio stream to share it with everyone!</div>
        <button class="btn-ghost-sm" id="btn-empty-drop" style="margin-top:4px;">+ Drop First Song</button>
      `;
      const dropBtn = empty.querySelector("#btn-empty-drop");
      if (dropBtn) dropBtn.addEventListener("click", () => this.dom.btnOpenImport.click());
      this.dom.communityShelf.appendChild(empty);
      return;
    }

    commList.forEach((track) => {
      const card = document.createElement("div");
      card.className = "community-song-card";
      card.innerHTML = `
        <div class="comm-art-box">
          <img src="${track.coverUrl}" alt="${track.title}" class="comm-art-img" loading="lazy" />
          <span class="comm-uploader-tag" title="Added by ${track.uploaderName || 'Community'}">👤 ${track.uploaderName || 'Community'}</span>
          <span class="comm-provider-badge">${track.type === "youtube" ? "YT" : "AUDIO"}</span>
          <button class="comm-play-btn" title="Play">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </button>
        </div>
        <div class="comm-title" title="${track.title}">${track.title}</div>
        <div class="comm-artist" title="${track.artist}">${track.artist}</div>
      `;
      card.addEventListener("click", () => this.playTrackById(track.id));
      this.dom.communityShelf.appendChild(card);
    });
  }

  renderBentoGrid() {
    if (!this.dom.bentoGenresGrid) return;
    this.dom.bentoGenresGrid.innerHTML = "";

    const stations = [
      { id: "Relax", name: "Lo-Fi Beats", sub: "Chillout & Study", bg: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)", icon: "🍵" },
      { id: "Energy", name: "Synthwave", sub: "Retro Cyber Drive", bg: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)", icon: "🌴" },
      { id: "Focus", name: "Cyberpunk", sub: "Neon High Velocity", bg: "linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)", icon: "⚡" },
      { id: "Ambient", name: "Deep Ambient", sub: "Cosmic Drift & Zen", bg: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)", icon: "🌌" },
      { id: "Acoustic", name: "Acoustic Sunset", sub: "Organic & Warm", bg: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", icon: "🎸" },
      { id: "HipHop", name: "Night Lo-Fi", sub: "Tokyo Midnight", bg: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", icon: "🔥" }
    ];

    stations.forEach((station) => {
      const card = document.createElement("div");
      card.className = "bento-card";
      card.style.background = station.bg;
      card.innerHTML = `
        <div class="bento-card-sub">${station.sub}</div>
        <div class="bento-card-title">${station.name}</div>
        <div class="bento-card-icon">${station.icon}</div>
      `;
      card.addEventListener("click", () => {
        this.activeGenre = station.id;
        this.renderGenrePills();
        this.renderTracksTable();
        this.dom.tracksTableBody.scrollIntoView({ behavior: "smooth", block: "nearest" });
        this.showToast(`Switched feed to ${station.name}`);
      });
      this.dom.bentoGenresGrid.appendChild(card);
    });
  }

  async loadGlobalSongs() {
    try {
      const publicSongs = await fetchAllPublicSongs();
      if (Array.isArray(publicSongs) && publicSongs.length > 0) {
        this.communityTracks = publicSongs;

        const seen = new Set();
        const merged = [];

        // 1. User's own custom tracks first
        for (const t of (this.customTracks || [])) {
          seen.add(t.id);
          if (t.audioUrl) seen.add(t.audioUrl);
          merged.push(t);
        }

        // 2. Community drops next
        for (const t of publicSongs) {
          if (!seen.has(t.id) && (!t.audioUrl || !seen.has(t.audioUrl))) {
            seen.add(t.id);
            if (t.audioUrl) seen.add(t.audioUrl);
            merged.push(t);
          }
        }

        // 3. Curated built-in catalog
        for (const t of TRACKS_DATA) {
          if (!seen.has(t.id)) {
            merged.push(t);
          }
        }

        this.tracks = merged;
        this.queue = [...this.tracks];
        this.renderCommunityShelf();
        this.renderTracksTable();
        this.renderFeaturedCarousel();
        this.renderRecentsGrid();
      }
    } catch (err) {
      console.warn("Could not load global songs:", err);
    }
  }

  initRealtimeFeed() {
    try {
      subscribeToNewSongs((newTrack) => {
        this.handleRealtimeNewSong(newTrack);
      });
    } catch (err) {
      console.warn("Could not subscribe to real-time feed:", err);
    }
  }

  handleRealtimeNewSong(newTrack) {
    if (!newTrack || !newTrack.id) return;

    // Prevent duplicate entries
    const exists = this.tracks.some(t => t.id === newTrack.id || (t.audioUrl && t.audioUrl === newTrack.audioUrl));
    if (exists) return;

    this.communityTracks.unshift(newTrack);
    this.tracks.unshift(newTrack);
    this.queue.unshift(newTrack);

    this.renderCommunityShelf();
    this.renderTracksTable();
    this.renderFeaturedCarousel();
    this.renderRecentsGrid();

    // Subtle celebration toast
    this.showToast(`🎶 ${newTrack.uploaderName} just dropped "${newTrack.title}"!`);
  }

  getFilteredTracks() {
    return this.tracks.filter(t => {
      const matchGenre = this.activeGenre === "all" || 
        t.mood === this.activeGenre ||
        (t.genre && t.genre.toLowerCase().includes(this.activeGenre.toLowerCase()));
      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album && t.album.toLowerCase().includes(q)) ||
        (t.uploaderName && t.uploaderName.toLowerCase().includes(q));
      return matchGenre && matchSearch;
    });
  }

  renderTracksTable() {
    const list = this.getFilteredTracks();
    this.dom.tracksTableBody.innerHTML = "";
    this.dom.catalogCountBadge.textContent = `${list.length} song${list.length === 1 ? "" : "s"}`;

    const current = this.getCurrentTrack();

    list.forEach((track, i) => {
      const isCurrent = current && current.id === track.id;
      const isLiked = this.likedTrackIds.has(track.id);

      const row = document.createElement("div");
      row.className = `table-row ${isCurrent ? "active" : ""}`;
      row.innerHTML = `
        <div class="col-num">
          <span class="row-index-num">${isCurrent && (this.audioEngine.isPlaying || this.isYouTubePlaying) ? "🔊" : i + 1}</span>
          <button class="row-play-btn" title="Play">▶</button>
        </div>
        <div class="col-title-flex">
          <img src="${track.coverUrl}" alt="${track.title}" class="col-art-thumb" loading="lazy" />
          <div class="col-title-meta">
            <span class="row-song-title">${track.title}</span>
            <span class="row-song-artist">${track.artist}</span>
          </div>
        </div>
        <div class="col-album">${track.album}</div>
        <div class="col-genre">${track.genre}</div>
        <div class="col-duration-flex">
          ${track.isCustom ? `<button class="row-delete-icon" data-delete-id="${track.id}" title="Remove song">✕</button>` : ""}
          <button class="row-like-icon ${isLiked ? "liked" : ""}" data-like-id="${track.id}">
            ${isLiked ? "♥" : "♡"}
          </button>
          <span>${this.formatTime(track.duration)}</span>
        </div>
      `;

      row.addEventListener("click", (e) => {
        if (e.target.closest(".row-like-icon") || e.target.closest(".row-delete-icon")) return;
        this.playTrackById(track.id);
      });

      const rowPlayBtn = row.querySelector(".row-play-btn");
      if (rowPlayBtn) {
        rowPlayBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isCurrent) {
            this.dom.btnPlayPause.click();
          } else {
            this.playTrackById(track.id);
          }
        });
      }

      const likeBtn = row.querySelector(`[data-like-id="${track.id}"]`);
      if (likeBtn) {
        likeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleLike(track.id);
        });
      }

      const deleteBtn = row.querySelector(`[data-delete-id="${track.id}"]`);
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm(`Remove "${track.title}" from your library?`)) {
            await this.removeCustomTrack(track.id);
          }
        });
      }

      this.dom.tracksTableBody.appendChild(row);
    });
  }

  renderLibraryList() {
    this.dom.customPlaylistsContainer.innerHTML = "";
    this.customPlaylists.forEach((name) => {
      const item = document.createElement("div");
      item.className = "lib-item-card";
      item.innerHTML = `
        <div class="liked-songs-gradient-icon" style="background:#282828;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#b3b3b3"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
        </div>
        <div class="lib-meta">
          <span class="lib-title">${name}</span>
          <span class="lib-sub">Playlist • Siddharth</span>
        </div>
      `;
      item.addEventListener("click", () => {
        this.openLibraryView(name);
      });
      this.dom.customPlaylistsContainer.appendChild(item);
    });
  }

  openLibraryView(title = "Liked Songs") {
    this.switchView("library");
    this.dom.playlistHeroName.textContent = title;

    const tracks = title === "Liked Songs"
      ? this.tracks.filter(t => this.likedTrackIds.has(t.id))
      : this.tracks;

    this.dom.playlistSongsCount.textContent = `${tracks.length} song${tracks.length === 1 ? "" : "s"}`;
    this.dom.libraryTableBody.innerHTML = "";

    const current = this.getCurrentTrack();

    tracks.forEach((track, i) => {
      const isCurrent = current && current.id === track.id;
      const isLiked = this.likedTrackIds.has(track.id);

      const row = document.createElement("div");
      row.className = `table-row ${isCurrent ? "active" : ""}`;
      row.innerHTML = `
        <div class="col-num">
          <span class="row-index-num">${i + 1}</span>
          <button class="row-play-btn">▶</button>
        </div>
        <div class="col-title-flex">
          <img src="${track.coverUrl}" alt="${track.title}" class="col-art-thumb" />
          <div class="col-title-meta">
            <span class="row-song-title">${track.title}</span>
            <span class="row-song-artist">${track.artist}</span>
          </div>
        </div>
        <div class="col-album">${track.album}</div>
        <div class="col-genre">${track.genre}</div>
        <div class="col-duration-flex">
          ${track.isCustom ? `<button class="row-delete-icon" data-delete-id="${track.id}" title="Remove song">✕</button>` : ""}
          <button class="row-like-icon ${isLiked ? "liked" : ""}" data-like-id="${track.id}">
            ${isLiked ? "♥" : "♡"}
          </button>
          <span>${this.formatTime(track.duration)}</span>
        </div>
      `;
      row.addEventListener("click", (e) => {
        if (e.target.closest(".row-like-icon") || e.target.closest(".row-delete-icon")) return;
        this.playTrackById(track.id);
      });
      const likeBtn = row.querySelector(`[data-like-id="${track.id}"]`);
      if (likeBtn) {
        likeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.toggleLike(track.id);
          this.openLibraryView(title);
        });
      }
      const deleteBtn = row.querySelector(`[data-delete-id="${track.id}"]`);
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm(`Remove "${track.title}" from your library?`)) {
            await this.removeCustomTrack(track.id);
          }
        });
      }
      this.dom.libraryTableBody.appendChild(row);
    });
  }

  playTrackById(trackId) {
    let index = this.queue.findIndex(t => t.id === trackId);
    if (index === -1) {
      const track = this.tracks.find(t => t.id === trackId);
      if (track) {
        this.queue.push(track);
        index = this.queue.length - 1;
      }
    }

    if (index !== -1) {
      this.activeTrackIndex = index;
      const track = this.queue[this.activeTrackIndex];

      if (track.type === "youtube") {
        // 1. YouTube Audio Stream Mode
        this.audioEngine.pause();
        const videoId = this.getTrackYouTubeId(track);

        this.dom.youtubeDock.style.display = "flex";
        this.dom.dockTitleText.textContent = track.title;

        this.ytDuration = track.duration || 180;
        this.ytCurrentTime = 0;
        this.updateProgress(0, this.ytDuration);

        if (this.ytPlayerReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === "function") {
          if (videoId) {
            this.ytPlayer.loadVideoById(videoId);
            if (typeof this.ytPlayer.setVolume === "function") {
              this.ytPlayer.setVolume(Math.round(this.audioEngine.volume * 100));
            }
          }
        } else {
          this.pendingYtVideoId = videoId;
          this.setupYouTubePlayer();
        }

        this.setTrackTheme(track);
        this.updatePlayerUI();
        this.updatePlayStateUI(true);
      } else {
        // 2. Standard Audio Stream (.mp3)
        if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === "function") {
          try {
            this.ytPlayer.pauseVideo();
          } catch (e) {}
        }
        this.isYouTubePlaying = false;
        this.stopYtProgressTimer();
        this.dom.youtubeDock.style.display = "none";

        this.audioEngine.loadTrack(track);
        this.setTrackTheme(track);
        this.updatePlayerUI();
      }

      this.renderTracksTable();
      this.renderQueue();
      this.renderLyrics();
    }
  }

  updatePlayerUI() {
    const track = this.getCurrentTrack();
    if (!track) return;

    this.dom.playerThumb.src = track.coverUrl;
    this.dom.playerTitle.textContent = track.title;
    this.dom.playerArtist.textContent = track.artist;
    this.dom.totalDurationText.textContent = this.formatTime(track.type === "youtube" ? this.ytDuration : track.duration);

    const isLiked = this.likedTrackIds.has(track.id);
    this.dom.playerLikeBtn.classList.toggle("liked", isLiked);
    this.dom.playerLikeBtn.innerHTML = isLiked
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';

    this.renderLyrics();
  }

  updatePlayStateUI(isPlaying) {
    if (isPlaying) {
      this.dom.playPauseIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
    } else {
      this.dom.playPauseIcon.innerHTML = '<polygon points="6 4 20 12 6 20 6 4"></polygon>';
    }
    this.renderTracksTable();
  }

  updateProgress(currentTime, duration) {
    this.dom.currentTimeText.textContent = this.formatTime(currentTime);
    const percent = Math.min(100, (currentTime / duration) * 100);
    this.dom.progressFill.style.width = `${percent}%`;
    this.highlightActiveLyric(currentTime, duration);
  }

  formatTime(secs) {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  handleTrackEnd() {
    if (this.repeatMode === "one") {
      const current = this.getCurrentTrack();
      if (current && current.type === "youtube") {
        if (this.ytPlayer && typeof this.ytPlayer.seekTo === "function") {
          this.ytPlayer.seekTo(0, true);
          this.ytPlayer.playVideo();
        }
      } else {
        this.audioEngine.seek(0);
        this.audioEngine.play();
      }
    } else {
      this.playNextTrack();
    }
  }

  playNextTrack() {
    if (this.isShuffle) {
      this.activeTrackIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.activeTrackIndex = (this.activeTrackIndex + 1) % this.queue.length;
    }
    const nextTrack = this.queue[this.activeTrackIndex];
    if (nextTrack) {
      this.playTrackById(nextTrack.id);
    }
  }

  playPrevTrack() {
    this.activeTrackIndex = (this.activeTrackIndex - 1 + this.queue.length) % this.queue.length;
    const prevTrack = this.queue[this.activeTrackIndex];
    if (prevTrack) {
      this.playTrackById(prevTrack.id);
    }
  }

  toggleLike(trackId) {
    if (this.likedTrackIds.has(trackId)) {
      this.likedTrackIds.delete(trackId);
      this.showToast("Removed from your Library");
    } else {
      this.likedTrackIds.add(trackId);
      this.showToast("Added to your Library");
    }
    localStorage.setItem("usik_liked_tracks", JSON.stringify([...this.likedTrackIds]));
    this.updateSidebarLikedCount();
    this.updatePlayerUI();
    this.renderTracksTable();
    this.saveCurrentUserData();
  }

  updateSidebarLikedCount() {
    this.dom.sidebarLikedCount.textContent = `Playlist • ${this.likedTrackIds.size} songs`;
  }

  renderQueue() {
    this.dom.queueItemsList.innerHTML = "";
    this.queue.forEach((track, idx) => {
      const isActive = idx === this.activeTrackIndex;
      const el = document.createElement("div");
      el.className = `q-row ${isActive ? "active" : ""}`;
      el.innerHTML = `
        <img src="${track.coverUrl}" alt="${track.title}" class="q-art" />
        <div class="q-meta">
          <div class="q-title">${track.title}</div>
          <div class="q-artist">${track.artist}</div>
        </div>
        <span style="font-size:0.75rem; color:var(--text-muted);">${this.formatTime(track.duration)}</span>
      `;
      el.addEventListener("click", () => {
        this.activeTrackIndex = idx;
        const selected = this.queue[this.activeTrackIndex];
        this.audioEngine.loadTrack(selected);
        this.setTrackTheme(selected);
        this.updatePlayerUI();
        this.renderTracksTable();
        this.renderQueue();
      });
      this.dom.queueItemsList.appendChild(el);
    });
  }

  renderLyrics() {
    const track = this.getCurrentTrack();
    this.dom.lyricsLinesContainer.innerHTML = "";
    if (!track || !track.lyrics) {
      this.dom.lyricsLinesContainer.innerHTML = '<p style="color:var(--text-muted); padding:20px;">Instrumental stream</p>';
      return;
    }

    track.lyrics.forEach((line, i) => {
      const p = document.createElement("p");
      p.className = `lyric-phrase ${i === 0 ? "active" : ""}`;
      p.textContent = line;
      p.addEventListener("click", () => {
        const lineFraction = i / track.lyrics.length;
        this.audioEngine.seek(lineFraction * track.duration);
      });
      this.dom.lyricsLinesContainer.appendChild(p);
    });
  }

  highlightActiveLyric(currentTime, duration) {
    const track = this.getCurrentTrack();
    if (!track || !track.lyrics || track.lyrics.length === 0) return;

    const progress = currentTime / duration;
    const activeIndex = Math.min(track.lyrics.length - 1, Math.floor(progress * track.lyrics.length));

    const lines = this.dom.lyricsLinesContainer.querySelectorAll(".lyric-phrase");
    lines.forEach((line, idx) => {
      if (idx === activeIndex) {
        line.classList.add("active");
        line.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        line.classList.remove("active");
      }
    });
  }

  showToast(message) {
    this.dom.toastMessage.textContent = message;
    this.dom.toast.classList.add("show");
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.dom.toast.classList.remove("show");
    }, 2500);
  }

  bindEvents() {
    // Nav events
    this.dom.navBrand.addEventListener("click", () => this.switchView("home"));
    this.dom.btnNavHome.addEventListener("click", () => this.switchView("home"));
    this.dom.btnNavSearch.addEventListener("click", () => this.switchView("search"));
    this.dom.libItemLiked.addEventListener("click", () => this.openLibraryView("Liked Songs"));

    // History arrows
    this.dom.btnBack.addEventListener("click", () => this.switchView("home"));
    this.dom.btnForward.addEventListener("click", () => this.switchView("search"));

    // Search
    this.dom.searchInput.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.renderTracksTable();
    });

    // Theme Menu
    this.dom.btnEnvMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dom.envPopupMenu.classList.toggle("open");
    });
    window.addEventListener("click", () => {
      this.dom.envPopupMenu.classList.remove("open");
    });

    // Player Controls
    this.dom.btnPlayPause.addEventListener("click", () => {
      const track = this.getCurrentTrack();
      if (!track) return;

      if (track.type === "youtube") {
        if (!this.ytPlayer || !this.ytPlayerReady) {
          this.playTrackById(track.id);
          return;
        }
        if (this.isYouTubePlaying) {
          this.ytPlayer.pauseVideo();
        } else {
          this.ytPlayer.playVideo();
        }
      } else {
        if (!this.audioEngine.currentTrack) {
          this.playTrackById(track.id);
        } else {
          this.audioEngine.togglePlay();
        }
      }
    });

    this.dom.btnNext.addEventListener("click", () => this.playNextTrack());
    this.dom.btnPrev.addEventListener("click", () => this.playPrevTrack());

    this.dom.playerLikeBtn.addEventListener("click", () => {
      const track = this.getCurrentTrack();
      if (track) this.toggleLike(track.id);
    });

    this.dom.btnPlaylistPlay.addEventListener("click", () => {
      const liked = this.tracks.filter(t => this.likedTrackIds.has(t.id));
      if (liked.length > 0) {
        this.queue = [...liked];
        this.playTrackById(liked[0].id);
      }
    });

    // Shuffle & Repeat
    this.dom.btnShuffle.addEventListener("click", () => {
      this.isShuffle = !this.isShuffle;
      this.dom.btnShuffle.classList.toggle("active", this.isShuffle);
      this.showToast(this.isShuffle ? "Shuffle on" : "Shuffle off");
      this.saveCurrentUserData();
    });

    this.dom.btnRepeat.addEventListener("click", () => {
      if (this.repeatMode === "off") {
        this.repeatMode = "all";
        this.dom.btnRepeat.classList.add("active");
        this.showToast("Repeat all on");
      } else if (this.repeatMode === "all") {
        this.repeatMode = "one";
        this.showToast("Repeat one on");
      } else {
        this.repeatMode = "off";
        this.dom.btnRepeat.classList.remove("active");
        this.showToast("Repeat off");
      }
      this.saveCurrentUserData();
    });

    // Scrub timeline
    let isScrubbing = false;
    const seekWithEvent = (e) => {
      const rect = this.dom.progressTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const track = this.getCurrentTrack();
      const duration = track ? (track.type === "youtube" ? this.ytDuration : track.duration) : 180;
      const targetSecs = pos * duration;

      if (track && track.type === "youtube") {
        if (this.ytPlayer && typeof this.ytPlayer.seekTo === "function") {
          this.ytPlayer.seekTo(targetSecs, true);
        }
        this.updateProgress(targetSecs, duration);
      } else {
        this.audioEngine.seek(targetSecs);
      }
    };

    this.dom.progressTrack.addEventListener("mousedown", (e) => {
      isScrubbing = true;
      seekWithEvent(e);
    });
    window.addEventListener("mousemove", (e) => {
      if (isScrubbing) seekWithEvent(e);
    });
    window.addEventListener("mouseup", () => {
      isScrubbing = false;
    });

    // Volume Bar
    const setVolWithEvent = (e) => {
      const rect = this.dom.volBarTrack.getBoundingClientRect();
      const vol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.audioEngine.setVolume(vol);
      if (this.ytPlayer && typeof this.ytPlayer.setVolume === "function") {
        this.ytPlayer.setVolume(Math.round(vol * 100));
        if (vol === 0) {
          this.ytPlayer.mute();
        } else if (typeof this.ytPlayer.isMuted === "function" && this.ytPlayer.isMuted()) {
          this.ytPlayer.unMute();
        }
      }
      this.dom.volFill.style.width = `${vol * 100}%`;
      this.saveCurrentUserData();
    };
    this.dom.volBarTrack.addEventListener("click", setVolWithEvent);

    this.dom.btnVolumeMute.addEventListener("click", () => {
      const isMuted = this.audioEngine.toggleMute();
      if (this.ytPlayer) {
        if (isMuted && typeof this.ytPlayer.mute === "function") {
          this.ytPlayer.mute();
        } else if (!isMuted && typeof this.ytPlayer.unMute === "function") {
          this.ytPlayer.unMute();
        }
      }
      this.dom.volFill.style.width = isMuted ? "0%" : `${this.audioEngine.volume * 100}%`;
      this.saveCurrentUserData();
    });

    // Drawers
    this.dom.btnToggleQueue.addEventListener("click", () => {
      this.dom.lyricsDrawer.classList.remove("open");
      this.dom.queueDrawer.classList.toggle("open");
    });
    this.dom.btnCloseQueue.addEventListener("click", () => {
      this.dom.queueDrawer.classList.remove("open");
    });

    this.dom.btnToggleLyrics.addEventListener("click", () => {
      this.dom.queueDrawer.classList.remove("open");
      this.dom.lyricsDrawer.classList.toggle("open");
    });
    this.dom.btnCloseLyrics.addEventListener("click", () => {
      this.dom.lyricsDrawer.classList.remove("open");
    });

    // Playlist Modal
    this.dom.btnAddPlaylist.addEventListener("click", () => {
      this.dom.playlistModal.classList.add("open");
      this.dom.playlistInput.focus();
    });
    this.dom.btnCancelPlaylist.addEventListener("click", () => {
      this.dom.playlistModal.classList.remove("open");
    });
    this.dom.btnSavePlaylist.addEventListener("click", () => {
      const name = this.dom.playlistInput.value.trim();
      if (name) {
        this.customPlaylists.push(name);
        localStorage.setItem("usik_playlists", JSON.stringify(this.customPlaylists));
        this.renderLibraryList();
        this.dom.playlistInput.value = "";
        this.dom.playlistModal.classList.remove("open");
        this.showToast(`Created playlist: ${name}`);
        this.saveCurrentUserData();
      }
    });
  }

  /* ==========================================================================
     AUTHENTICATION & SUPABASE INTEGRATION
     ========================================================================== */

  initAuth() {
    // Listen to real-time auth changes
    onAuthStateChange((event, user) => {
      this.handleAuthStateChange(user);
    });

    // Update status text
    this.updateSupabaseStatus();

    // Guest Auth Buttons
    this.dom.btnOpenLogin.addEventListener("click", () => {
      this.openAuthModal("login");
    });
    this.dom.btnOpenRegister.addEventListener("click", () => {
      this.openAuthModal("register");
    });

    // Modal tabs
    this.dom.tabBtnLogin.addEventListener("click", () => {
      this.setAuthMode("login");
    });
    this.dom.tabBtnRegister.addEventListener("click", () => {
      this.setAuthMode("register");
    });

    // Modal Close
    this.dom.btnCloseAuthModal.addEventListener("click", () => {
      this.closeAuthModal();
    });
    this.dom.authModal.addEventListener("click", (e) => {
      if (e.target === this.dom.authModal) this.closeAuthModal();
    });

    // Form submission
    this.dom.authForm.addEventListener("submit", (e) => {
      this.handleAuthSubmit(e);
    });

    // User Avatar & Menu
    this.dom.btnUserAvatar.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dom.userPopupMenu.classList.toggle("open");
    });

    // Logout
    this.dom.btnUserLogout.addEventListener("click", async () => {
      this.dom.userPopupMenu.classList.remove("open");
      try {
        await signOutUser();
        this.showToast("Signed out successfully");
      } catch (err) {
        this.showToast("Error signing out");
      }
    });

    // Supabase Config Modal
    this.dom.btnShowSupabaseConfig.addEventListener("click", () => {
      this.closeAuthModal();
      this.openSupabaseConfigModal();
    });
    this.dom.btnOpenSupabaseSettings.addEventListener("click", () => {
      this.dom.userPopupMenu.classList.remove("open");
      this.openSupabaseConfigModal();
    });
    this.dom.btnCloseSupabaseModal.addEventListener("click", () => {
      this.closeSupabaseConfigModal();
    });
    this.dom.btnCancelSupabaseConfig.addEventListener("click", () => {
      this.closeSupabaseConfigModal();
    });
    this.dom.btnSaveSupabaseConfig.addEventListener("click", () => {
      this.saveSupabaseSettings();
    });
    this.dom.supabaseConfigModal.addEventListener("click", (e) => {
      if (e.target === this.dom.supabaseConfigModal) this.closeSupabaseConfigModal();
    });

    if (this.dom.btnCopySqlSchema) {
      this.dom.btnCopySqlSchema.addEventListener("click", async () => {
        const sql = `-- Usik Database Schema for Supabase (Universal Song Feed & User Library)
CREATE TABLE IF NOT EXISTS public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    uploader_name TEXT DEFAULT 'Community',
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    url TEXT NOT NULL,
    embed_url TEXT,
    cover_url TEXT,
    provider TEXT NOT NULL DEFAULT 'youtube',
    duration INTEGER DEFAULT 180,
    genre TEXT DEFAULT 'Custom',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS uploader_name TEXT DEFAULT 'Community';
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON public.songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON public.songs(created_at DESC);
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view all songs" ON public.songs;
DROP POLICY IF EXISTS "Users can view their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can manage their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can insert their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can insert songs" ON public.songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON public.songs;

CREATE POLICY "Anyone can view all songs" ON public.songs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert songs" ON public.songs;
CREATE POLICY "Anyone can insert songs" ON public.songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own songs" ON public.songs FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can delete their own songs" ON public.songs FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE TABLE IF NOT EXISTS public.user_library (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    liked_tracks JSONB DEFAULT '[]'::jsonb,
    playlists JSONB DEFAULT '[]'::jsonb,
    custom_tracks JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{"volume": 0.85, "currentEnv": "cosmic", "isShuffle": false, "repeatMode": "off"}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own library" ON public.user_library;
DROP POLICY IF EXISTS "Users can read their own library" ON public.user_library;
DROP POLICY IF EXISTS "Users can insert their own library" ON public.user_library;
DROP POLICY IF EXISTS "Users can update their own library" ON public.user_library;
DROP POLICY IF EXISTS "Users can delete their own library" ON public.user_library;

CREATE POLICY "Users can manage their own library" ON public.user_library FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.songs TO anon, authenticated;
GRANT ALL ON public.user_library TO anon, authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_library;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;`;
        try {
          await navigator.clipboard.writeText(sql);
          this.showToast("Copied full SQL Schema to clipboard!");
        } catch {
          this.showToast("Schema is in schema.sql file");
        }
      });
    }

    // Close user menu on document click
    document.addEventListener("click", (e) => {
      if (!this.dom.authUserProfile.contains(e.target)) {
        this.dom.userPopupMenu.classList.remove("open");
      }
    });
  }

  updateSupabaseStatus() {
    const configured = isSupabaseConfigured();
    if (this.dom.authBackendStatus) {
      this.dom.authBackendStatus.textContent = configured
        ? "⚡ Supabase Connected"
        : "💡 Interactive Demo Mode";
      this.dom.authBackendStatus.style.color = configured ? "var(--sp-purple-bright)" : "var(--text-subdued)";
    }
  }

  async handleAuthStateChange(user) {
    this.currentUser = user;
    if (user) {
      this.dom.authGuestBtns.style.display = "none";
      this.dom.authUserProfile.style.display = "flex";

      const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Listener";
      const initial = (displayName[0] || "U").toUpperCase();

      this.dom.userProfileName.textContent = displayName;
      this.dom.userProfileEmail.textContent = user.email || "";
      this.dom.userAvatarInitial.textContent = initial;
    } else {
      this.dom.authGuestBtns.style.display = "flex";
      this.dom.authUserProfile.style.display = "none";
      this.dom.userPopupMenu.classList.remove("open");
    }

    // Load library & settings for current user (or guest)
    await this.loadUserData(user ? user.id : "guest");
  }

  saveCurrentUserData() {
    clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => {
      const userId = this.currentUser ? this.currentUser.id : "guest";
      const payload = {
        likedTracks: Array.from(this.likedTrackIds),
        playlists: this.customPlaylists,
        customTracks: this.customTracks || [],
        settings: {
          volume: this.audioEngine.volume,
          currentEnv: this.currentEnv,
          isShuffle: this.isShuffle,
          repeatMode: this.repeatMode
        }
      };
      syncUserLibrary(userId, payload);
    }, 200);
  }

  async loadUserData(userId = "guest") {
    try {
      const data = await fetchUserLibrary(userId);
      let remoteSongs = [];
      if (userId && userId !== "guest") {
        try {
          remoteSongs = await fetchUserSongs(userId);
        } catch (e) {
          console.warn("Notice: could not query Supabase 'songs' table:", e);
        }
      }

      if (data) {
        if (Array.isArray(data.likedTracks)) {
          this.likedTrackIds = new Set(data.likedTracks);
        }
        if (Array.isArray(data.playlists)) {
          this.customPlaylists = [...data.playlists];
        }

        const localCustom = Array.isArray(data.customTracks) ? data.customTracks : [];
        if (remoteSongs && remoteSongs.length > 0) {
          // Merge deduplicating by ID or audioUrl
          const seen = new Set();
          const combined = [];
          for (const s of remoteSongs) {
            seen.add(s.id);
            if (s.audioUrl) seen.add(s.audioUrl);
            combined.push(s);
          }
          for (const s of localCustom) {
            if (!seen.has(s.id) && (!s.audioUrl || !seen.has(s.audioUrl))) {
              combined.push(s);
            }
          }
          this.customTracks = combined;
        } else {
          this.customTracks = localCustom;
        }

        // Merge custom tracks with global community catalog and default tracks
        await this.loadGlobalSongs();

        if (data.settings) {
          if (typeof data.settings.volume === "number") {
            this.audioEngine.setVolume(data.settings.volume);
            if (this.dom.volFill) {
              this.dom.volFill.style.width = `${data.settings.volume * 100}%`;
            }
          }
          if (data.settings.currentEnv) {
            this.setEnvironment(data.settings.currentEnv);
          }
          if (typeof data.settings.isShuffle === "boolean") {
            this.isShuffle = data.settings.isShuffle;
            this.dom.btnShuffle.classList.toggle("active", this.isShuffle);
          }
          if (data.settings.repeatMode) {
            this.repeatMode = data.settings.repeatMode;
            this.dom.btnRepeat.classList.toggle("active", this.repeatMode !== "off");
          }
        }
        this.updateSidebarLikedCount();
        this.renderLibraryList();
        this.renderTracksTable();
        this.renderFeaturedCarousel();
        this.renderRecentsGrid();
        this.updatePlayerUI();
      }
    } catch (err) {
      console.warn("Error loading user library:", err);
    }
  }

  async removeCustomTrack(trackId) {
    if (this.currentUser && this.currentUser.id && this.currentUser.id !== "guest") {
      try {
        await deleteSongFromSupabase(trackId, this.currentUser.id);
      } catch (err) {
        console.warn("Could not delete from Supabase songs table:", err);
      }
    }

    this.customTracks = this.customTracks.filter(t => t.id !== trackId);
    this.communityTracks = this.communityTracks.filter(t => t.id !== trackId);
    this.tracks = this.tracks.filter(t => t.id !== trackId);
    this.queue = this.queue.filter(t => t.id !== trackId);
    this.likedTrackIds.delete(trackId);

    const current = this.getCurrentTrack();
    if (current && current.id === trackId) {
      if (this.queue.length > 0) {
        this.playTrackById(this.queue[0].id);
      } else {
        this.audioEngine.pause();
      }
    }

    this.saveCurrentUserData();
    this.renderCommunityShelf();
    this.renderTracksTable();
    this.renderFeaturedCarousel();
    this.renderRecentsGrid();
    if (this.currentView === "library") {
      this.openLibraryView(this.dom.playlistHeroName.textContent || "Liked Songs");
    }
    this.showToast("Track removed from library.");
  }

  initImportModal() {
    const openModal = () => {
      this.dom.addTrackModal.classList.add("open");
      this.dom.inputMediaUrl.value = "";
      this.dom.importTypeBadge.style.display = "none";
      this.dom.importPreviewCard.style.display = "none";
      this.dom.importLoadingState.style.display = "none";
      this.dom.importAlert.style.display = "none";
      this.dom.btnSubmitImport.disabled = true;
      this.currentParsedTrack = null;
      setTimeout(() => this.dom.inputMediaUrl.focus(), 100);
    };

    const closeModal = () => {
      this.dom.addTrackModal.classList.remove("open");
      this.dom.importAlert.style.display = "none";
      this.currentParsedTrack = null;
    };

    this.dom.btnOpenImport.addEventListener("click", openModal);
    if (this.dom.pillImportLib) {
      this.dom.pillImportLib.addEventListener("click", openModal);
    }
    if (this.dom.btnQuickImportShelf) {
      this.dom.btnQuickImportShelf.addEventListener("click", openModal);
    }
    this.dom.btnCloseImportModal.addEventListener("click", closeModal);
    this.dom.btnCancelImport.addEventListener("click", closeModal);
    this.dom.addTrackModal.addEventListener("click", (e) => {
      if (e.target === this.dom.addTrackModal) closeModal();
    });

    // Real-time URL Detection & Metadata Fetch
    this.dom.inputMediaUrl.addEventListener("input", () => {
      clearTimeout(this._urlDebounceTimer);
      const val = this.dom.inputMediaUrl.value.trim();
      this.dom.importAlert.style.display = "none";

      if (!val) {
        this.dom.importTypeBadge.style.display = "none";
        this.dom.importPreviewCard.style.display = "none";
        this.dom.btnSubmitImport.disabled = true;
        return;
      }

      const detected = detectMediaUrl(val);
      if (detected.error) {
        this.dom.importTypeBadge.style.display = "none";
        this.dom.importPreviewCard.style.display = "none";
        this.dom.btnSubmitImport.disabled = true;
        return;
      }

      this.dom.importTypeBadge.textContent = detected.provider || "Audio Stream";
      this.dom.importTypeBadge.style.display = "block";
      this.dom.importLoadingState.style.display = "flex";

      this._urlDebounceTimer = setTimeout(async () => {
        try {
          const parsed = await parseMediaMetadata(val);
          this.dom.importLoadingState.style.display = "none";

          if (parsed.error) {
            this.dom.importAlert.textContent = parsed.error;
            this.dom.importAlert.style.display = "block";
            this.dom.btnSubmitImport.disabled = true;
            return;
          }

          this.currentParsedTrack = parsed;
          this.dom.importPreviewThumb.src = parsed.coverUrl;
          this.dom.importEditTitle.value = parsed.title || "Untitled Track";
          this.dom.importEditArtist.value = parsed.artist || "Unknown Artist";
          this.dom.importSourceTag.textContent = parsed.type === "youtube"
            ? `${parsed.provider} • Zero-Key Embed`
            : "Direct Audio Stream";

          this.dom.importPreviewCard.style.display = "flex";
          this.dom.btnSubmitImport.disabled = false;
        } catch (err) {
          this.dom.importLoadingState.style.display = "none";
          this.dom.importAlert.textContent = "Could not fetch metadata for that URL.";
          this.dom.importAlert.style.display = "block";
        }
      }, 350);
    });

    // Save Track to Library
    this.dom.btnSubmitImport.addEventListener("click", async () => {
      if (!this.currentParsedTrack) return;

      const title = this.dom.importEditTitle.value.trim() || this.currentParsedTrack.title || "Untitled Track";
      const artist = this.dom.importEditArtist.value.trim() || this.currentParsedTrack.artist || "Unknown Artist";
      const uploaderName = this.currentUser?.user_metadata?.full_name || 
                           this.currentUser?.email?.split("@")[0] || 
                           "Community";

      let trackId = "custom-" + Date.now();

      const newTrack = {
        id: trackId,
        title: title,
        artist: artist,
        uploaderName: uploaderName,
        album: this.currentParsedTrack.provider || "Web Stream",
        genre: "Community Drop",
        duration: 180,
        audioUrl: this.currentParsedTrack.url,
        embedUrl: this.currentParsedTrack.embedUrl || null,
        coverUrl: this.currentParsedTrack.coverUrl,
        color: "#a855f7",
        secondaryColor: "#c084fc",
        type: this.currentParsedTrack.type,
        videoId: this.currentParsedTrack.videoId || null,
        isCustom: true,
        isPublic: true
      };

      // Direct insertion to dedicated Supabase 'songs' table (Universal Community pool)
      if (isSupabaseConfigured()) {
        this.dom.btnSubmitImport.disabled = true;
        this.dom.btnSubmitImport.textContent = "Publishing to Feed...";
        try {
          const currentUserId = this.currentUser?.id || null;
          const savedRow = await saveSongToSupabase(newTrack, currentUserId, uploaderName);
          if (savedRow && savedRow.id) {
            newTrack.id = savedRow.id;
          }
        } catch (e) {
          console.warn("Could not persist to Supabase songs table:", e);
        } finally {
          this.dom.btnSubmitImport.disabled = false;
          this.dom.btnSubmitImport.textContent = "Save to Library";
        }
      }

      this.communityTracks.unshift(newTrack);
      this.customTracks.unshift(newTrack);
      this.tracks.unshift(newTrack);
      this.queue.unshift(newTrack);

      this.saveCurrentUserData();
      this.renderCommunityShelf();
      this.renderTracksTable();
      this.renderFeaturedCarousel();
      this.renderRecentsGrid();
      this.playTrackById(newTrack.id);

      closeModal();
      this.showToast(`Shared "${newTrack.title}" with the community!`);
    });
  }

  openAuthModal(mode = "login") {
    this.setAuthMode(mode);
    this.clearAuthAlert();
    this.dom.authModal.classList.add("open");
    setTimeout(() => {
      if (mode === "register" && this.dom.inputFullName) {
        this.dom.inputFullName.focus();
      } else {
        this.dom.inputEmail.focus();
      }
    }, 100);
  }

  closeAuthModal() {
    this.dom.authModal.classList.remove("open");
    this.clearAuthAlert();
  }

  setAuthMode(mode) {
    this.authMode = mode;
    this.clearAuthAlert();
    if (mode === "register") {
      this.dom.tabBtnRegister.classList.add("active");
      this.dom.tabBtnLogin.classList.remove("active");
      this.dom.groupFullName.style.display = "flex";
      this.dom.authSubmitText.textContent = "Create Account";
    } else {
      this.dom.tabBtnLogin.classList.add("active");
      this.dom.tabBtnRegister.classList.remove("active");
      this.dom.groupFullName.style.display = "none";
      this.dom.authSubmitText.textContent = "Log In";
    }
  }

  showAuthAlert(message, type = "error") {
    this.dom.authAlert.className = `auth-alert ${type}`;
    this.dom.authAlert.textContent = message;
    this.dom.authAlert.style.display = "block";
  }

  clearAuthAlert() {
    this.dom.authAlert.style.display = "none";
    this.dom.authAlert.textContent = "";
  }

  setAuthLoading(isLoading) {
    this.dom.btnAuthSubmit.disabled = isLoading;
    this.dom.authSpinner.style.display = isLoading ? "block" : "none";
    this.dom.authSubmitText.style.display = isLoading ? "none" : "block";
  }

  async handleAuthSubmit(e) {
    e.preventDefault();
    this.clearAuthAlert();

    const email = this.dom.inputEmail.value.trim();
    const password = this.dom.inputPassword.value.trim();
    const fullName = this.dom.inputFullName ? this.dom.inputFullName.value.trim() : "";

    if (!email || !password) {
      this.showAuthAlert("Please fill in both email and password.");
      return;
    }

    this.setAuthLoading(true);

    try {
      if (this.authMode === "register") {
        const result = await signUpUser({ email, password, fullName });
        this.setAuthLoading(false);

        if (result.user && !result.session) {
          this.showAuthAlert("Account created! Please check your email inbox to confirm your account.", "success");
        } else {
          this.showToast(`Welcome to Usik, ${fullName || email.split("@")[0]}!`);
          this.closeAuthModal();
        }
      } else {
        const result = await signInUser({ email, password });
        this.setAuthLoading(false);
        const name = result.user?.user_metadata?.full_name || email.split("@")[0];
        this.showToast(`Welcome back, ${name}!`);
        this.closeAuthModal();
      }
    } catch (err) {
      this.setAuthLoading(false);
      this.showAuthAlert(err.message || "Authentication failed. Please check your credentials.");
    }
  }

  openSupabaseConfigModal() {
    const config = getSupabaseConfig();
    this.dom.inputSupabaseUrl.value = config.url || "";
    this.dom.inputSupabaseKey.value = config.anonKey || "";
    this.dom.supabaseConfigModal.classList.add("open");
    setTimeout(() => this.dom.inputSupabaseUrl.focus(), 100);
  }

  closeSupabaseConfigModal() {
    this.dom.supabaseConfigModal.classList.remove("open");
  }

  saveSupabaseSettings() {
    const url = this.dom.inputSupabaseUrl.value.trim();
    const key = this.dom.inputSupabaseKey.value.trim();

    saveSupabaseConfig(url, key);
    this.updateSupabaseStatus();
    this.closeSupabaseConfigModal();

    if (isSupabaseConfigured()) {
      this.showToast("Supabase configuration saved & connected!");
    } else {
      this.showToast("Saved! Switched to Demo Mode.");
    }
  }

  bindKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          this.dom.btnPlayPause.click();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            this.playNextTrack();
          } else {
            const track = this.getCurrentTrack();
            if (track && track.type === "youtube") {
              const target = Math.min((this.ytDuration || 180), (this.ytCurrentTime || 0) + 5);
              if (this.ytPlayer && typeof this.ytPlayer.seekTo === "function") {
                this.ytPlayer.seekTo(target, true);
              }
              this.updateProgress(target, this.ytDuration || 180);
            } else {
              this.audioEngine.seek((this.audioEngine.audioElement.currentTime || 0) + 5);
            }
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) {
            this.playPrevTrack();
          } else {
            const track = this.getCurrentTrack();
            if (track && track.type === "youtube") {
              const target = Math.max(0, (this.ytCurrentTime || 0) - 5);
              if (this.ytPlayer && typeof this.ytPlayer.seekTo === "function") {
                this.ytPlayer.seekTo(target, true);
              }
              this.updateProgress(target, this.ytDuration || 180);
            } else {
              this.audioEngine.seek((this.audioEngine.audioElement.currentTime || 0) - 5);
            }
          }
          break;
        case "KeyM":
          this.dom.btnVolumeMute.click();
          break;
        case "KeyL":
          const track = this.getCurrentTrack();
          if (track) this.toggleLike(track.id);
          break;
        case "KeyS":
          this.dom.btnShuffle.click();
          break;
      }
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new UsikSpotifyApp();
});
