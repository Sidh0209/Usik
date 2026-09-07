-- ==============================================================================
-- Usik Music App - User Library & Settings Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Create table for user libraries & preferences
CREATE TABLE IF NOT EXISTS public.user_library (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    liked_tracks JSONB DEFAULT '[]'::jsonb,
    playlists JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{"volume": 0.85, "currentEnv": "cosmic", "isShuffle": false, "repeatMode": "off"}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_library ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies so users can only access and update their own data
DROP POLICY IF EXISTS "Users can read their own library" ON public.user_library;
CREATE POLICY "Users can read their own library"
    ON public.user_library
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own library" ON public.user_library;
CREATE POLICY "Users can insert their own library"
    ON public.user_library
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own library" ON public.user_library;
CREATE POLICY "Users can update their own library"
    ON public.user_library
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Enable Realtime updates (Optional, for instant multi-device sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_library;
