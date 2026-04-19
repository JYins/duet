-- Duet v2 migration: multi-person rooms + modes
-- Run in Supabase SQL Editor after the initial schema

-- expand rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'async';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT '2x2';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS participant_count INT DEFAULT 2;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS background_id TEXT DEFAULT 'cream';

-- update status constraint to include new states
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('waiting', 'ready', 'shooting', 'complete'));

-- add mode constraint
ALTER TABLE rooms ADD CONSTRAINT rooms_mode_check
  CHECK (mode IN ('async', 'ghost'));

-- participants table (separate from rooms to avoid JSONB race conditions)
CREATE TABLE IF NOT EXISTS room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'participant',
  slot_start INT DEFAULT 0,
  slot_count INT DEFAULT 0,
  status TEXT DEFAULT 'joined'
    CHECK (status IN ('joined', 'shooting', 'selecting', 'submitted')),
  photo_paths TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room
  ON room_participants(room_id);

-- RLS
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_read" ON room_participants
  FOR SELECT USING (true);
CREATE POLICY "participants_insert" ON room_participants
  FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_update" ON room_participants
  FOR UPDATE USING (true);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
