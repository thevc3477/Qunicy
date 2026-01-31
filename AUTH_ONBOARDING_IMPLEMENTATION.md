# Auth + Onboarding Implementation

## Overview
- **Auth Method**: Email/Password + Magic Link
- **Onboarding**: 3-step personalized taste collection
- **Phone Verification**: Ready but not enforced (coming later)

---

## Auth Flow (`/auth`)

### Features
1. **Email/Password** - Sign in or create account
2. **Magic Link** - Passwordless email login
3. **Forgot Password** - Email-based reset
4. **"Sign up for free"** - Prominent signup banner on login

### First-Time User Detection
After successful auth, the system checks:
- `onboarding_completed === true` → Go to `/home`
- `onboarding_completed === false` (or missing) → Go to `/onboarding`

### Profile Auto-Creation
If no profile row exists for the user, one is created automatically on first login.

---

## Onboarding Flow (`/onboarding`)

### UI Design
- **Header**: "Personalized Onboarding"
- **Progress Bar**: "Step X of 3" + percentage (33%, 66%, 100%)
- **Card-based**: Modern, mobile-friendly layout
- **Navigation**: Back/Next buttons, Next disabled until answer selected

### Questions (3 total)

**Q1: Music Identity** (single select)
- Casual listener
- Vinyl collector
- Vinyl DJ
- Live-music lover
- Music explorer

**Q2: Top Genres** (multi select, max 3)
- House, Techno, Jazz, Soul/Funk, Hip-Hop
- R&B, Afrobeat, Latin, Rock, Electronic

**Q3: Event Intent** (single select)
- Discovering new music
- Meeting people
- Dancing / high energy
- Chilling / vibing
- Supporting artists

### On Submit
Saves to `profiles` table:
- `music_identity` - Q1 answer
- `top_genres` - Q2 answers (JSONB array)
- `event_intent` - Q3 answer
- `onboarding_completed = true`
- `onboarding_step = 3`

Then redirects to `/home`.

---

## Data Model

### profiles table fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | UUID | - | auth.uid() |
| `onboarding_completed` | BOOLEAN | false | Has user finished onboarding? |
| `onboarding_step` | INTEGER | 0 | Last completed step (0-3) |
| `music_identity` | TEXT | null | Q1: What describes you |
| `top_genres` | JSONB | null | Q2: Favorite genres (array) |
| `event_intent` | TEXT | null | Q3: Why you attend events |
| `phone_e164` | TEXT | null | Phone in E.164 format |
| `phone_verified` | BOOLEAN | false | Phone verified via SMS? |
| `phone_verified_at` | TIMESTAMP | null | When phone was verified |

---

## Setup Checklist

### Step 1: Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- supabase/migrations/add_onboarding_fields.sql
```

### Step 2: Test the Flow
1. `npm run dev`
2. Go to `/auth` → Sign up with email
3. Complete 3-step onboarding
4. Verify redirect to `/home`
5. Test that returning users skip onboarding

---

## Route Guards

| Guard | Checks | Redirects to |
|-------|--------|--------------|
| `RequireAuth` | Is user logged in? | `/auth` |
| `RequireOnboarding` | Is `onboarding_completed = true`? | `/onboarding` |
| `RequireVinyl` | Auth + RSVP + uploaded record | Various |

---

## File Summary

| File | Purpose |
|------|---------|
| `src/pages/Auth.jsx` | Email/password + magic link auth |
| `src/pages/NewOnboarding.jsx` | 3-step personalized onboarding |
| `src/App.jsx` | Route guards & first-time user detection |
| `supabase/migrations/add_onboarding_fields.sql` | Database schema |

---

## Phone Verification (FUTURE)

Fields are already in place:
- `phone_e164` - Stored during optional phone collection
- `phone_verified = false` - Default, not enforced
- `phone_verified_at` - Set when verified

**To enable later:**
1. Set up Twilio in Supabase
2. Add phone verification UI in Settings
3. Gate features with: `if (profile.phone_verified === true)`

---

## Testing Checklist

- [ ] New user sign up → Redirects to onboarding
- [ ] Complete all 3 questions → Progress bar updates
- [ ] Back button works between steps
- [ ] Next button disabled until selection made
- [ ] Final submit saves all data
- [ ] Returning user → Skips onboarding, goes to home
- [ ] Magic link login works
- [ ] Forgot password sends email
