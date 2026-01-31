-- Migration: Add onboarding fields to profiles table
-- Run this in your Supabase SQL Editor

-- 1. Add onboarding tracking fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- 2. Add music taste / personalization fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS music_identity TEXT,
  ADD COLUMN IF NOT EXISTS event_intent TEXT;

-- Note: top_genres should already exist as TEXT[] or JSONB
-- If it doesn't exist, uncomment:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS top_genres JSONB;

-- 3. Add check constraints for valid values (optional but recommended)

-- music_identity must be one of the valid options
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS music_identity_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT music_identity_check 
  CHECK (
    music_identity IS NULL OR 
    music_identity IN (
      'casual_listener',
      'vinyl_collector', 
      'vinyl_dj',
      'live_music_lover',
      'music_explorer'
    )
  );

-- event_intent must be one of the valid options
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS event_intent_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT event_intent_check 
  CHECK (
    event_intent IS NULL OR 
    event_intent IN (
      'discovering_music',
      'meeting_people',
      'dancing',
      'chilling',
      'supporting_artists'
    )
  );

-- 4. Ensure RLS policies allow profile updates
-- (These may already exist from previous migrations)

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 5. Add comments for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Current/last completed onboarding step (0-3)';
COMMENT ON COLUMN public.profiles.music_identity IS 'Q1: What best describes you (casual_listener, vinyl_collector, etc)';
COMMENT ON COLUMN public.profiles.top_genres IS 'Q2: Up to 3 favorite genres';
COMMENT ON COLUMN public.profiles.event_intent IS 'Q3: What brings you to music events';

-- ============================================
-- VERIFICATION: Run these to check the migration worked
-- ============================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND table_schema = 'public'
-- ORDER BY ordinal_position;
-- ============================================
