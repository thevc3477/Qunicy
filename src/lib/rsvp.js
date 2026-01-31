import { supabase } from './supabase'

export async function fetchActiveEvent() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, starts_at, venue_name, city, is_active')
    .eq('is_active', true)
    .order('starts_at', { ascending: true })
    .limit(1)
    .single()

  return { data, error }
}

export async function fetchProfile(userId) {
  if (!userId) {
    return { data: null, error: { message: 'Missing user id' } }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, instagram_handle')
    .eq('id', userId)
    .maybeSingle()

  return { data, error }
}

export async function upsertProfile({ userId, displayName, instagramHandle }) {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName,
        instagram_handle: instagramHandle || null,
      },
      { onConflict: 'id' }
    )

  return { error }
}

export async function upsertRsvp({ eventId, userId }) {
  const { error } = await supabase
    .from('rsvps')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status: 'going',
        source: 'quincy',
      },
      { onConflict: 'event_id,user_id' }
    )

  return { error }
}
