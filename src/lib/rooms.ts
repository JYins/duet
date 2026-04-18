// room management: create, join, upload cutouts, subscribe to changes

import { getSupabase } from "./supabase";
import type { Room } from "@/types/room";

function generateShortCode(): string {
  // 6 char alphanumeric, easy to type on mobile
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createRoom(lutPreset = "warm-film"): Promise<Room> {
  const supabase = getSupabase();
  const shortCode = generateShortCode();

  const { data, error } = await supabase
    .from("rooms")
    .insert({ short_code: shortCode, lut_preset: lutPreset })
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
  updates: Partial<Pick<Room, "status" | "host_photo_url" | "guest_photo_url" | "lut_preset">>,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(`failed to update room: ${error.message}`);
}

// upload a cutout PNG to storage, return public url
export async function uploadCutout(
  roomId: string,
  role: "host" | "guest",
  index: number,
  dataUrl: string,
): Promise<string> {
  const supabase = getSupabase();

  // convert data url to blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  const path = `${roomId}/${role}-${index}.png`;

  const { error } = await supabase.storage
    .from("cutouts")
    .upload(path, blob, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) throw new Error(`failed to upload cutout: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from("cutouts")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// upload all 4 cutouts for a role, return array of public urls
export async function uploadAllCutouts(
  roomId: string,
  role: "host" | "guest",
  cutouts: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < cutouts.length; i++) {
    const url = await uploadCutout(roomId, role, i, cutouts[i]);
    urls.push(url);
  }
  return urls;
}

// subscribe to room changes via realtime
export function subscribeToRoom(
  roomId: string,
  callback: (room: Room) => void,
) {
  const supabase = getSupabase();

  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        callback(payload.new as Room);
      },
    )
    .subscribe();

  // return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// build the share url for a room
export function getRoomUrl(shortCode: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://duet.vercel.app";
  return `${base}/room/${shortCode}`;
}
