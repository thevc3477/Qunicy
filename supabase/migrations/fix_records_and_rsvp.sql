-- Add image_url column to vinyl_records if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vinyl_records' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE vinyl_records ADD COLUMN image_url text;
  END IF;
END $$;

-- Ensure rsvps has a unique constraint for upsert (user_id, event_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rsvps_user_id_event_id_key'
  ) THEN
    ALTER TABLE rsvps ADD CONSTRAINT rsvps_user_id_event_id_key UNIQUE (user_id, event_id);
  END IF;
END $$;

-- Allow storage uploads to records bucket for authenticated users
-- (This is typically done via Supabase dashboard, but documented here)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('records', 'records', false)
-- ON CONFLICT DO NOTHING;
