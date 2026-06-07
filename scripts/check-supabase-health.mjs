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
    // The caller may provide environment variables directly.
  }
}

function print(status, label, detail = "") {
  const icon = status === "ok" ? "PASS" : status === "warn" ? "WARN" : "FAIL";
  console.log(`${icon} ${label}${detail ? ` - ${detail}` : ""}`);
}

function fail(label, detail) {
  print("fail", label, detail);
  process.exitCode = 1;
}

function block(label, detail) {
  print("fail", label, detail);
  process.exitCode = 2;
}

function errorDetail(error) {
  const message = error?.message || String(error);
  if (/521: Web server is down/i.test(message) || /Error code 521/i.test(message)) {
    return "Supabase host returned Cloudflare 521: Web server is down";
  }
  if (/<!DOCTYPE html>|<html/i.test(message)) {
    return `${message.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220)}...`;
  }
  const parts = [error?.message || String(error)];
  if (error?.code) parts.push(`code=${error.code}`);
  if (error?.cause?.code) parts.push(`cause=${error.cause.code}`);
  if (error?.cause?.message) parts.push(error.cause.message);
  return parts.join(" / ");
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  fail("Supabase env", "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required");
  process.exit();
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

print("ok", "Supabase env", new URL(url).host);

try {
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
    method: "HEAD",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
    },
  });

  if (res.status === 401 || res.status === 403 || res.status === 404 || res.ok) {
    print("ok", "Supabase network", `project endpoint is reachable (HTTP ${res.status})`);
  } else {
    block("Supabase network", `project responded with HTTP ${res.status}`);
    console.log("\nSupabase project is reachable but did not answer as expected. Check project status.");
    process.exit(process.exitCode);
  }
} catch (error) {
  block("Supabase network", errorDetail(error));
  console.log("\nSupabase project is not reachable from this machine. This does not prove the migration is missing.");
  process.exit(process.exitCode);
}

const roomBase = await supabase
  .from("rooms")
  .select("id")
  .limit(1);

const roomsBaseOk = !roomBase.error;
if (roomBase.error) {
  fail("rooms table", errorDetail(roomBase.error));
} else {
  print("ok", "rooms table", "base table is readable");
}

const participantsBase = await supabase
  .from("room_participants")
  .select("id,room_id,user_id,slot_start,slot_count,status,photo_paths")
  .limit(1);

const participantsBaseOk = !participantsBase.error;
if (participantsBase.error) {
  fail("room_participants table", errorDetail(participantsBase.error));
} else {
  print("ok", "room_participants table", "collaboration table is readable");
}

const rooms = roomsBaseOk
  ? await supabase
    .from("rooms")
    .select("id,result_path,completed_at,label,paper_style")
    .limit(1)
  : { error: roomBase.error };

if (rooms.error) {
  fail("rooms v4 columns", errorDetail(rooms.error));
} else {
  print("ok", "rooms v4 columns", "result_path, completed_at, label, and paper_style are readable");
}

const rpc = await supabase.rpc("claim_participant_slot_v1", {
  p_room_id: "00000000-0000-0000-0000-000000000000",
  p_user_id: "healthcheck",
  p_display_name: "Healthcheck",
  p_is_host: false,
});

if (rpc.error) {
  if (/room not found/i.test(rpc.error.message) || rpc.error.code === "P0002") {
    print("ok", "claim_participant_slot_v1 RPC", "function exists and rejects missing room");
  } else {
    fail("claim_participant_slot_v1 RPC", errorDetail(rpc.error));
  }
} else {
  print("warn", "claim_participant_slot_v1 RPC", "unexpectedly returned data for dummy room");
}

const results = await supabase.storage.from("results").list("", { limit: 1 });

if (results.error) {
  fail("results storage bucket", errorDetail(results.error));
} else {
  print("ok", "results storage bucket", "read policy is active");
}

if (process.exitCode === 1) {
  if (roomsBaseOk && participantsBaseOk) {
    console.log("\nSupabase backend has the base schema but is missing v4. Run supabase-migration-v3.sql and supabase-migration-v4.sql, or supabase-duet-full.sql for a fresh project.");
  } else {
    console.log("\nSupabase backend is not fully migrated. Run supabase-duet-full.sql in the Supabase SQL Editor.");
  }
} else if (process.exitCode) {
  console.log("\nSupabase backend health could not be checked because the project endpoint is unreachable.");
} else {
  console.log("\nSupabase backend health check passed.");
}
