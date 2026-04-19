export type RoomMode = "async" | "ghost";
export type RoomStatus = "waiting" | "ready" | "shooting" | "complete";
export type ParticipantStatus = "joined" | "shooting" | "selecting" | "submitted";

export interface Room {
  id: string;
  short_code: string;
  created_at: string;
  expires_at: string;
  status: RoomStatus;
  mode: RoomMode;
  layout: string;
  participant_count: number;
  background_id: string;
  lut_preset: string;
  // legacy fields kept for backward compat
  host_photo_path: string | null;
  guest_photo_path: string | null;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string | null;
  role: "host" | "participant";
  slot_start: number;
  slot_count: number;
  status: ParticipantStatus;
  photo_paths: string[];
  created_at: string;
}
