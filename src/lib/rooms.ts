// room + participant management

import { getSupabase } from "./supabase";
import type { Room, RoomParticipant, RoomMode } from "@/types/room";
import type { FrameLayout } from "./composite";
import { getLayout } from "./composite";
import type { TranslationKey } from "./i18n";

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
  const layout = getLayout(opts.layout);
  const participantCount = opts.mode === "ghost"
    ? 2
    : Math.max(1, Math.min(opts.participantCount || 2, layout.count));

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      short_code: shortCode,
      mode: opts.mode,
      layout: opts.layout,
      lut_preset: opts.lutPreset || "k-booth",
      participant_count: participantCount,
      background_id: opts.backgroundId || "cream",
      status: "waiting",
    })
    .select()
    .single();

  if (error?.code === "23505") return createRoom(opts);
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
  updates: Partial<Pick<Room, "status" | "lut_preset" | "layout" | "result_path" | "completed_at">>,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("rooms").update(updates).eq("id", id);
  if (error) throw new Error(`failed to update room: ${error.message}`);
}

export async function markRoomComplete(id: string, resultPath?: string): Promise<Room | null> {
  const supabase = getSupabase();
  const updates: Partial<Pick<Room, "status" | "result_path" | "completed_at">> = {
    status: "complete",
    completed_at: new Date().toISOString(),
  };
  if (resultPath) updates.result_path = resultPath;

  const { data, error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("id", id)
    .is("result_path", null)
    .select()
    .maybeSingle();

  if (!error && data) return data as Room;
  if (error) throw new Error(`failed to complete room: ${error.message}`);

  const { data: existing } = await supabase
    .from("rooms")
    .select()
    .eq("id", id)
    .maybeSingle();
  return (existing as Room | null) || null;
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
  return claimParticipantSlot(roomId, userId, displayName, isHost);
}

export async function claimParticipantSlot(
  roomId: string,
  userId: string,
  displayName: string,
  isHost = false,
): Promise<RoomParticipant> {
  const supabase = getSupabase();

  const { data: claimed, error: claimError } = await supabase
    .rpc("claim_participant_slot_v1", {
      p_room_id: roomId,
      p_user_id: userId,
      p_display_name: displayName,
      p_is_host: isHost,
    })
    .single();

  if (claimed && !claimError) return claimed as RoomParticipant;
  if (claimError) {
    throw new Error(normalizeJoinError(claimError.message));
  }

  throw new Error("failed to join: no participant slot was returned");
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

export async function markParticipantSubmitted(
  participantId: string,
  photoPaths: string[],
): Promise<void> {
  await updateParticipant(participantId, {
    status: "submitted",
    photo_paths: photoPaths,
  });
}

export function sortParticipants(participants: RoomParticipant[]): RoomParticipant[] {
  return [...participants].sort((a, b) => {
    if (a.slot_start !== b.slot_start) return a.slot_start - b.slot_start;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function collectSubmittedPhotos(
  participants: RoomParticipant[],
  expectedCount: number,
): string[] | null {
  const submitted = sortParticipants(participants).filter((p) => p.status === "submitted");
  if (submitted.length < expectedCount) return null;
  const photos: string[] = [];
  for (const participant of submitted) {
    const slotCount = Math.max(0, participant.slot_count || 0);
    const ownedPhotos = (participant.photo_paths || []).slice(0, slotCount);
    if (ownedPhotos.length < slotCount) return null;
    photos.push(...ownedPhotos);
  }
  return photos.length > 0 ? photos : null;
}

export function collectGhostCutouts(
  participants: RoomParticipant[],
  requiredFrames: number,
): { host: string[]; guest: string[] } | null {
  const sorted = sortParticipants(participants).filter((p) => p.status === "submitted");
  const host = sorted.find((p) => p.role === "host") || sorted[0];
  const guest = sorted.find((p) => p.id !== host?.id);
  if (!host || !guest) return null;

  const hostPhotos = (host.photo_paths || []).slice(0, requiredFrames);
  const guestPhotos = (guest.photo_paths || []).slice(0, requiredFrames);
  if (hostPhotos.length < requiredFrames || guestPhotos.length < requiredFrames) return null;

  return { host: hostPhotos, guest: guestPhotos };
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
  const blob = await dataUrlToBlob(dataUrl);
  const contentType = getDataUrlContentType(dataUrl, blob.type || "image/png");
  const extension = contentType === "image/jpeg" ? "jpg" : "png";
  const path = `${roomId}/${participantId}-${index}.${extension}`;

  const { error } = await supabase.storage
    .from("cutouts")
    .upload(path, blob, { contentType, upsert: true });

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

export async function uploadResultStrip(roomId: string, dataUrl: string): Promise<string> {
  const supabase = getSupabase();
  const blob = await dataUrlToBlob(dataUrl);
  const contentType = getDataUrlContentType(dataUrl, blob.type || "image/png");
  const extension = contentType === "image/jpeg" ? "jpg" : "png";
  const path = `${roomId}/strip-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("results")
    .upload(path, blob, { contentType, upsert: false });

  if (error) throw new Error(`result upload failed: ${error.message}`);

  const { data } = supabase.storage.from("results").getPublicUrl(path);
  return data.publicUrl;
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

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function getDataUrlContentType(dataUrl: string, fallback: string): string {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/);
  return match?.[1] || fallback;
}

function normalizeJoinError(message: string): string {
  if (/claim_participant_slot_v1|schema cache|function/i.test(message)) return "backend-migration-missing";
  if (/room is full/i.test(message)) return "room-full";
  if (/room not found/i.test(message)) return "room-not-found";
  if (/idx_room_participants_one_host|duplicate key/i.test(message)) return "host-already-joined";
  return `join-failed:${message}`;
}

export function getRoomErrorMessage(
  err: unknown,
  translate: (key: TranslationKey) => string,
): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message === "backend-migration-missing") return translate("error.backendMigration");
  if (message === "room-full") return translate("join.full");
  if (message === "room-not-found") return translate("room.notFound");
  if (message === "host-already-joined") return translate("join.hostExists");
  if (message.startsWith("join-failed:")) return translate("error.joinFailed");
  return message || translate("error.joinFailed");
}
