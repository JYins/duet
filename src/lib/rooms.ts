// room + participant management

import { getSupabase } from "./supabase";
import type { Room, RoomParticipant, RoomMode } from "@/types/room";
import type { FrameLayout } from "./composite";
import { getLayout } from "./composite";

function generateShortCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ---- rooms ----

export interface CreateRoomOpts {
  mode: RoomMode;
  layout: FrameLayout;
  lutPreset?: string;
  participantCount?: number;
  backgroundId?: string;
}

export async function createRoom(opts: CreateRoomOpts): Promise<Room> {
  const supabase = getSupabase();
  const shortCode = generateShortCode();

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      short_code: shortCode,
      mode: opts.mode,
      layout: opts.layout,
      lut_preset: opts.lutPreset || "warm-film",
      participant_count: opts.participantCount || 2,
      background_id: opts.backgroundId || "cream",
      status: "waiting",
    })
    .select()
    .single();

  if (error) throw new Error(`failed to create room: ${error.message}`);
  return data as Room;
}

export async function findRoom(shortCode: string): Promise<Room | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select()
    .eq("short_code", shortCode.toLowerCase().trim())
    .single();
  if (error) return null;
  return data as Room;
}

export async function updateRoom(
  id: string,
  updates: Partial<Pick<Room, "status" | "lut_preset" | "layout">>,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("rooms").update(updates).eq("id", id);
  if (error) throw new Error(`failed to update room: ${error.message}`);
}

export function subscribeToRoom(roomId: string, callback: (room: Room) => void) {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`room-${roomId}`)
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "rooms",
      filter: `id=eq.${roomId}`,
    }, (payload) => callback(payload.new as Room))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ---- participants ----

export async function joinRoom(
  roomId: string,
  userId: string,
  displayName: string,
  isHost = false,
): Promise<RoomParticipant> {
  const supabase = getSupabase();

  // check if already joined
  const { data: existing } = await supabase
    .from("room_participants")
    .select()
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing as RoomParticipant;

  // get room to calculate slots
  const { data: room } = await supabase
    .from("rooms")
    .select()
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("room not found");

  const layout = getLayout(room.layout as FrameLayout);
  const totalSlots = layout.count;
  const pCount = room.participant_count;

  // count existing participants
  const { count: currentCount } = await supabase
    .from("room_participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId);

  const participantIndex = currentCount || 0;
  if (participantIndex >= pCount) throw new Error("room is full");

  const slotsPerPerson = Math.floor(totalSlots / pCount);
  const extraSlots = totalSlots - slotsPerPerson * pCount;
  // host (index 0) gets extra slots
  const slotCount = participantIndex === 0 ? slotsPerPerson + extraSlots : slotsPerPerson;
  let slotStart = 0;
  for (let i = 0; i < participantIndex; i++) {
    slotStart += i === 0 ? slotsPerPerson + extraSlots : slotsPerPerson;
  }

  const { data, error } = await supabase
    .from("room_participants")
    .insert({
      room_id: roomId,
      user_id: userId,
      display_name: displayName,
      role: isHost ? "host" : "participant",
      slot_start: slotStart,
      slot_count: slotCount,
      status: "joined",
    })
    .select()
    .single();

  if (error) throw new Error(`failed to join: ${error.message}`);
  return data as RoomParticipant;
}

export async function getParticipants(roomId: string): Promise<RoomParticipant[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("room_participants")
    .select()
    .eq("room_id", roomId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data || []) as RoomParticipant[];
}

export async function updateParticipant(
  participantId: string,
  updates: Partial<Pick<RoomParticipant, "status" | "photo_paths">>,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("room_participants")
    .update(updates)
    .eq("id", participantId);
  if (error) throw new Error(error.message);
}

export function subscribeToParticipants(
  roomId: string,
  callback: (participants: RoomParticipant[]) => void,
) {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`participants-${roomId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "room_participants",
      filter: `room_id=eq.${roomId}`,
    }, async () => {
      // refetch all on any change for simplicity
      const participants = await getParticipants(roomId);
      callback(participants);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function checkAllSubmitted(roomId: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data: room } = await supabase
    .from("rooms")
    .select("participant_count")
    .eq("id", roomId)
    .single();
  if (!room) return false;

  const { count } = await supabase
    .from("room_participants")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("status", "submitted");

  return (count || 0) >= room.participant_count;
}

// ---- storage ----

export async function uploadPhoto(
  roomId: string,
  participantId: string,
  index: number,
  dataUrl: string,
): Promise<string> {
  const supabase = getSupabase();
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const path = `${roomId}/${participantId}-${index}.png`;

  const { error } = await supabase.storage
    .from("cutouts")
    .upload(path, blob, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from("cutouts")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function uploadPhotos(
  roomId: string,
  participantId: string,
  photos: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const url = await uploadPhoto(roomId, participantId, i, photos[i]);
    urls.push(url);
  }
  return urls;
}

// keep legacy function for backward compat
export async function uploadAllCutouts(
  roomId: string,
  role: string,
  photos: string[],
): Promise<string[]> {
  return uploadPhotos(roomId, role, photos);
}

export function getRoomUrl(shortCode: string): string {
  const base = typeof window !== "undefined"
    ? window.location.origin
    : "https://duet.vercel.app";
  return `${base}/room/${shortCode}`;
}
