-- Etapa 15: denunciar conteúdo e bloquear pessoas
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS da 0005, 0006,
-- 0007 e 0013 (ele usa funções e tabelas dessas etapas).
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- BLOQUEIO (tabela user_blocks)
--   Quando VOCÊ bloqueia alguém:
--   * você deixa de ver o que essa pessoa escreveu (homenagens, comentários,
--     publicações) e os memoriais que ela criou;
--   * ela deixa de ver os seus memoriais (inclusive fotos) enquanto estiver
--     logada, e por isso não consegue acender vela, homenagear, publicar,
--     reagir, comentar nem seguir os seus memoriais;
--   * ela também não consegue reagir/comentar nas suas homenagens e
--     publicações em memoriais de outras pessoas;
--   * vocês deixam de se seguir (nos dois sentidos) e ninguém volta a seguir
--     enquanto o bloqueio existir;
--   * nenhum dos dois recebe notificação do outro, e as notificações antigas
--     dela somem da sua lista.
--   A pessoa bloqueada NÃO é avisada e não consegue ver quem a bloqueou.
--   Desbloquear desfaz tudo, menos os "seguir" (é preciso seguir de novo).
--
-- DENÚNCIAS (tabela reports)
--   * Qualquer pessoa logada denuncia um memorial, homenagem, publicação,
--     comentário ou perfil, com um motivo e um texto opcional.
--   * O banco confere se a pessoa consegue ver o que está denunciando, guarda
--     quem é o autor e uma CÓPIA do texto (para a análise funcionar mesmo se
--     o conteúdo for apagado depois). O app não consegue falsificar isso.
--   * Só administradores (tabela app_admins) leem as denúncias e mudam o
--     status. Ninguém vira administrador pelo app: só pelo SQL Editor.

-- ============================================================
-- Conferência: as etapas anteriores precisam estar aplicadas
-- ============================================================
do $$
begin
  if to_regclass('public.notifications') is null
     or to_regclass('public.memorial_posts') is null
     or to_regclass('public.post_comments') is null
     or to_regprocedure('public.post_owner_id(uuid, text)') is null then
    raise exception 'Rode antes as migrations 0005, 0006, 0007 e 0013 (nesta ordem) e depois esta 0015.';
  end if;
end;
$$;

-- ============================================================
-- USER_BLOCKS
-- ============================================================
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

-- Cada pessoa só vê, cria e apaga os PRÓPRIOS bloqueios.
-- (a pessoa bloqueada não consegue descobrir quem a bloqueou)
drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

revoke all on public.user_blocks from anon;
revoke update on public.user_blocks from authenticated;
grant select, insert, delete on public.user_blocks to authenticated;

create index if not exists idx_user_blocks_blocked_id on public.user_blocks(blocked_id);

-- ============================================================
-- Funções de apoio (só devolvem true/false; sempre usam auth.uid()).
-- SECURITY DEFINER porque visitantes (anon) não leem user_blocks, mas as
-- regras abaixo precisam consultar a tabela para qualquer pessoa.
-- ============================================================

-- Eu bloqueei esta pessoa?
create or replace function public.i_blocked(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and p_user is not null and exists (
    select 1 from public.user_blocks b
    where b.blocker_id = auth.uid() and b.blocked_id = p_user
  );
$$;

-- Esta pessoa me bloqueou?
create or replace function public.is_blocked_by(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and p_user is not null and exists (
    select 1 from public.user_blocks b
    where b.blocker_id = p_user and b.blocked_id = auth.uid()
  );
$$;

-- Há bloqueio entre duas pessoas (em qualquer sentido)? Uso interno.
create or replace function public.users_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_a is not null and p_b is not null and exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- O dono do post (homenagem/publicação) ou do memorial me bloqueou?
create or replace function public.blocked_from_post(p_memorial uuid, p_post_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_blocked_by((select m.created_by from public.memorials m where m.id = p_memorial))
    or public.is_blocked_by(public.post_owner_id(p_memorial, p_post_key))
  );
$$;

revoke all on function public.i_blocked(uuid) from public;
revoke all on function public.is_blocked_by(uuid) from public;
revoke all on function public.users_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke all on function public.blocked_from_post(uuid, text) from public;
grant execute on function public.i_blocked(uuid) to anon, authenticated;
grant execute on function public.is_blocked_by(uuid) to anon, authenticated;
grant execute on function public.blocked_from_post(uuid, text) to anon, authenticated;

-- ============================================================
-- Quem pode ver um memorial (função da 0005), agora também respeitando
-- bloqueios: se você bloqueou o dono, ou o dono bloqueou você, o memorial
-- some para você. Como as homenagens, velas, publicações, reações,
-- comentários, notificações e fotos (0012) usam esta mesma regra, tudo
-- isso some junto. A regra antiga continua igual (só ganhou o último "and").
-- ============================================================
create or replace function public.can_view_memorial_row(
  p_memorial_id uuid,
  p_created_by uuid,
  p_access_group text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_access_group = 'public'
      or (
        auth.uid() is not null
        and (
          auth.uid() = p_created_by
          or (
            p_access_group = 'family'
            and (
              exists (
                select 1 from public.follows f
                where f.follower_id = p_created_by
                  and f.following_id = auth.uid()
              )
              or exists (
                select 1 from public.invites i
                where i.invited_by = p_created_by
                  and i.accepted_by = auth.uid()
                  and i.status = 'accepted'
              )
            )
          )
          or (
            p_access_group = 'invited'
            and exists (
              select 1 from public.invites i
              where i.invited_by = p_created_by
                and i.accepted_by = auth.uid()
                and i.status = 'accepted'
                and (i.memorial_id is null or i.memorial_id = p_memorial_id)
            )
          )
        )
      )
    )
    and (
      auth.uid() is null
      or auth.uid() = p_created_by
      or not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = p_created_by)
           or (b.blocker_id = p_created_by and b.blocked_id = auth.uid())
      )
    );
$$;

-- ============================================================
-- Esconder de quem bloqueou o que a pessoa bloqueada escreveu.
-- São policies RESTRICTIVE: valem JUNTO com as que já existem (um "e a mais"),
-- sem mudar nenhuma delas.
-- ============================================================
drop policy if exists "tributes_hide_blocked_authors" on public.tributes;
create policy "tributes_hide_blocked_authors"
  on public.tributes as restrictive for select
  using (not public.i_blocked(author_id));

drop policy if exists "post_comments_hide_blocked_authors" on public.post_comments;
create policy "post_comments_hide_blocked_authors"
  on public.post_comments as restrictive for select
  using (not public.i_blocked(user_id));

drop policy if exists "memorial_posts_hide_blocked_authors" on public.memorial_posts;
create policy "memorial_posts_hide_blocked_authors"
  on public.memorial_posts as restrictive for select
  using (not public.i_blocked(author_id));

drop policy if exists "notifications_hide_blocked_actors" on public.notifications;
create policy "notifications_hide_blocked_actors"
  on public.notifications as restrictive for select
  using (not public.i_blocked(actor_id));

-- ============================================================
-- Impedir interações de quem foi bloqueado.
-- (memoriais do dono já ficam invisíveis pela função acima; aqui cobrimos
-- homenagens/publicações da pessoa em memoriais de outras pessoas, e o
-- "seguir" entre usuários)
-- ============================================================
drop policy if exists "post_reactions_insert_not_blocked" on public.post_reactions;
create policy "post_reactions_insert_not_blocked"
  on public.post_reactions as restrictive for insert
  with check (not public.blocked_from_post(memorial_id, post_key));

drop policy if exists "post_comments_insert_not_blocked" on public.post_comments;
create policy "post_comments_insert_not_blocked"
  on public.post_comments as restrictive for insert
  with check (not public.blocked_from_post(memorial_id, post_key));

drop policy if exists "follows_insert_not_blocked" on public.follows;
create policy "follows_insert_not_blocked"
  on public.follows as restrictive for insert
  with check (
    not public.is_blocked_by(following_id)
    and not public.i_blocked(following_id)
  );

-- ============================================================
-- Ao bloquear: desfaz os "seguir" entre as duas pessoas (nos dois sentidos)
-- e tira a pessoa bloqueada dos seguidores dos memoriais de quem bloqueou.
-- Obs.: no memorial "Família e Amigos", quem o dono segue tem acesso; ao
-- desfazer o "seguir", a pessoa bloqueada perde esse acesso.
-- ============================================================
create or replace function public.on_user_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows f
  where (f.follower_id = new.blocker_id and f.following_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.following_id = new.blocker_id);

  delete from public.memorial_follows mf
  where mf.user_id = new.blocked_id
    and mf.memorial_id in (
      select m.id from public.memorials m where m.created_by = new.blocker_id
    );
  return new;
end;
$$;

drop trigger if exists trg_on_user_block on public.user_blocks;
create trigger trg_on_user_block
  after insert on public.user_blocks
  for each row execute function public.on_user_block();

-- ============================================================
-- Notificações: o banco descarta qualquer notificação entre duas pessoas
-- que se bloquearam (vale para todos os gatilhos da 0013).
-- ============================================================
create or replace function public.notifications_skip_blocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.users_blocked_between(new.recipient_id, new.actor_id) then
    return null; -- não grava
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_skip_blocked on public.notifications;
create trigger trg_notifications_skip_blocked
  before insert on public.notifications
  for each row execute function public.notifications_skip_blocked();

revoke all on function public.on_user_block() from public, anon, authenticated;
revoke all on function public.notifications_skip_blocked() from public, anon, authenticated;

-- ============================================================
-- APP_ADMINS: quem pode analisar denúncias.
-- Sem nenhuma policy: pelo app ninguém lê nem altera esta tabela.
-- Para se tornar administrador, rode no SQL Editor (troque o e-mail):
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com'
--   on conflict do nothing;
-- ============================================================
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- ============================================================
-- REPORTS (denúncias)
-- ============================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null
    check (target_type in ('memorial', 'tribute', 'post', 'comment', 'user')),
  target_id uuid not null,
  -- preenchidos pelo banco (gatilho abaixo), nunca pelo app:
  memorial_id uuid references public.memorials(id) on delete set null,
  reported_user_id uuid references auth.users(id) on delete set null,
  content_snapshot text,
  reason text not null
    check (reason in ('harassment', 'hate', 'violence', 'sexual', 'spam',
                      'false_info', 'privacy', 'self_harm', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  -- a mesma pessoa não denuncia a mesma coisa duas vezes
  unique (reporter_id, target_type, target_id)
);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() is not null and auth.uid() = reporter_id);

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
  on public.reports for select
  using (public.is_app_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- Sem policy de DELETE: denúncia não é apagada pelo app.
-- Além da RLS, limita por coluna: o app só escolhe o alvo, o motivo e o texto;
-- o administrador só muda o status.
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
grant insert (target_type, target_id, reason, details) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

create index if not exists idx_reports_status_created on public.reports(status, created_at desc);
create index if not exists idx_reports_reporter_created on public.reports(reporter_id, created_at desc);

-- Ao criar a denúncia: confere o alvo e preenche autor, memorial e cópia do texto.
create or replace function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_memorial uuid;
  v_owner uuid;
  v_snapshot text;
begin
  if v_uid is null then
    raise exception 'Entre com sua conta para denunciar.';
  end if;

  if (
    select count(*) from public.reports r
    where r.reporter_id = v_uid and r.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Você enviou muitas denúncias em pouco tempo. Tente de novo mais tarde.';
  end if;

  if new.target_type = 'memorial' then
    select m.id, m.created_by,
           m.name || coalesce(E'\n' || nullif(btrim(m.bio), ''), '')
      into v_memorial, v_owner, v_snapshot
    from public.memorials m where m.id = new.target_id;
  elsif new.target_type = 'tribute' then
    select t.memorial_id, t.author_id, t.content
      into v_memorial, v_owner, v_snapshot
    from public.tributes t where t.id = new.target_id;
  elsif new.target_type = 'post' then
    select p.memorial_id, p.author_id, coalesce(nullif(btrim(p.caption), ''), '(publicação sem legenda)')
      into v_memorial, v_owner, v_snapshot
    from public.memorial_posts p where p.id = new.target_id;
  elsif new.target_type = 'comment' then
    select c.memorial_id, c.user_id, c.content
      into v_memorial, v_owner, v_snapshot
    from public.post_comments c where c.id = new.target_id;
  elsif new.target_type = 'user' then
    select pr.id,
           coalesce(nullif(btrim(pr.display_name), ''), 'Usuário')
             || coalesce(' (@' || nullif(btrim(pr.username), '') || ')', '')
      into v_owner, v_snapshot
    from public.profiles pr where pr.id = new.target_id;
  end if;

  -- Não existe, ou a pessoa não consegue ver (memorial privado etc.)
  if v_owner is null
     or (v_memorial is not null and not public.can_view_memorial(v_memorial)) then
    raise exception 'Não encontramos este conteúdo. Ele pode ter sido apagado.';
  end if;

  if v_owner = v_uid then
    raise exception 'Você não pode denunciar o seu próprio conteúdo.';
  end if;

  new.reporter_id := v_uid;
  new.memorial_id := v_memorial;
  new.reported_user_id := v_owner;
  new.content_snapshot := left(v_snapshot, 2000);
  new.details := nullif(btrim(new.details), '');
  new.status := 'pending';
  new.created_at := now();
  new.reviewed_at := null;
  new.reviewed_by := null;
  return new;
end;
$$;

drop trigger if exists trg_reports_before_insert on public.reports;
create trigger trg_reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

-- Ao mudar o status: registra quando e quem analisou.
create or replace function public.reports_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := case when new.status = 'pending' then null else now() end;
    new.reviewed_by := case when new.status = 'pending' then null else auth.uid() end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reports_before_update on public.reports;
create trigger trg_reports_before_update
  before update on public.reports
  for each row execute function public.reports_before_update();

revoke all on function public.reports_before_insert() from public, anon, authenticated;
revoke all on function public.reports_before_update() from public, anon, authenticated;
