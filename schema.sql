-- ==============================================================================
-- Usik Music App - Supabase Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Table for Global Songs Catalog (YouTube, YT Music & Audio Streams)
CREATE TABLE IF NOT EXISTS public.songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    uploader_name TEXT DEFAULT 'Community',
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    url TEXT NOT NULL,
    embed_url TEXT,
    cover_url TEXT,
    provider TEXT NOT NULL DEFAULT 'youtube', -- 'youtube' | 'audio'
    duration INTEGER DEFAULT 180,
    genre TEXT DEFAULT 'Custom',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration helper if table already exists without uploader_name
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS uploader_name TEXT DEFAULT 'Community';

-- Index for fast user queries & feed ordering
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON public.songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON public.songs(created_at DESC);

-- Enable RLS on songs
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for songs table
-- UNIVERSAL SHARING: Every user (authenticated or anonymous/guest) can view and play all songs!
DROP POLICY IF EXISTS "Anyone can view all songs" ON public.songs;
DROP POLICY IF EXISTS "Users can view their own songs" ON public.songs;
CREATE POLICY "Anyone can view all songs"
    ON public.songs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can insert songs" ON public.songs;
CREATE POLICY "Users can insert songs"
    ON public.songs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own songs" ON public.songs;
CREATE POLICY "Users can update their own songs"
    ON public.songs FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own songs" ON public.songs;
CREATE POLICY "Users can delete their own songs"
    ON public.songs FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Table for User Library State & Player Preferences
CREATE TABLE IF NOT EXISTS public.user_library (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    liked_tracks JSONB DEFAULT '[]'::jsonb,
    playlists JSONB DEFAULT '[]'::jsonb,
    custom_tracks JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{"volume": 0.85, "currentEnv": "cosmic", "isShuffle": false, "repeatMode": "off"}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_library
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own library" ON public.user_library;
CREATE POLICY "Users can read their own library"
    ON public.user_library FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own library" ON public.user_library;
CREATE POLICY "Users can insert their own library"
    ON public.user_library FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own library" ON public.user_library;
CREATE POLICY "Users can update their own library"
    ON public.user_library FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. Enable Realtime updates (Multi-device instant synchronization)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.songs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_library;
  END IF;
END $$;
