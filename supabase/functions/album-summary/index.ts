import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => null)
    const album = body?.album?.toString().trim()
    const artist = body?.artist?.toString().trim()

    if (!album || !artist) {
      return new Response(
        JSON.stringify({ error: 'Album and artist are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const prompt = [
      {
        role: 'system',
        content: 'You are a music historian. Respond with strict JSON only.',
      },
      {
        role: 'user',
        content: `Give a concise, factual summary for the album "${album}" by "${artist}". Return JSON with keys: "album_info" (1 sentence), "history" (1 sentence), "fun_facts" (array of 2-3 short bullets). If you are unsure about any detail, use "Unknown" instead of guessing.`,
      },
    ]

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: prompt,
        temperature: 0.4,
        max_tokens: 220,
      }),
    })

    const responseText = await openaiResponse.text()
    if (!openaiResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: responseText }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API returned non-JSON', details: responseText }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiResponse = data?.choices?.[0]?.message?.content
    if (!aiResponse) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API returned unexpected shape', details: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let summary
    try {
      const cleaned = aiResponse
        .replace(/^```json/, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim()
      summary = JSON.parse(cleaned)
    } catch (_err) {
      summary = {
        album_info: 'Unknown',
        history: 'Unknown',
        fun_facts: [],
      }
    }

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Server error',
        details: error?.message || String(error),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
