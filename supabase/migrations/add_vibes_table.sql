-- Connection requests ("vibes")
CREATE TABLE IF NOT EXISTS vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  receiver_id UUID NOT NULL REFERENCES auth.users(id),
  record_id UUID REFERENCES vinyl_records(id),
  event_id UUID REFERENCES events(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id, event_id)
);

-- RLS
ALTER TABLE vibes ENABLE ROW LEVEL SECURITY;

-- Users can see vibes they sent or received
CREATE POLICY "Users can view own vibes" ON vibes
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert vibes as sender
CREATE POLICY "Users can send vibes" ON vibes
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update vibes they received (accept/decline)
CREATE POLICY "Users can respond to received vibes" ON vibes
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vibes_receiver ON vibes(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_vibes_sender ON vibes(sender_id);

-- Messages for vibe chats
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_id UUID NOT NULL REFERENCES vibes(id),
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their vibes" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM vibes WHERE vibes.id = messages.vibe_id AND (vibes.sender_id = auth.uid() OR vibes.receiver_id = auth.uid()))
  );

CREATE POLICY "Users can send messages in accepted vibes" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM vibes WHERE vibes.id = messages.vibe_id AND vibes.status = 'accepted' AND (vibes.sender_id = auth.uid() OR vibes.receiver_id = auth.uid()))
  );
