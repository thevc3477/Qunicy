# Spotify Integration - Security Implementation

## Overview

This document explains how Spotify album search is securely integrated into the Quincy app using Supabase Edge Functions.

## Architecture

```
Frontend (Onboarding.jsx)
    ↓
    Calls Supabase Edge Function
    ↓
Edge Function (spotify-search)
    ↓
    Uses stored secrets to authenticate with Spotify
    ↓
Spotify Web API
    ↓
    Returns album data
    ↓
Edge Function
    ↓
    Simplifies and returns data
    ↓
Frontend displays results
```

## Security Model

### ✅ What We DO

1. **Store secrets server-side**
   - Spotify Client ID and Client Secret are stored in Supabase Edge Function secrets
   - Never exposed to the frontend/client

2. **Use Client Credentials flow**
   - App-level authentication only (no user OAuth required)
   - No redirect URIs needed
   - Simpler and more secure for this use case

3. **Sanitize responses**
   - Edge Function only returns necessary data (id, name, artist, imageUrl)
   - Removes unnecessary Spotify metadata

4. **Proper authentication**
   - Frontend passes user session token to Edge Function
   - Edge Function validates request
   - CORS headers properly configured

### ❌ What We DON'T DO

1. **Expose secrets in frontend**
   - NO `VITE_SPOTIFY_CLIENT_SECRET` in `.env`
   - NO direct Spotify API calls from browser

2. **Use Spotify OAuth login**
   - We don't need user Spotify accounts
   - We only search public album data
   - Client Credentials flow is sufficient

3. **Commit secrets to Git**
   - `.env` files are gitignored
   - `.env.example` contains NO actual secrets
   - Secrets only live in Supabase Edge Function environment

## Implementation Details

### Frontend Code (src/pages/Onboarding.jsx)

```javascript
// Search albums using Supabase Edge Function
const searchAlbums = async (query) => {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    `${supabaseUrl}/functions/v1/spotify-search?q=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
        'Content-Type': 'application/json',
      }
    }
  )

  const albums = await response.json()
  // Display results...
}
```

### Edge Function (supabase/functions/spotify-search/index.ts)

```typescript
// Get secrets from Supabase environment
const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')

// Authenticate with Spotify using Client Credentials
const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
  },
  body: 'grant_type=client_credentials'
})

// Search Spotify API
const searchResponse = await fetch(
  `https://api.spotify.com/v1/search?q=${query}&type=album&limit=10`,
  {
    headers: { 'Authorization': `Bearer ${access_token}` }
  }
)

// Return simplified results
return albums.map(album => ({
  id: album.id,
  name: album.name,
  artist: album.artists[0]?.name,
  imageUrl: album.images[0]?.url
}))
```

## Authentication Flow

### User Onboarding
1. User completes signup → redirects to `/onboarding`
2. User types album name in search box
3. Frontend calls Supabase Edge Function with query
4. Edge Function authenticates with Spotify
5. Edge Function searches albums
6. Results displayed to user
7. User selects 3 albums
8. "Complete Setup" button checks session:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession()
   if (!session?.user) {
     alert('You must be logged in')
     return
   }
   ```
9. Saves to `profiles` table using `session.user.id`

### Why getSession() instead of getUser()?

```javascript
// ❌ OLD (buggy)
const { data: { user } } = await supabase.auth.getUser()

// ✅ NEW (correct)
const { data: { session } } = await supabase.auth.getSession()
```

**Reason**: `getSession()` checks if a valid session exists locally, which is faster and more reliable for client-side auth checks. `getUser()` makes a network request and can have timing issues.

## Setup Checklist

- [ ] Spotify app created at https://developer.spotify.com/dashboard
- [ ] Client ID and Client Secret copied
- [ ] Secrets added to Supabase: `supabase secrets set SPOTIFY_CLIENT_ID=...`
- [ ] Secrets added to Supabase: `supabase secrets set SPOTIFY_CLIENT_SECRET=...`
- [ ] Edge Function deployed: `supabase functions deploy spotify-search`
- [ ] Frontend environment variables set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] `.env` file gitignored
- [ ] Tested album search functionality

## Testing

### Test Edge Function Directly

```bash
# Replace with your Supabase project URL
curl "https://YOUR_PROJECT.supabase.co/functions/v1/spotify-search?q=thriller"
```

Expected response:
```json
[
  {
    "id": "2ANVost0y2y52ema1E9xAZ",
    "name": "Thriller",
    "artist": "Michael Jackson",
    "imageUrl": "https://i.scdn.co/image/..."
  }
]
```

### Test in App

1. Navigate to `/onboarding`
2. Type "thriller" in album search
3. Should see "Thriller - Michael Jackson" in dropdown
4. Select it
5. Repeat for 2 more albums
6. Click "Complete Setup"
7. Should redirect to `/` with profile saved

## Troubleshooting

### "Spotify API not configured" error
- Check secrets are set: `supabase secrets list`
- Re-deploy function: `supabase functions deploy spotify-search`

### No search results
- Check Edge Function logs: `supabase functions logs spotify-search`
- Verify Spotify credentials are valid
- Test credentials manually (see DEPLOYMENT.md)

### "You must be logged in" error
- User session expired - need to log in again
- Check Supabase auth in browser DevTools → Application → Local Storage

### CORS errors
- Edge Function includes CORS headers
- Check browser console for specific error
- Verify `supabaseUrl` in frontend is correct

## Best Practices

1. **Never log secrets** - Don't console.log credentials
2. **Use environment-specific secrets** - Different credentials for dev/prod
3. **Monitor Edge Function usage** - Check logs for errors
4. **Rate limiting** - Spotify has rate limits (handled automatically via token refresh)
5. **Error handling** - Always handle fetch errors gracefully

## Future Enhancements

Potential improvements:
- Cache Spotify access token (valid for 1 hour)
- Add album cover images to UI
- Fuzzy search matching
- Search history/recent searches
- Popular albums suggestions
