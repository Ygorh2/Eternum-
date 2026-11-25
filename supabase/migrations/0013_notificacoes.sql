-- Etapa 13: notificações dentro do app (estilo Instagram)
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS da 0005, 0006 e 0007.
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- O que gera notificação (para quem):
--   follow    -> alguém começou a seguir você (follows)
--   candle    -> alguém acendeu uma vela num memorial seu (candles)
--   reaction  -> alguém reagiu (🙏/❤️) a um post seu (post_reactions)
--   comment   -> alguém comentou num post seu (post_comments)
--   tribute   -> nova homenagem num memorial que você criou ou segue (tributes)
--   post      -> nova publicação com foto num memorial que você criou ou segue (memorial_posts)
--
-- Privacidade:
--   * A notificação NÃO guarda texto de comentário, homenagem ou legenda.
--     Só guarda quem fez, o tipo e o memorial. O nome do memorial é lido pelo
--     app passando pela RLS de memorials.
--   * A leitura só devolve a notificação se ela for sua E, quando ela aponta
--     para um memorial, se você ainda consegue ver esse memorial
--     (can_view_memorial da 0005). Ex.: perdeu acesso a um memorial de
--     família -> as notificações dele somem.
--   * Ninguém cria notificação pelo app: só os gatilhos abaixo (no banco).
--   * Pelo app a pessoa só pode marcar como lida (coluna read_at) e apagar
--     as próprias notificações.
--
-- Preferência: a chave "Notificações" em Configurações grava em
-- notification_settings. Desligada = o banco para de criar notificações
-- para você.

-- ============================================================
-- NOTIFICATION_SETTINGS (chave liga/desliga em Configurações)
-- ============================================================
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

drop policy if exists "notification_settings_select_own" on public.notification_settings;
create policy "notification_settings_select_own"
  on public.notification_settings for select
  using (auth.uid() = user_id);

drop policy if exists "notification_settings_insert_own" on public.notification_settings;
create policy "notification_settings_insert_own"
  on public.notification_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "notification_settings_update_own" on public.notification_settings;
create policy "notification_settings_update_own"
  on public.notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  type text not null
    check (type in ('follow', 'candle', 'reaction', 'comment', 'tribute', 'post')),
  memorial_id uuid references public.memorials(id) on delete cascade,
  post_key text check (post_key is null or char_length(post_key) <= 600),
  reaction text check (reaction is null or reaction in ('amen', 'love')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own_visible" on public.notifications;
create policy "notifications_select_own_visible"
  on public.notifications for select
  using (
    auth.uid() = recipient_id
    and (memorial_id is null or public.can_view_memorial(memorial_id))
  );

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (auth.uid() = recipient_id);

-- Sem policy de INSERT: só os gatilhos (security definer) criam notificações.
-- Além da RLS, limita por coluna: pelo app só dá para mudar read_at.
revoke insert, update on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_id, created_at desc);
create index if not exists idx_notifications_recipient_unread
  on public.notifications(recipient_id) where read_at is null;
create index if not exists idx_notifications_memorial_id
  on public.notifications(memorial_id);

-- ============================================================
-- Função central: cria uma notificação respeitando as regras
--   * não notifica a própria pessoa
--   * respeita a chave desligada em Configurações
--   * evita repetição (ex.: tirar e pôr a mesma reação várias vezes)
-- ============================================================
create or replace function public.create_notification(
  p_recipient uuid,
  p_actor uuid,
  p_type text,
  p_memorial uuid default null,
  p_post_key text default null,
  p_reaction text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient is null or p_recipient = p_actor then
    return;
  end if;

  if exists (
    select 1 from public.notification_settings s
    where s.user_id = p_recipient and s.enabled = false
  ) then
    return;
  end if;

  -- Mesma ação, da mesma pessoa, nas últimas 24h: não repete.
  -- (comentários, homenagens e publicações são sempre coisas novas)
  if p_type in ('follow', 'candle', 'reaction') and exists (
    select 1 from public.notifications n
    where n.recipient_id = p_recipient
      and n.actor_id is not distinct from p_actor
      and n.type = p_type
      and n.memorial_id is not distinct from p_memorial
      and n.post_key is not distinct from p_post_key
      and n.reaction is not distinct from p_reaction
      and n.created_at > now() - interval '24 hours'
  ) then
    return;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, memorial_id, post_key, reaction)
  values (p_recipient, p_actor, p_type, p_memorial, p_post_key, p_reaction);
end;
$$;

-- Dono do "post" (para reações e comentários):
--   tribute:<id> -> autor da homenagem
--   post:<id>    -> autor da publicação
--   memorial:... / gallery:... -> dono do memorial
-- Só aceita a homenagem/publicação se ela for do MESMO memorial; senão cai
-- para o dono do memorial (post_key vem do app e não é confiável).
create or replace function public.post_owner_id(p_memorial uuid, p_post_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id text;
  v_owner uuid;
  uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if p_post_key like 'tribute:%' then
    v_id := substr(p_post_key, 9);
    if v_id ~ uuid_re then
      select t.author_id into v_owner
      from public.tributes t
      where t.id = v_id::uuid and t.memorial_id = p_memorial;
    end if;
  elsif p_post_key like 'post:%' then
    v_id := substr(p_post_key, 6);
    if v_id ~ uuid_re and to_regclass('public.memorial_posts') is not null then
      execute 'select author_id from public.memorial_posts where id = $1 and memorial_id = $2'
        into v_owner using v_id::uuid, p_memorial;
    end if;
  end if;

  if v_owner is null then
    select m.created_by into v_owner from public.memorials m where m.id = p_memorial;
  end if;
  return v_owner;
end;
$$;

-- Ninguém chama essas duas funções pelo app; só os gatilhos.
revoke all on function public.create_notification(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.post_owner_id(uuid, text) from public, anon, authenticated;

-- ============================================================
-- Gatilhos. Cada um engole erros: uma falha na notificação nunca pode
-- impedir a pessoa de seguir, acender vela, reagir, comentar ou publicar.
-- ============================================================

-- follows -> "começou a seguir você"
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.create_notification(new.following_id, new.follower_id, 'follow');
  exception when others then
    raise warning 'notify_on_follow: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_follow on public.follows;
create trigger trg_notify_on_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();

-- candles -> "acendeu uma vela" (para o dono do memorial)
create or replace function public.notify_on_candle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.create_notification(
      (select m.created_by from public.memorials m where m.id = new.memorial_id),
      new.user_id, 'candle', new.memorial_id
    );
  exception when others then
    raise warning 'notify_on_candle: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_candle on public.candles;
create trigger trg_notify_on_candle
  after insert on public.candles
  for each row execute function public.notify_on_candle();

-- post_reactions -> "reagiu ao seu post" (para o dono do post)
create or replace function public.notify_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.create_notification(
      public.post_owner_id(new.memorial_id, new.post_key),
      new.user_id, 'reaction', new.memorial_id, new.post_key, new.reaction
    );
  exception when others then
    raise warning 'notify_on_reaction: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_reaction on public.post_reactions;
create trigger trg_notify_on_reaction
  after insert on public.post_reactions
  for each row execute function public.notify_on_reaction();

-- post_comments -> "comentou no seu post" (para o dono do post)
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.create_notification(
      public.post_owner_id(new.memorial_id, new.post_key),
      new.user_id, 'comment', new.memorial_id, new.post_key
    );
  exception when others then
    raise warning 'notify_on_comment: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_comment on public.post_comments;
create trigger trg_notify_on_comment
  after insert on public.post_comments
  for each row execute function public.notify_on_comment();

-- Novo conteúdo num memorial -> dono do memorial + quem segue o memorial
create or replace function public.notify_memorial_audience(
  p_memorial uuid,
  p_actor uuid,
  p_type text,
  p_post_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select m.created_by as user_id from public.memorials m where m.id = p_memorial
    union
    select mf.user_id from public.memorial_follows mf where mf.memorial_id = p_memorial
  loop
    perform public.create_notification(r.user_id, p_actor, p_type, p_memorial, p_post_key);
  end loop;
end;
$$;

revoke all on function public.notify_memorial_audience(uuid, uuid, text, text) from public, anon, authenticated;

-- tributes -> "deixou uma homenagem"
create or replace function public.notify_on_tribute()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.notify_memorial_audience(
      new.memorial_id, new.author_id, 'tribute', 'tribute:' || new.id::text
    );
  exception when others then
    raise warning 'notify_on_tribute: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_tribute on public.tributes;
create trigger trg_notify_on_tribute
  after insert on public.tributes
  for each row execute function public.notify_on_tribute();

-- memorial_posts -> "publicou uma foto"
create or replace function public.notify_on_memorial_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.notify_memorial_audience(
      new.memorial_id, new.author_id, 'post', 'post:' || new.id::text
    );
  exception when others then
    raise warning 'notify_on_memorial_post: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_notify_on_memorial_post on public.memorial_posts;
create trigger trg_notify_on_memorial_post
  after insert on public.memorial_posts
  for each row execute function public.notify_on_memorial_post();

-- Funções de gatilho também não ficam expostas como RPC.
revoke all on function public.notify_on_follow() from public, anon, authenticated;
revoke all on function public.notify_on_candle() from public, anon, authenticated;
revoke all on function public.notify_on_reaction() from public, anon, authenticated;
revoke all on function public.notify_on_comment() from public, anon, authenticated;
revoke all on function public.notify_on_tribute() from public, anon, authenticated;
revoke all on function public.notify_on_memorial_post() from public, anon, authenticated;

-- ============================================================
-- Realtime: o sininho atualiza na hora quando chega notificação.
-- O Realtime respeita a RLS acima (cada pessoa só recebe as suas).
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
