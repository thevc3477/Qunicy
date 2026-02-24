/**
 * Direct fetch helper for Supabase REST API.
 * Bypasses the Supabase JS client to avoid AbortError bugs on getSession/refreshSession.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ailkqrjqiuemdkdtgewc.supabase.co'
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbGtxcmpxaXVlbWRrZHRnZXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjM4NjMsImV4cCI6MjA4MzIzOTg2M30.OtMZf_33oo1Vj1OCEgnua7n-w4Q-4ko-qErSh19DT5Q'

function getAccessToken() {
  const projectRef = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] || 'ailkqrjqiuemdkdtgewc'
  const stored = localStorage.getItem(`sb-${projectRef}-auth-token`)
  if (!stored) return null
  try {
    return JSON.parse(stored).access_token
  } catch {
    return null
  }
}

/**
 * Make a request to the Supabase REST API.
 * @param {string} path - e.g. '/rest/v1/vibes?receiver_id=eq.xxx'
 * @param {object} options - { method, body, headers }
 * @returns {Promise<{data: any, error: string|null}>}
 */
export async function fetchSupabase(path, options = {}) {
  const token = getAccessToken()
  if (!token) return { data: null, error: 'Not authenticated' }

  const { method = 'GET', body, headers = {} } = options

  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': method === 'GET' ? '' : 'return=representation',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    return { data: null, error: err }
  }

  const contentType = res.headers.get('content-type')
  if (contentType?.includes('json')) {
    const data = await res.json()
    return { data, error: null }
  }
  return { data: null, error: null }
}
