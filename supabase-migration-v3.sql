-- Duet v3 migration: commercial capture hardening
-- Run in Supabase SQL Editor after v2.

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('waiting', 'ready', 'shooting', 'complete', 'error'));

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS result_path TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE room_participants DROP CONSTRAINT IF EXISTS room_participants_role_check;
ALTER TABLE room_participants ADD CONSTRAINT room_participants_role_check
  CHECK (role IN ('host', 'participant'));

ALTER TABLE room_participants DROP CONSTRAINT IF EXISTS room_participants_status_check;
ALTER TABLE room_participants ADD CONSTRAINT room_participants_status_check
  CHECK (status IN ('joined', 'shooting', 'selecting', 'submitted', 'error'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_participants_room_user
  ON room_participants(room_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_participants_one_host
  ON room_participants(room_id)
  WHERE role = 'host';

CREATE INDEX IF NOT EXISTS idx_room_participants_room_status
  ON room_participants(room_id, status);

CREATE INDEX IF NOT EXISTS idx_rooms_status_expires
  ON rooms(status, expires_at);

INSERT INTO storage.buckets (id, name, public)
VALUES ('results', 'results', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anyone can upload cutouts" ON storage.objects;
CREATE POLICY "anyone can upload cutouts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cutouts'
    AND array_length(storage.foldername(name), 1) = 1
    AND CASE
      WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9]+\.(png|jpg|jpeg)$'
      THEN EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.room_participants p
          ON p.room_id = r.id
        WHERE r.id = ((storage.foldername(name))[1])::uuid
          AND p.id = (substring(storage.filename(name) FROM '^([0-9a-fA-F-]{36})-'))::uuid
          AND r.expires_at > now()
      )
      ELSE FALSE
    END
  );

DROP POLICY IF EXISTS "anyone can update cutouts" ON storage.objects;
CREATE POLICY "anyone can update cutouts"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cutouts'
    AND array_length(storage.foldername(name), 1) = 1
    AND storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9]+\.(png|jpg|jpeg)$'
  )
  WITH CHECK (
    bucket_id = 'cutouts'
    AND array_length(storage.foldername(name), 1) = 1
    AND CASE
      WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9]+\.(png|jpg|jpeg)$'
      THEN EXISTS (
        SELECT 1
        FROM public.rooms r
        JOIN public.room_participants p
          ON p.room_id = r.id
        WHERE r.id = ((storage.foldername(name))[1])::uuid
          AND p.id = (substring(storage.filename(name) FROM '^([0-9a-fA-F-]{36})-'))::uuid
          AND r.expires_at > now()
      )
      ELSE FALSE
    END
  );

DROP POLICY IF EXISTS "anyone can upload results" ON storage.objects;
CREATE POLICY "anyone can upload results"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'results'
    AND array_length(storage.foldername(name), 1) = 1
    AND storage.filename(name) ~* '^strip-[0-9]+\.(png|jpg|jpeg)$'
    AND CASE
      WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN EXISTS (
        SELECT 1
        FROM public.rooms r
        WHERE r.id = ((storage.foldername(name))[1])::uuid
          AND r.expires_at > now()
      )
      ELSE FALSE
    END
  );

DO $$
BEGIN
  CREATE POLICY "anyone can read results"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'results');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.claim_participant_slot_v1(
  p_room_id UUID,
  p_user_id TEXT,
  p_display_name TEXT,
  p_is_host BOOLEAN DEFAULT FALSE
)
RETURNS room_participants
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_participant room_participants%ROWTYPE;
  v_current_count INT;
  v_layout_count INT;
  v_slots_per_person INT;
  v_extra_slots INT;
  v_slot_start INT := 0;
  v_slot_count INT := 0;
  i INT;
BEGIN
  SELECT *
    INTO v_participant
    FROM room_participants
    WHERE room_id = p_room_id
      AND user_id = p_user_id;

  IF FOUND THEN
    RETURN v_participant;
  END IF;

  SELECT *
    INTO v_room
    FROM rooms
    WHERE id = p_room_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'room not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*)
    INTO v_current_count
    FROM room_participants
    WHERE room_id = p_room_id;

  IF v_current_count >= v_room.participant_count THEN
    RAISE EXCEPTION 'room is full' USING ERRCODE = 'P0001';
  END IF;

  v_layout_count := CASE v_room.layout
    WHEN '1x3' THEN 3
    WHEN '2x3' THEN 6
    WHEN '2x4' THEN 8
    WHEN '3x3' THEN 9
    ELSE 4
  END;

  IF v_room.mode <> 'ghost' AND v_room.participant_count > v_layout_count THEN
    RAISE EXCEPTION 'participant count exceeds layout frames' USING ERRCODE = 'P0001';
  END IF;

  IF v_room.mode = 'ghost' THEN
    v_slot_start := 0;
    v_slot_count := v_layout_count;
  ELSE
    v_slots_per_person := FLOOR(v_layout_count::NUMERIC / v_room.participant_count)::INT;
    v_extra_slots := v_layout_count - v_slots_per_person * v_room.participant_count;
    v_slot_count := CASE
      WHEN v_current_count = 0 THEN v_slots_per_person + v_extra_slots
      ELSE v_slots_per_person
    END;

    IF v_current_count > 0 THEN
      FOR i IN 0..(v_current_count - 1) LOOP
        IF i = 0 THEN
          v_slot_start := v_slot_start + v_slots_per_person + v_extra_slots;
        ELSE
          v_slot_start := v_slot_start + v_slots_per_person;
        END IF;
      END LOOP;
    END IF;
  END IF;

  INSERT INTO room_participants (
    room_id,
    user_id,
    display_name,
    role,
    slot_start,
    slot_count,
    status
  )
  VALUES (
    p_room_id,
    p_user_id,
    p_display_name,
    CASE WHEN p_is_host AND v_current_count = 0 THEN 'host' ELSE 'participant' END,
    v_slot_start,
    v_slot_count,
    'joined'
  )
  RETURNING * INTO v_participant;

  RETURN v_participant;
EXCEPTION
  WHEN unique_violation THEN
    SELECT *
      INTO v_participant
      FROM room_participants
      WHERE room_id = p_room_id
        AND user_id = p_user_id;

    IF FOUND THEN
      RETURN v_participant;
    END IF;

    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_participant_slot_v1(UUID, TEXT, TEXT, BOOLEAN)
  TO anon, authenticated;
