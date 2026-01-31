# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev      # Start Vite dev server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
```

### Supabase Edge Functions

```bash
supabase functions deploy spotify-search  # Deploy the Spotify search function
supabase functions serve spotify-search   # Serve locally for testing
supabase functions logs spotify-search    # View function logs
supabase secrets list                     # List configured secrets
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + Vite + React Router v7
- **Backend**: Supabase (Auth, Database, Storage, Edge Functions)
- **External API**: Spotify Web API (via Edge Function)

### Application Flow
The app follows a gated flow for vinyl collector events:
1. **Event** (public) → User sees event details
2. **Login/Signup** → User authenticates via Supabase Auth
3. **RSVP** → User confirms attendance
4. **Upload Record** → User uploads vinyl record photo
5. **People/Chat** → User can view other attendees and chat

Route protection is implemented via three guard components in `App.jsx`:
- `RequireAuth` - checks `quincy_logged_in` localStorage flag
- `RequireRSVP` - requires auth + `quincy_rsvp` flag
- `RequireVinyl` - requires auth + RSVP + `quincy_uploaded_record` flag

### Key Directories
- `src/pages/` - Route components (Home, Event, Records, People, etc.)
- `src/components/` - Shared components (AppShell, Header, BottomNav, VinylRecordUpload)
- `src/lib/` - Utilities (supabase client, vinylRecordUpload helpers)
- `supabase/functions/` - Deno Edge Functions

### Spotify Integration
Album search uses a Supabase Edge Function (`supabase/functions/spotify-search/`) to keep Spotify credentials server-side. The function uses Client Credentials flow (no user OAuth needed). Frontend calls the function via the Supabase URL.

### Database Tables
- `profiles` - User profiles with `top_albums` (TEXT[]) and `top_genres` (TEXT[])
- Row Level Security enabled - users can only access their own data

### Storage
- `records` bucket (private) - Vinyl record images
- Path format: `event_id/user_id/record_id.ext`
- Uses signed URLs for access

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Spotify credentials must be set as Supabase secrets (never in frontend env):
```bash
supabase secrets set SPOTIFY_CLIENT_ID=...
supabase secrets set SPOTIFY_CLIENT_SECRET=...
```
