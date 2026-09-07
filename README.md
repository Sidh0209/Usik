# 🎵 Usik - Spotify-Inspired Music Streaming App

A modern, high-performance web music streaming application built with **Vanilla JavaScript**, **Vite**, **HTML5 Audio / Web Audio API**, and **Supabase**.

Featuring Spotify's desktop design language, macOS spring animations, a purple aesthetic, and real-time cloud data persistence for Liked Songs, Custom Playlists, and Player Settings.

---

## ✨ Features

- 🎧 **Music Playback & Streaming**: Smooth audio playback, scrubber seeking, volume controls, mute toggle, shuffle, and repeat modes.
- ⚡ **Zero-Lag Architecture**: Lightweight DOM rendering, hardware-accelerated CSS, and 60-120fps fluid macOS animations.
- 💜 **Purple Theme**: Modern dark aesthetic with electric purple accents (`#a855f7` & `#c084fc`) and ambient album art glow.
- 🔐 **Supabase Authentication**:
  - Sign Up and Log In with email and password.
  - User avatar and account dropdown menu.
  - Interactive Demo Mode if keys are not yet configured.
- 💾 **Per-User Library Persistence**:
  - Liked tracks and custom playlists saved per user.
  - Settings (volume, atmosphere theme, repeat, shuffle) remembered across sessions.
  - Dual-tier: local fallback + cloud sync via Supabase.
- 📜 **Interactive Lyrics & Queue Drawers**: Smooth slide-in sheets inspired by macOS.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## 🗄️ Supabase Setup

### Step 1: Create a Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **Project Settings** -> **API**, copy your **Project URL** and **Public Anon Key**.

### Step 2: Configure Keys
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
*(Or configure them directly inside the app: click **Log In** -> **Configure API Keys**)*.

### Step 3: Run SQL Migration
In your Supabase Dashboard, open the **SQL Editor** and run the contents of [`schema.sql`](./schema.sql) to create the `user_library` table with Row Level Security (RLS) policies.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Vanilla CSS with CSS custom properties), JavaScript (ES Modules)
- **Audio Engine**: Web Audio API + HTML5 Audio Element with generative ambient fallback
- **Backend & Auth**: Supabase Auth (`@supabase/supabase-js`) & PostgreSQL with RLS
- **Bundler / Dev Server**: Vite

---

## 📄 License
MIT License
