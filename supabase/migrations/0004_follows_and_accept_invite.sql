-- Etapa 6: aceitar convite + sistema de seguir usuários
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois das anteriores.

-- ============================================================
-- PROFILES (espelho público e seguro dos dados de auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Mantém profiles sincronizado automaticamente com auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set display_name = excluded.display_name,
        username = excluded.username,
        avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.handle_new_user();

-- Preenche profiles para quem já tinha conta antes desta migration
insert into public.profiles (id, display_name, username, avatar_url)
select id,
       raw_user_meta_data->>'display_name',
       raw_user_meta_data->>'username',
       raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ============================================================
-- FOLLOWS (seguir usuários)
-- ============================================================
create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all"
  on public.follows for select
  using (true);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ============================================================
-- INVITES: colunas extras + funções seguras para aceitar
-- ============================================================
alter table public.invites add column if not exists accepted_by uuid references auth.users(id);
alter table public.invites add column if not exists accepted_at timestamptz;

-- Prévia pública do convite (nome de quem convidou), sem expor a tabela toda
create or replace function public.get_invite_preview(p_code text)
returns table (code text, status text, inviter_id uuid, inviter_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select i.code, i.status, i.invited_by,
           coalesce(p.display_name, p.username, 'Alguém')
    from public.invites i
    left join public.profiles p on p.id = i.invited_by
    where i.code = p_code;
end;
$$;

grant execute on function public.get_invite_preview(text) to anon, authenticated;

-- Aceitar convite: valida, marca como aceito e cria conexão mútua de "seguir"
create or replace function public.accept_invite(p_code text)
returns public.invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
begin
  if auth.uid() is null then
    raise exception 'Você precisa estar logado para aceitar um convite.';
  end if;

  select * into v_invite from public.invites where code = p_code and status = 'pending' for update;
  if not found then
    raise exception 'Convite inválido ou já utilizado.';
  end if;

  if v_invite.invited_by = auth.uid() then
    raise exception 'Você não pode aceitar seu próprio convite.';
  end if;

  update public.invites
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = v_invite.id
  returning * into v_invite;

  insert into public.follows (follower_id, following_id)
  values (auth.uid(), v_invite.invited_by)
  on conflict do nothing;

  insert into public.follows (follower_id, following_id)
  values (v_invite.invited_by, auth.uid())
  on conflict do nothing;

  return v_invite;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;
