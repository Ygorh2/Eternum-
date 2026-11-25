-- Etapa 8: memoriais privados de verdade
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois das anteriores
-- (0001..0004). Ele é idempotente: pode rodar de novo sem quebrar nada.
--
-- Antes: a policy "memorials_select_all" usava `using (true)`, então QUALQUER
-- pessoa (até sem login) lia todos os memoriais, tributos e velas, mesmo os
-- marcados como "Família e Amigos Próximos" ou "Apenas Convidados".
--
-- Regras de acesso (coluna memorials.access_group):
--   'public'  -> qualquer pessoa, inclusive visitante sem login.
--   'family'  -> "Família e Amigos Próximos": o dono + pessoas que o DONO segue
--                (aceitar um convite já cria o "seguir" mútuo) + quem aceitou
--                um convite do dono.
--   'invited' -> "Apenas Convidados": o dono + quem aceitou um convite do dono
--                (convite geral, sem memorial, ou convite deste memorial).
--   qualquer outro valor -> só o dono (fechado por segurança).
--
-- Observação: "seguir" vale a partir do DONO (follower_id = dono), e não de
-- quem segue o dono, porque qualquer pessoa pode seguir qualquer pessoa;
-- se valesse o contrário, bastaria seguir alguém para ver os memoriais dele.

-- ============================================================
-- Padrão: privado ("Família e Amigos Próximos"), como a tela de criação diz
-- ============================================================
alter table public.memorials alter column access_group set default 'family';

-- ============================================================
-- Funções de verificação de acesso
-- SECURITY DEFINER: precisam ler follows/invites/memorials sem esbarrar na RLS
-- dessas tabelas (o convidado não pode ler a linha do convite, por exemplo).
-- Elas só devolvem true/false e sempre usam auth.uid() de quem chamou.
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
    );
$$;

-- Versão por id, usada nas tabelas filhas (tributes, candles)
create or replace function public.can_view_memorial(p_memorial_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memorials m
    where m.id = p_memorial_id
      and public.can_view_memorial_row(m.id, m.created_by, m.access_group)
  );
$$;

revoke all on function public.can_view_memorial_row(uuid, uuid, text) from public;
revoke all on function public.can_view_memorial(uuid) from public;
grant execute on function public.can_view_memorial_row(uuid, uuid, text) to anon, authenticated;
grant execute on function public.can_view_memorial(uuid) to anon, authenticated;

-- ============================================================
-- MEMORIALS: leitura só para quem tem acesso
-- ============================================================
drop policy if exists "memorials_select_all" on public.memorials;
drop policy if exists "memorials_select_allowed" on public.memorials;
create policy "memorials_select_allowed"
  on public.memorials for select
  using (public.can_view_memorial_row(id, created_by, access_group));

-- ============================================================
-- TRIBUTES: só lê/escreve quem pode ver o memorial
-- ============================================================
drop policy if exists "tributes_select_all" on public.tributes;
drop policy if exists "tributes_select_allowed" on public.tributes;
create policy "tributes_select_allowed"
  on public.tributes for select
  using (public.can_view_memorial(memorial_id));

drop policy if exists "tributes_insert_own" on public.tributes;
create policy "tributes_insert_own"
  on public.tributes for insert
  with check (auth.uid() = author_id and public.can_view_memorial(memorial_id));

-- ============================================================
-- CANDLES: só lê/acende quem pode ver o memorial
-- ============================================================
drop policy if exists "candles_select_all" on public.candles;
drop policy if exists "candles_select_allowed" on public.candles;
create policy "candles_select_allowed"
  on public.candles for select
  using (public.can_view_memorial(memorial_id));

drop policy if exists "candles_insert_own" on public.candles;
create policy "candles_insert_own"
  on public.candles for insert
  with check (auth.uid() = user_id and public.can_view_memorial(memorial_id));

-- ============================================================
-- Índices para as verificações acima
-- ============================================================
create index if not exists idx_memorials_access_group on public.memorials(access_group);
create index if not exists idx_follows_following_id on public.follows(following_id);
create index if not exists idx_invites_accepted_by on public.invites(accepted_by);
create index if not exists idx_invites_invited_by on public.invites(invited_by);
