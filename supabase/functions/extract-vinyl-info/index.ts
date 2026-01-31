// Supabase Edge Function to extract vinyl record info using OpenAI Vision
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { image } = body

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check API key
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('API Key exists, length:', apiKey.length)
    console.log('Image data length:', image.length)

    // Call OpenAI Vision API
    let openaiResponse
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'You are analyzing a vinyl record album cover. Extract the album name and artist name. Return ONLY a JSON object with this exact format: {"album": "album name here", "artist": "artist name here"}. If you cannot clearly read the text, make your best guess based on the image.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: image,
                    detail: 'low'
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        })
      })
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: 'Failed to reach OpenAI API',
          details: e.message || String(e)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const responseText = await openaiResponse.text()
    console.log('OpenAI response status:', openaiResponse.status)
    console.log('OpenAI response:', responseText.substring(0, 500))

    if (!openaiResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error',
          details: responseText,
          status: openaiResponse.status 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API returned non-JSON',
          details: responseText.substring(0, 500)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (data?.error) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API error',
          details: data.error
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = data?.choices?.[0]?.message?.content
    if (!aiResponse) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API returned unexpected shape',
          details: data
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the JSON response from AI
    let extractedData
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim()
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7)
      }
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3)
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3)
      }
      cleanedResponse = cleanedResponse.trim()
      
      extractedData = JSON.parse(cleanedResponse)
    } catch (e) {
      // If it's not valid JSON, try to extract from text
      const albumMatch = aiResponse.match(/"album":\s*"([^"]+)"/i)
      const artistMatch = aiResponse.match(/"artist":\s*"([^"]+)"/i)
      
      extractedData = {
        album: albumMatch ? albumMatch[1] : 'Unknown Album',
        artist: artistMatch ? artistMatch[1] : 'Unknown Artist'
      }
    }

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        error: 'Server error',
        details: error?.message || String(error),
        stack: error?.stack || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
