import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Environment may already be provided by the shell or deployment platform.
  }
}

function print(status, label, detail = "") {
  const icon = status === "ok" ? "PASS" : status === "warn" ? "WARN" : "FAIL";
  console.log(`${icon} ${label}${detail ? ` - ${detail}` : ""}`);
}

function detail(error) {
  const parts = [error?.message || String(error)];
  if (error?.code) parts.push(`code=${error.code}`);
  return parts.join(" / ");
}

function fail(label, error) {
  print("fail", label, typeof error === "string" ? error : detail(error));
  process.exitCode = 1;
}

class FlowStop extends Error {}

function stop() {
  throw new FlowStop();
}

async function requireOk(label, promise) {
  const result = await promise;
  if (result.error) {
    fail(label, result.error);
    return null;
  }
  print("ok", label);
  return result.data;
}

function shortCode() {
  return `hc${Math.random().toString(36).slice(2, 6)}`.toLowerCase();
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  if (!url || !key) {
    fail("Supabase env", "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
    stop();
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  print("ok", "Supabase env", new URL(url).host);

  const v3 = await supabase.from("rooms").select("id,result_path,completed_at").limit(1);
  if (v3.error) {
    fail("v3 prerequisite", v3.error);
    console.log("\nFlow check did not create test data. Run supabase-migration-v3.sql, or supabase-duet-full.sql for a fresh project.");
    stop();
  }
  print("ok", "v3 prerequisite", "rooms.result_path and completed_at are readable");

  const rpcProbe = await supabase.rpc("claim_participant_slot_v1", {
    p_room_id: "00000000-0000-0000-0000-000000000000",
    p_user_id: "flow-probe",
    p_display_name: "Flow Probe",
    p_is_host: false,
  });

  if (rpcProbe.error && (/room not found/i.test(rpcProbe.error.message) || rpcProbe.error.code === "P0002")) {
    print("ok", "claim RPC prerequisite", "function exists");
  } else if (rpcProbe.error) {
    fail("claim RPC prerequisite", rpcProbe.error);
    console.log("\nFlow check did not create test data. Run supabase-migration-v3.sql, or supabase-duet-full.sql for a fresh project.");
    stop();
  } else {
    print("warn", "claim RPC prerequisite", "dummy room unexpectedly returned data");
  }

  const code = shortCode();
  const room = await requireOk("create async room", supabase
    .from("rooms")
    .insert({
      short_code: code,
      mode: "async",
      layout: "2x2",
      lut_preset: "warm-film",
      participant_count: 2,
      background_id: "cream",
      status: "waiting",
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    })
    .select("id,short_code,participant_count,layout")
    .single());

  if (!room) stop();

  const host = await requireOk("claim host slot", supabase
    .rpc("claim_participant_slot_v1", {
      p_room_id: room.id,
      p_user_id: `${code}-host`,
      p_display_name: "Host",
      p_is_host: true,
    })
    .single());

  const guest = await requireOk("claim guest slot", supabase
    .rpc("claim_participant_slot_v1", {
      p_room_id: room.id,
      p_user_id: `${code}-guest`,
      p_display_name: "Guest",
      p_is_host: false,
    })
    .single());

  if (!host || !guest) stop();

  const slotOk = host.role === "host"
    && host.slot_start === 0
    && host.slot_count === 2
    && guest.role === "participant"
    && guest.slot_start === 2
    && guest.slot_count === 2;

  if (!slotOk) {
    fail("slot allocation", `host=${host.role}:${host.slot_start}+${host.slot_count}, guest=${guest.role}:${guest.slot_start}+${guest.slot_count}`);
    stop();
  }
  print("ok", "slot allocation", "2x2 room split into 2 frames per participant");

  const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const pngBlob = await dataUrlToBlob(tinyPng);

  async function uploadFrame(participantId, index) {
    const path = `${room.id}/${participantId}-${index}.png`;
    const { error } = await supabase.storage.from("cutouts").upload(path, pngBlob, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) {
      fail(`upload cutout ${index}`, error);
      return null;
    }
    const { data } = supabase.storage.from("cutouts").getPublicUrl(path);
    return data.publicUrl;
  }

  const hostUrls = [
    await uploadFrame(host.id, 0),
    await uploadFrame(host.id, 1),
  ].filter(Boolean);
  const guestUrls = [
    await uploadFrame(guest.id, 0),
    await uploadFrame(guest.id, 1),
  ].filter(Boolean);

  if (hostUrls.length !== 2 || guestUrls.length !== 2) stop();
  print("ok", "cutout storage upload", "uploaded tiny PNG frames");

  await requireOk("mark host submitted", supabase
    .from("room_participants")
    .update({ status: "submitted", photo_paths: hostUrls })
    .eq("id", host.id)
    .select("id")
    .single());

  await requireOk("mark guest submitted", supabase
    .from("room_participants")
    .update({ status: "submitted", photo_paths: guestUrls })
    .eq("id", guest.id)
    .select("id")
    .single());

  const resultObjectPath = `${room.id}/strip-${Date.now()}.png`;
  const resultUpload = await supabase.storage.from("results").upload(resultObjectPath, pngBlob, {
    contentType: "image/png",
    upsert: false,
  });
  if (resultUpload.error) {
    fail("result storage upload", resultUpload.error);
    stop();
  }
  const { data: resultPublic } = supabase.storage.from("results").getPublicUrl(resultObjectPath);
  print("ok", "result storage upload", "uploaded tiny result PNG");

  await requireOk("mark room complete", supabase
    .from("rooms")
    .update({
      status: "complete",
      result_path: resultPublic.publicUrl,
      completed_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .is("result_path", null)
    .select("id,result_path,completed_at,status")
    .single());

  print("ok", "Supabase collaboration flow", `created expiring test room ${code}`);
  console.log("\nSupabase flow check passed.");
}

try {
  await main();
} catch (error) {
  if (!(error instanceof FlowStop)) {
    fail("Supabase flow check", error);
  }
}
