const IDENTITY_LABELS = {
  casual_listener: '🎧 Casual Listener',
  vinyl_collector: '💿 Vinyl Collector',
  vinyl_dj: '🎚️ Vinyl DJ',
  live_music_lover: '🎤 Live-Music Lover',
  music_explorer: '🔍 Music Explorer',
}

const GENRE_LABELS = {
  house: 'House',
  techno: 'Techno',
  jazz: 'Jazz',
  soul_funk: 'Soul/Funk',
  hiphop: 'Hip-Hop',
  rnb: 'R&B',
  afrobeat: 'Afrobeat',
  latin: 'Latin',
  rock: 'Rock',
  electronic: 'Electronic',
}

const INTENT_LABELS = {
  discovering_music: 'Discovering new music',
  meeting_people: 'Meeting people',
  dancing: 'Dancing',
  chilling: 'Chilling & vibing',
  supporting_artists: 'Supporting artists',
}

export function generateVibeCard(profile) {
  if (!profile) return ''
  const parts = []
  if (profile.music_identity) {
    parts.push(IDENTITY_LABELS[profile.music_identity] || profile.music_identity)
  }
  if (profile.top_genres?.length) {
    const genres = profile.top_genres.map(g => GENRE_LABELS[g] || g).join(', ')
    parts.push(genres)
  }
  if (profile.event_intent) {
    parts.push(INTENT_LABELS[profile.event_intent] || profile.event_intent)
  }
  return parts.join(' · ')
}
