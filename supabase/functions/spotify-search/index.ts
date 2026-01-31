// Supabase Edge Function for Spotify album search
// This keeps client secrets secure on the server side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface SpotifyAlbum {
  id: string
  name: string
  artists: Array<{ name: string }>
  images: Array<{ url: string }>
}

interface SpotifySearchResponse {
  albums: {
    items: SpotifyAlbum[]
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get query parameter
    const url = new URL(req.url)
    const query = url.searchParams.get('q')

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "q" must be at least 2 characters' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get Spotify credentials from Supabase secrets
    const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')
    const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      console.error('Spotify credentials not configured in Supabase secrets')
      return new Response(
        JSON.stringify({ error: 'Spotify API not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get Spotify access token using Client Credentials flow
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
      },
      body: 'grant_type=client_credentials'
    })

    if (!tokenResponse.ok) {
      console.error('Failed to get Spotify token:', await tokenResponse.text())
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Spotify' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const tokenData: SpotifyTokenResponse = await tokenResponse.json()

    // Search Spotify for albums
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      }
    )

    if (!searchResponse.ok) {
      console.error('Spotify search failed:', await searchResponse.text())
      return new Response(
        JSON.stringify({ error: 'Spotify search failed' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const searchData: SpotifySearchResponse = await searchResponse.json()

    // Simplify the response to only what we need
    const albums = searchData.albums.items.map(album => ({
      id: album.id,
      name: album.name,
      artist: album.artists[0]?.name || 'Unknown Artist',
      imageUrl: album.images[0]?.url || ''
    }))

    return new Response(
      JSON.stringify(albums),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in spotify-search function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
