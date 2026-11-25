-- Etapa 2: schema real do Memorial App (Eternum)
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/sxnbdibtwujbfnscjfnh/sql/new)

create extension if not exists pgcrypto;

-- ============================================================
-- MEMORIALS
-- ============================================================
create table if not exists public.memorials (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('person', 'pet')),
  photo text,
  cover text,
  birth_date date,
  death_date date,
  quote text,
  bio text,
  access_group text not null default 'public',
  add_to_sky boolean not null default true,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

alter table public.memorials enable row level security;

drop policy if exists "memorials_select_all" on public.memorials;
create policy "memorials_select_all"
  on public.memorials for select
  using (true);

drop policy if exists "memorials_insert_own" on public.memorials;
create policy "memorials_insert_own"
  on public.memorials for insert
  with check (auth.uid() = created_by);

drop policy if exists "memorials_update_own" on public.memorials;
create policy "memorials_update_own"
  on public.memorials for update
  using (auth.uid() = created_by);

drop policy if exists "memorials_delete_own" on public.memorials;
create policy "memorials_delete_own"
  on public.memorials for delete
  using (auth.uid() = created_by);

-- ============================================================
-- TRIBUTES
-- ============================================================
create table if not exists public.tributes (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  content text not null,
  type text not null default 'Saudade',
  image text,
  created_at timestamptz not null default now()
);

alter table public.tributes enable row level security;

drop policy if exists "tributes_select_all" on public.tributes;
create policy "tributes_select_all"
  on public.tributes for select
  using (true);

drop policy if exists "tributes_insert_own" on public.tributes;
create policy "tributes_insert_own"
  on public.tributes for insert
  with check (auth.uid() = author_id);

drop policy if exists "tributes_update_own" on public.tributes;
create policy "tributes_update_own"
  on public.tributes for update
  using (auth.uid() = author_id);

drop policy if exists "tributes_delete_own" on public.tributes;
create policy "tributes_delete_own"
  on public.tributes for delete
  using (auth.uid() = author_id);

-- ============================================================
-- CANDLES (uma vela por usuário por memorial)
-- ============================================================
create table if not exists public.candles (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (memorial_id, user_id)
);

alter table public.candles enable row level security;

drop policy if exists "candles_select_all" on public.candles;
create policy "candles_select_all"
  on public.candles for select
  using (true);

drop policy if exists "candles_insert_own" on public.candles;
create policy "candles_insert_own"
  on public.candles for insert
  with check (auth.uid() = user_id);

drop policy if exists "candles_delete_own" on public.candles;
create policy "candles_delete_own"
  on public.candles for delete
  using (auth.uid() = user_id);

-- ============================================================
-- INVITES (convites para a família acompanhar um memorial)
-- ============================================================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text,
  code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

drop policy if exists "invites_select_own" on public.invites;
create policy "invites_select_own"
  on public.invites for select
  using (auth.uid() = invited_by);

drop policy if exists "invites_insert_own" on public.invites;
create policy "invites_insert_own"
  on public.invites for insert
  with check (auth.uid() = invited_by);

drop policy if exists "invites_update_own" on public.invites;
create policy "invites_update_own"
  on public.invites for update
  using (auth.uid() = invited_by);

drop policy if exists "invites_delete_own" on public.invites;
create policy "invites_delete_own"
  on public.invites for delete
  using (auth.uid() = invited_by);

-- ============================================================
-- Índices úteis
-- ============================================================
create index if not exists idx_memorials_created_by on public.memorials(created_by);
create index if not exists idx_tributes_memorial_id on public.tributes(memorial_id);
create index if not exists idx_candles_memorial_id on public.candles(memorial_id);
create index if not exists idx_invites_memorial_id on public.invites(memorial_id);
