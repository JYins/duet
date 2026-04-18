-- duet supabase schema
-- run this in the SQL editor at supabase.com/dashboard

-- rooms table
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours'),
  status text default 'waiting' check (status in ('waiting', 'ready', 'complete')),
  lut_preset text default 'warm-film',
  host_photo_path text,
  guest_photo_path text
);

-- index for short code lookups
create index if not exists idx_rooms_short_code on rooms (short_code);

-- auto-cleanup: delete rooms older than 7 days
-- (set up a pg_cron job or supabase edge function for this)

-- storage bucket for cutout PNGs
insert into storage.buckets (id, name, public)
values ('cutouts', 'cutouts', true)
on conflict (id) do nothing;

-- RLS policies
alter table rooms enable row level security;

-- anyone can read rooms (needed for joining via short code)
create policy "rooms are publicly readable"
  on rooms for select
  using (true);

-- anyone can create rooms (anonymous users)
create policy "anyone can create rooms"
  on rooms for insert
  with check (true);

-- anyone can update rooms (guest joins, status changes)
create policy "anyone can update rooms"
  on rooms for update
  using (true);

-- storage: anyone can upload cutouts
create policy "anyone can upload cutouts"
  on storage.objects for insert
  with check (bucket_id = 'cutouts');

-- storage: anyone can read cutouts
create policy "anyone can read cutouts"
  on storage.objects for select
  using (bucket_id = 'cutouts');

-- realtime: enable for rooms table
alter publication supabase_realtime add table rooms;
