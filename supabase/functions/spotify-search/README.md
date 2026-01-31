# Spotify Search Edge Function

This Supabase Edge Function provides secure album search functionality using Spotify's API.

## Why Use an Edge Function?

- **Security**: Spotify API credentials are stored securely on the server, never exposed to the client
- **No User Login Required**: Uses Spotify's Client Credentials flow (app-level authentication only)
- **Simple Integration**: Frontend just calls `/functions/v1/spotify-search?q=query`

## Setup Instructions

### 1. Get Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app (or use existing)
3. Copy your **Client ID** and **Client Secret**
4. **Important**: NO redirect URIs needed (we use Client Credentials flow, not user OAuth)

### 2. Set Up Supabase Secrets

**Option A: Using Supabase CLI**
```bash
supabase secrets set SPOTIFY_CLIENT_ID=your_client_id_here
supabase secrets set SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

**Option B: Using Supabase Dashboard**
1. Go to your project in Supabase Dashboard
2. Navigate to **Project Settings** > **Edge Functions** > **Secrets**
3. Add two secrets:
   - `SPOTIFY_CLIENT_ID`: your Spotify Client ID
   - `SPOTIFY_CLIENT_SECRET`: your Spotify Client Secret

### 3. Deploy the Edge Function

```bash
# Make sure you're in the project root directory
supabase functions deploy spotify-search
```

### 4. Test the Function

```bash
# Replace YOUR_PROJECT_URL with your actual Supabase project URL
curl "https://YOUR_PROJECT_URL.supabase.co/functions/v1/spotify-search?q=thriller"
```

## API Reference

### Endpoint
```
GET /functions/v1/spotify-search
```

### Query Parameters
- `q` (required): Search query (minimum 2 characters)

### Response Format
Returns a JSON array of albums:
```json
[
  {
    "id": "spotify-album-id",
    "name": "Album Name",
    "artist": "Artist Name",
    "imageUrl": "https://i.scdn.co/image/..."
  }
]
```

### Error Responses
- `400`: Invalid query parameter
- `500`: Spotify API error or missing credentials

## Security Notes

- **Never commit secrets to Git**: Credentials are stored in Supabase, not in `.env` files
- **Client Credentials Flow**: This uses app-level authentication (no user login required)
- **CORS**: Configured to allow requests from your frontend
- **Rate Limiting**: Subject to Spotify's API rate limits (handled automatically via token refresh)

## Local Development

To test locally with Supabase CLI:

```bash
# Set local secrets
supabase secrets set SPOTIFY_CLIENT_ID=your_id --env-file .env.local
supabase secrets set SPOTIFY_CLIENT_SECRET=your_secret --env-file .env.local

# Serve functions locally
supabase functions serve spotify-search
```

## Troubleshooting

**Function returns 500 error**
- Check that secrets are set: `supabase secrets list`
- Verify Spotify credentials are valid
- Check function logs: `supabase functions logs spotify-search`

**CORS errors**
- Function includes CORS headers for all origins (`*`)
- Check browser console for specific CORS issues

**Empty results**
- Verify query is at least 2 characters
- Check Spotify API status
- Test with a common album name (e.g., "thriller")
