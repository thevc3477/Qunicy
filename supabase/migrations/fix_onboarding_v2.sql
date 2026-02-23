-- Migration: Fix onboarding for 5-step flow
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Fix music_identity constraint to allow new values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS music_identity_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT music_identity_check 
  CHECK (
    music_identity IS NULL OR 
    music_identity IN (
      'casual_listener',
      'vinyl_collector', 
      'vinyl_dj',
      'live_music_lover',
      'music_explorer',
      'crate_digger',
      'serious_collector'
    )
  );

-- 3. Add image_url column to vinyl_records (code uses image_url, not image_path)
ALTER TABLE public.vinyl_records 
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Make vinyl_records work without event_id (onboarding uploads don't have an event)
ALTER TABLE public.vinyl_records 
  ALTER COLUMN event_id DROP NOT NULL;

-- 5. Make typed_artist and typed_album nullable (onboarding doesn't collect these)
ALTER TABLE public.vinyl_records 
  ALTER COLUMN typed_artist DROP NOT NULL;
ALTER TABLE public.vinyl_records 
  ALTER COLUMN typed_album DROP NOT NULL;

-- 6. Ensure RLS allows vinyl_records insert/select for own user
DROP POLICY IF EXISTS "Users can insert own vinyl records" ON public.vinyl_records;
CREATE POLICY "Users can insert own vinyl records" 
  ON public.vinyl_records 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own vinyl records" ON public.vinyl_records;
CREATE POLICY "Users can view own vinyl records" 
  ON public.vinyl_records 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow viewing other users' records (for the vinyl wall / people pages)
DROP POLICY IF EXISTS "Users can view all vinyl records" ON public.vinyl_records;
CREATE POLICY "Users can view all vinyl records" 
  ON public.vinyl_records 
  FOR SELECT 
  USING (true);

-- 7. Allow users to view other profiles (for people/matching pages)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (true);
