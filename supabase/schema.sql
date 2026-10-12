-- HHHH Tierlist — Supabase schema
-- Paste this whole file into: Supabase Dashboard → SQL Editor → Run

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region text not null default 'AS/AU' check (region in ('NA', 'EU', 'AS/AU')),
  premium boolean not null default true,
  retired boolean not null default false,
  ranks jsonb not null default '{}'::jsonb,
  -- ranks entry shape: {"sword": {"rank":"HT3","retired":false,"peak":"HT1"}, ...}
  --   retired: per-kit, only valid for HT1/LT1/HT2/LT2 (hidden from kit boards, shown as RLT2)
  --   peak: best tier ever held; points always come from peak when set
  created_at timestamptz not null default now()
);

-- If the table already existed before the premium column was added, run:
-- alter table public.players add column if not exists premium boolean not null default true;

create index if not exists players_name_idx on public.players (lower(name));

-- Row Level Security: everyone can read, only logged-in admin can write
alter table public.players enable row level security;

drop policy if exists "public read" on public.players;
create policy "public read" on public.players
  for select using (true);

drop policy if exists "authenticated insert" on public.players;
create policy "authenticated insert" on public.players
  for insert to authenticated with check (true);

drop policy if exists "authenticated update" on public.players;
create policy "authenticated update" on public.players
  for update to authenticated using (true) with check (true);

drop policy if exists "authenticated delete" on public.players;
create policy "authenticated delete" on public.players
  for delete to authenticated using (true);
