// room and photo types matching supabase schema

export interface Room {
  id: string;
  short_code: string;
  created_at: string;
  expires_at: string;
  status: "waiting" | "ready" | "complete";
  host_photo_url: string | null;
  guest_photo_url: string | null;
  lut_preset: string;
}

export interface RoomPhoto {
  room_id: string;
  role: "host" | "guest";
  cutout_url: string;
  uploaded_at: string;
}
