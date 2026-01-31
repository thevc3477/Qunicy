-- Migration: Add unique username constraint (case-insensitive)
-- The user already added: phone_e164, phone_verified (default false), phone_verified_at
-- This migration adds the username uniqueness constraint and index

-- Run this in your Supabase SQL Editor

-- 1. Add username column if not exists (may already exist as display_name)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Create unique case-insensitive index on username
-- This prevents duplicate usernames regardless of case
DROP INDEX IF EXISTS profiles_username_unique_idx;
CREATE UNIQUE INDEX profiles_username_unique_idx 
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 3. Add check constraint for username format (optional but recommended)
-- Alphanumeric + underscores only, 3-20 chars
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS username_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT username_format_check 
  CHECK (
    username IS NULL OR 
    (
      LENGTH(username) >= 3 
      AND LENGTH(username) <= 20 
      AND username ~ '^[a-z0-9_]+$'
    )
  );

-- 4. Ensure RLS policies allow profile operations
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (onboarding)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 5. Optional: Index on phone_e164 for faster lookups (if using phone later)
CREATE INDEX IF NOT EXISTS profiles_phone_e164_idx 
  ON public.profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;

-- 6. Comments for documentation
COMMENT ON COLUMN public.profiles.username IS 'Unique username (case-insensitive), required after onboarding';
COMMENT ON COLUMN public.profiles.phone_e164 IS 'Phone number in E.164 format (e.g., +15551234567)';
COMMENT ON COLUMN public.profiles.phone_verified IS 'Whether the phone number has been verified via SMS';
COMMENT ON COLUMN public.profiles.phone_verified_at IS 'Timestamp when phone was verified';

-- ============================================
-- HELPER: Check for phone verification (use in app logic)
-- ============================================
-- Example query to check if phone is verified:
-- SELECT phone_verified FROM profiles WHERE id = auth.uid();
--
-- In your app, gate phone-required features like this:
-- if (profile.phone_verified === true) { /* allow feature */ }
-- ============================================
