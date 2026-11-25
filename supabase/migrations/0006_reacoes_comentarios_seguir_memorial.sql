-- Etapa 9: reações, comentários e "seguir memorial" salvos de verdade
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois das anteriores
-- (inclusive a 0005_private_memorials.sql, se ela já tiver sido aplicada).
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- As velas NÃO precisam de migration: a tabela public.candles já existe (0001).
--
-- Leitura: as policies de SELECT abaixo não usam "using (true)". Elas só deixam
-- ler a linha se a pessoa consegue ler o memorial dela. O subselect em
-- public.memorials passa pela RLS de memorials, então segue exatamente a regra
-- de privacidade da 0005 (can_view_memorial_row). Funciona também se a 0005
-- ainda não tiver sido aplicada.

-- ============================================================
-- POST_REACTIONS (🙏 Amém e ❤️ Amor em cada post)
-- ============================================================
-- post_key identifica o post no app:
--   memorial:<id do memorial>   -> post de criação do memorial
--   gallery:<url da mídia>      -> foto/vídeo da galeria do memorial
--   tribute:<id da homenagem>   -> homenagem
create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  tribute_id uuid references public.tributes(id) on delete cascade,
  post_key text not null check (char_length(post_key) between 1 and 600),
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('amen', 'love')),
  created_at timestamptz not null default now(),
  unique (post_key, user_id, reaction)
);

alter table public.post_reactions enable row level security;

drop policy if exists "post_reactions_select_visible" on public.post_reactions;
create policy "post_reactions_select_visible"
  on public.post_reactions for select
  using (exists (select 1 from public.memorials m where m.id = memorial_id));

drop policy if exists "post_reactions_insert_own" on public.post_reactions;
create policy "post_reactions_insert_own"
  on public.post_reactions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.memorials m where m.id = memorial_id)
  );

drop policy if exists "post_reactions_delete_own" on public.post_reactions;
create policy "post_reactions_delete_own"
  on public.post_reactions for delete
  using (auth.uid() = user_id);

create index if not exists idx_post_reactions_memorial_id on public.post_reactions(memorial_id);

-- ============================================================
-- POST_COMMENTS (comentários em cada post)
-- ============================================================
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  tribute_id uuid references public.tributes(id) on delete cascade,
  post_key text not null check (char_length(post_key) between 1 and 600),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

drop policy if exists "post_comments_select_visible" on public.post_comments;
create policy "post_comments_select_visible"
  on public.post_comments for select
  using (exists (select 1 from public.memorials m where m.id = memorial_id));

drop policy if exists "post_comments_insert_own" on public.post_comments;
create policy "post_comments_insert_own"
  on public.post_comments for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.memorials m where m.id = memorial_id)
  );

-- Quem escreveu pode apagar; o dono do memorial também (moderação)
drop policy if exists "post_comments_delete_own_or_owner" on public.post_comments;
create policy "post_comments_delete_own_or_owner"
  on public.post_comments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.memorials m
      where m.id = memorial_id and m.created_by = auth.uid()
    )
  );

create index if not exists idx_post_comments_memorial_id on public.post_comments(memorial_id);

-- ============================================================
-- MEMORIAL_FOLLOWS (botão "Seguir" e contador de seguidores do memorial)
-- Diferente de public.follows, que é seguir USUÁRIOS.
-- ============================================================
create table if not exists public.memorial_follows (
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memorial_id, user_id)
);

alter table public.memorial_follows enable row level security;

drop policy if exists "memorial_follows_select_visible" on public.memorial_follows;
create policy "memorial_follows_select_visible"
  on public.memorial_follows for select
  using (exists (select 1 from public.memorials m where m.id = memorial_id));

drop policy if exists "memorial_follows_insert_own" on public.memorial_follows;
create policy "memorial_follows_insert_own"
  on public.memorial_follows for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.memorials m where m.id = memorial_id)
  );

drop policy if exists "memorial_follows_delete_own" on public.memorial_follows;
create policy "memorial_follows_delete_own"
  on public.memorial_follows for delete
  using (auth.uid() = user_id);

create index if not exists idx_memorial_follows_user_id on public.memorial_follows(user_id);
