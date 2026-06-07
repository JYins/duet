# Duet

Mobile-first Korean-style photo booth for solo and two-person browser capture.

Duet lets people shoot in Safari/Chrome, choose a soft film look, collaborate through Supabase rooms, and generate a tactile photo strip. Ghost mode uses segmentation when available; if segmentation fails, the final strip falls back to a clean split-frame layout instead of stacking opaque photos into a ghostly mess.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Framer Motion
- Canvas 2D LUT and strip compositing
- MediaPipe Tasks for browser segmentation
- Supabase Realtime, Database, and Storage

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Camera access works on localhost and requires HTTPS in production.

## Supabase Setup

Set these in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

For a fresh, resumed, or uncertain Supabase project, run the complete setup in
Supabase SQL Editor:

1. `supabase-duet-full.sql`

For an older project that already has the initial schema and v2 applied, you can
run only the incremental v3 migration instead:

- `supabase-migration-v3.sql`

Then verify the remote backend:

```bash
npm run check:supabase
```

After the health check passes, run the optional live flow check. It creates a
short-lived test room, claims two participant slots, uploads tiny test frames to
`cutouts`, uploads a tiny result image to `results`, and marks the room complete:

```bash
npm run check:supabase:flow
```

The health check verifies:

- `rooms` and `room_participants` exist
- `rooms.result_path` and `rooms.completed_at`
- `claim_participant_slot_v1` RPC
- `results` storage bucket and read policy

If the check reports that the project endpoint is unreachable, fix DNS/project availability first; that result does not prove the migration is missing.

## Core Flows

- Solo booth: capture raw frames, preview with CSS filters, render a final Korean-style strip with Canvas LUT/grain/paper texture.
- Async room: participants join via code/QR, each submits raw selected photos, Duet composes the final strip in slot order and writes `rooms.result_path`.
- Ghost room: host and guest each shoot a full frame set. Transparent cutouts are composited into one scene; opaque fallback frames are rendered as a clean split-frame strip.

## Useful Commands

```bash
npm run lint
npm run build
npm run check:supabase
npm run check:supabase:flow
```

## Current Launch Notes

- Mobile Safari/Chrome web app is the first target.
- iOS native wrapping is intentionally deferred.
- Supabase project ref in local agent memory: `cxyuznitcbcyzwumlwnb`.
