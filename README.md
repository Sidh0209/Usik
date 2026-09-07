# 🎵 Usik - Spotify-Inspired Spatial Music Streaming App

A modern, high-performance web music streaming platform built with **Vanilla JavaScript**, **Vite**, **HTML5 Audio / Web Audio API**, **YouTube Stream Engine**, and **Supabase**.

Featuring Spotify's desktop design language, macOS spring animations, vibrant ambient lighting, an expansive **Bollywood & Hollywood** streaming catalog, **AI Vibe Flow**, and **real-time cloud database synchronization**.

---

## ✨ Key Features

### 🎬 Expansive Bollywood & Hollywood Music Catalog
- **18+ Bollywood Blockbusters**: Arijit Singh (*Tum Hi Ho*, *Kesariya*, *Channa Mereya*, *Apna Bana Le*, *Hawayein*), A.R. Rahman (*Kun Faya Kun*, *Agar Tum Saath Ho*), Sonu Nigam (*Kal Ho Naa Ho*), Atif Aslam (*Dil Diyan Gallan*), Jubin Nautiyal, Vishal Mishra (*Naacho Naacho*), and more.
- **22+ Hollywood & Global Chartbusters**: The Weeknd (*Blinding Lights*, *Starboy*), Ed Sheeran (*Shape of You*, *Perfect*), Dua Lipa (*Levitating*), Billie Eilish (*Bad Guy*, *Lovely*), Adele (*Someone Like You*), Coldplay (*Viva La Vida*), Imagine Dragons (*Believer*), Post Malone (*Sunflower*, *Circles*), Eminem (*Lose Yourself*), Hans Zimmer (*Interstellar Theme*), Taylor Swift, Queen, and more.
- **Spatial Audio Originals**: Atmospheric Lo-Fi, Synthwave, Cyberpunk, and deep space ambient streams.

### 🌊 Smart "Vibe Flow" Recommendation Engine
- Automatically computes acoustic and lyrical affinity between songs.
- When you pick a track with **Vibe Flow** toggled on, Usik continuously queues and transitions to songs sharing the same emotional vibe (e.g. *Bollywood Anthems*, *Romance & Soul*, *High Voltage*, *Deep Focus*, *Chillout & Lo-Fi*).

### 📺 Dual-Engine Stream Architecture
- **Web Audio API + HTML5 Audio**: High-fidelity spatial 3D audio panning with reverb and binaural positioning.
- **Zero-Key YouTube Stream Player**: Streams audio directly from verified YouTube video IDs without requiring local MP3 files or third-party proxy servers.
- Seamless synchronized play/pause across card plays, table rows, hero buttons, and keyboard controls.

### ☁️ Supabase Cloud Database & Universal Access
- **Universal Public Read**: Every device and user (guest or signed-in) immediately accesses all catalog and community songs.
- **Cross-Device Visibility**: Any track you import or upload is saved to the Supabase cloud (`public.songs`) and appears instantaneously on all other devices.
- **Real-Time Live Feed**: Subscribes to Supabase Realtime so new drops appear live without page refreshes.
- **Built-In Production Fallbacks**: Connects automatically out-of-the-box even without a `.env` file.

### 🎨 Visual & Audio Experience
- **Dynamic Ambient Theme**: Background glow dynamically inherits primary and secondary colors of the active album art.
- **4 Spatial Environments**: Cosmic Nebula, Cyber Void, Aurora Glow, and Glass Solarium.
- **Synced Lyrics Drawer**: Sing along with synchronized lyrical lines.
- **Queue Manager**: Reorder and inspect your upcoming vibe queue.
- **Bento Discovery Cards & Genre Filters**: Jump straight into curated genres (Bollywood, Hollywood & Pop, Romance, High Voltage, Lo-Fi, Deep Focus).

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Sidh0209/Usik.git
cd Usik
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in `dist/`.

---

## 🗄️ Database & Supabase Configuration

Usik includes out-of-the-box fallback credentials for immediate cloud sync. If you want to connect your own Supabase instance:

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL script from [`schema.sql`](./schema.sql) in your **Supabase SQL Editor**.
3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```
*(Or configure them directly inside the UI: click **Log In** -> **Configure API Keys**)*.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| **Space** | Play / Pause |
| **Right Arrow** | Seek forward 5s |
| **Left Arrow** | Seek backward 5s |
| **Shift + Right Arrow** | Next track |
| **Shift + Left Arrow** | Previous track |
| **L** | Like / Unlike track |
| **S** | Toggle Shuffle |
| **M** | Toggle Mute |

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Vanilla HTML5, modern CSS3 (Custom Properties & Glassmorphism), JavaScript (ES Modules).
- **Audio Engines**:
  - Web Audio API (Spatial 3D Audio Panner & Gain nodes)
  - YouTube IFrame Player API
- **Cloud & Realtime**: Supabase (`@supabase/supabase-js`, PostgreSQL with RLS, Supabase Realtime).
- **Tooling**: Vite.

---

## 📄 License

MIT License © 2026 Usik Team
