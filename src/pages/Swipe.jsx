import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'
import { generateVibeCard } from '../lib/vibeCard'

export default function Swipe() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasUploaded, setHasUploaded] = useState(false)
  const [matchOverlay, setMatchOverlay] = useState(null)
  const [swipeX, setSwipeX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      // Get active event
      const { data: event } = await supabase
        .from('events').select('id').eq('is_active', true).limit(1).maybeSingle()
      if (!event) { setLoading(false); return }

      // Check if user has uploaded a record
      const { data: myRecord } = await supabase
        .from('vinyl_records')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      setHasUploaded(!!myRecord)
      if (!myRecord) { setLoading(false); return }

      // Get already swiped
      const { data: swiped } = await supabase
        .from('swipes').select('swiped_id').eq('swiper_id', user.id).eq('event_id', event.id)
      const swipedIds = new Set((swiped || []).map(s => s.swiped_id))
      swipedIds.add(user.id)

      // Get attendees with records
      const { data: records } = await supabase
        .from('vinyl_records')
        .select('id, typed_album, typed_artist, image_path, user_id, profiles(id, display_name, music_identity, top_genres, event_intent, avatar_url)')
        .eq('event_id', event.id)

      if (!records) { setLoading(false); return }

      // Dedupe by user, pick first record per user
      const byUser = {}
      for (const r of records) {
        if (swipedIds.has(r.user_id)) continue
        if (!byUser[r.user_id]) byUser[r.user_id] = r
      }

      const cardList = await Promise.all(
        Object.values(byUser).map(async (r) => {
          const { url } = r.image_path ? await getVinylRecordImageUrl(r.image_path) : { url: null }
          return {
            userId: r.user_id,
            eventId: event.id,
            album: r.typed_album || '',
            artist: r.typed_artist || '',
            imageUrl: url,
            displayName: r.profiles?.display_name || 'Someone',
            vibeCard: generateVibeCard(r.profiles),
          }
        })
      )

      setCards(cardList)
      setLoading(false)
    }
    load()
  }, [user])

  const handleSwipe = async (direction) => {
    const card = cards[currentIdx]
    if (!card) return

    // Insert swipe
    await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: card.userId,
      event_id: card.eventId,
      direction,
    })

    // Check for mutual match on 'right'
    if (direction === 'right') {
      const { data: mutual } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', card.userId)
        .eq('swiped_id', user.id)
        .eq('direction', 'right')
        .maybeSingle()

      if (mutual) {
        // Create match (user_a < user_b for uniqueness)
        const [a, b] = [user.id, card.userId].sort()
        await supabase.from('matches').upsert({
          user_a: a, user_b: b, event_id: card.eventId,
        }, { onConflict: 'user_a,user_b,event_id' })

        setMatchOverlay(card)
        setTimeout(() => setMatchOverlay(null), 2500)

        // Send match SMS to the other user (fire and forget)
        supabase.functions.invoke('send-match-sms', {
          body: { user_id: card.userId, matched_with_name: 'a fellow vinyl lover' },
        }).catch(() => {})
      }
    }

    setSwipeX(0)
    setCurrentIdx(prev => prev + 1)
  }

  const onTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    setSwiping(true)
  }
  const onTouchMove = (e) => {
    if (!swiping) return
    setSwipeX(e.touches[0].clientX - startX.current)
  }
  const onTouchEnd = () => {
    setSwiping(false)
    if (swipeX > 100) handleSwipe('right')
    else if (swipeX < -100) handleSwipe('left')
    else setSwipeX(0)
  }

  if (loading) {
    return <div style={{ padding: 20 }}><p style={{ color: 'var(--text-secondary)' }}>Loading...</p></div>
  }

  if (!hasUploaded) {
    return (
      <div style={{ padding: 20, paddingBottom: 100, minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Upload to Unlock Discover</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            Share the record you're bringing to start discovering what others are vibing with. It only takes a sec! 📸
          </p>
          <Link to="/records"><button style={{ width: '100%' }}>Upload Your Record</button></Link>
        </div>
      </div>
    )
  }

  const card = cards[currentIdx]
  const done = !card

  return (
    <div style={{ padding: 20, paddingBottom: 100, minHeight: '70vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>Discover</h1>

      {/* Match overlay */}
      {matchOverlay && (
        <div className="match-overlay">
          <div className="match-overlay-content">
            <div style={{ fontSize: 64 }}>🎉</div>
            <h2 style={{ fontSize: 28, color: 'white', margin: '16px 0 8px' }}>It's a Match!</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)' }}>You and {matchOverlay.displayName} both vibed</p>
          </div>
        </div>
      )}

      {done ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>You've seen everyone!</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Check back later for new people.</p>
        </div>
      ) : (
        <>
          <div
            className="swipe-card"
            style={{ transform: `translateX(${swipeX}px) rotate(${swipeX * 0.05}deg)` }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div style={{
              width: '100%', aspectRatio: '1', borderRadius: 16, overflow: 'hidden',
              backgroundColor: 'rgba(99,102,241,0.1)', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 64 }}>🎵</span>
              )}
            </div>
            <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>{card.displayName}</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
              {card.artist} — {card.album}
            </p>
            {card.vibeCard && <p className="vibe-card-tag" style={{ fontSize: 12 }}>{card.vibeCard}</p>}
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
            <button onClick={() => handleSwipe('left')}
              style={{ width: 64, height: 64, borderRadius: '50%', fontSize: 24, padding: 0, backgroundColor: '#f3f4f6', color: '#ef4444', border: '2px solid #fecaca' }}>
              ❌
            </button>
            <button onClick={() => handleSwipe('right')}
              style={{ width: 64, height: 64, borderRadius: '50%', fontSize: 24, padding: 0, backgroundColor: '#f0fdf4', color: '#16a34a', border: '2px solid #bbf7d0' }}>
              ✅
            </button>
          </div>
        </>
      )}
    </div>
  )
}
