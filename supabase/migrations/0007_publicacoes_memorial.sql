-- Etapa 10: publicações com foto/vídeo e legenda em memoriais já criados
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS da 0005 e da 0006.
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- Antes: fotos e vídeos só entravam na galeria no momento de criar o memorial,
-- e as homenagens eram só texto.
--
-- Quem pode publicar: qualquer pessoa logada que consegue VER o memorial
-- (mesma regra das homenagens: público = todos; família/convidados = quem tem
-- acesso, via can_view_memorial da 0005).
-- Quem pode apagar: quem publicou, ou o dono do memorial (moderação).
-- Ninguém edita a publicação depois (não há policy de update).

-- ============================================================
-- MEMORIAL_POSTS
-- media: lista de { "url": "...", "type": "image" | "video" } (1 a 10 itens)
-- ============================================================
create table if not exists public.memorial_posts (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references public.memorials(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  caption text check (caption is null or char_length(caption) <= 2200),
  media jsonb not null
    check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) between 1 and 10),
  created_at timestamptz not null default now()
);

alter table public.memorial_posts enable row level security;

drop policy if exists "memorial_posts_select_allowed" on public.memorial_posts;
create policy "memorial_posts_select_allowed"
  on public.memorial_posts for select
  using (public.can_view_memorial(memorial_id));

drop policy if exists "memorial_posts_insert_own" on public.memorial_posts;
create policy "memorial_posts_insert_own"
  on public.memorial_posts for insert
  with check (auth.uid() = author_id and public.can_view_memorial(memorial_id));

drop policy if exists "memorial_posts_delete_own_or_owner" on public.memorial_posts;
create policy "memorial_posts_delete_own_or_owner"
  on public.memorial_posts for delete
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.memorials m
      where m.id = memorial_id and m.created_by = auth.uid()
    )
  );

create index if not exists idx_memorial_posts_memorial_created
  on public.memorial_posts(memorial_id, created_at desc);

-- ============================================================
-- STORAGE: limite de tamanho e tipos aceitos no bucket memorial-media
-- (o app já avisa antes de enviar: fotos até 10 MB, vídeos até 50 MB;
-- aqui o servidor garante o teto de 50 MB e só aceita imagem/vídeo).
-- Vale também para as fotos/galeria da criação de memorial.
-- ============================================================
update storage.buckets
set file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = array['image/*', 'video/*']
where id = 'memorial-media';
