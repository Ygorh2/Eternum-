-- Etapa 3: upload real de mídia (Supabase Storage)
-- Rode este arquivo no mesmo SQL Editor, depois do 0001_core_schema.sql
-- https://supabase.com/dashboard/project/sxnbdibtwujbfnscjfnh/sql/new

-- Bucket público (as fotos de memorial são visíveis para quem acessa a página)
insert into storage.buckets (id, name, public)
values ('memorial-media', 'memorial-media', true)
on conflict (id) do nothing;

-- Guarda a galeria (fotos/vídeos) de cada memorial
alter table public.memorials add column if not exists gallery jsonb not null default '[]'::jsonb;

-- Qualquer pessoa pode VER os arquivos (o bucket é público)
drop policy if exists "memorial_media_public_read" on storage.objects;
create policy "memorial_media_public_read"
  on storage.objects for select
  using (bucket_id = 'memorial-media');

-- Só o dono pode enviar/atualizar/apagar dentro da SUA pasta (memorial-media/<user_id>/...)
drop policy if exists "memorial_media_insert_own" on storage.objects;
create policy "memorial_media_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'memorial-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "memorial_media_update_own" on storage.objects;
create policy "memorial_media_update_own"
  on storage.objects for update
  using (
    bucket_id = 'memorial-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "memorial_media_delete_own" on storage.objects;
create policy "memorial_media_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'memorial-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
