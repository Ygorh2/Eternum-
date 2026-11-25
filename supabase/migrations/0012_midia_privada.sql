-- Etapa 12: fotos e vídeos de memoriais privados deixam de ser públicos
-- Rode este arquivo inteiro no SQL Editor do Supabase, DEPOIS da 0005 e da 0007.
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- Antes: o bucket "memorial-media" é PÚBLICO. Quem tiver o link de uma foto
-- (copiado do app, de um print, do histórico) abre a foto, mesmo que o
-- memorial seja "Família e Amigos Próximos" ou "Apenas Convidados".
--
-- Depois (quando o bucket for marcado como privado no painel — veja o PR):
--   * o app pede ao Supabase um link TEMPORÁRIO (assinado) para cada arquivo;
--   * o Supabase só entrega esse link para quem pode VER o memorial ao qual o
--     arquivo pertence (mesma regra da 0005: can_view_memorial);
--   * links antigos do tipo ".../object/public/memorial-media/..." param de
--     funcionar.
--
-- Os arquivos que já existem NÃO mudam de lugar: a regra descobre a qual
-- memorial cada arquivo pertence procurando o caminho dele nas colunas que já
-- guardam os links (memorials.photo/cover/gallery, memorial_posts.media e
-- tributes.image). Por isso não há cópia nem renomeação de arquivos.
--
-- Rodar este arquivo com o bucket AINDA público não muda nada para quem usa o
-- app (o link público ignora estas regras). Só passa a valer quando o bucket
-- for marcado como privado.

-- ============================================================
-- Caminho do arquivo dentro do bucket a partir do link salvo no banco.
-- Aceita links públicos (.../object/public/memorial-media/<caminho>) e,
-- por segurança, links assinados (.../object/sign/memorial-media/<caminho>?token=...).
-- Devolve null para links de fora do nosso bucket.
-- ============================================================
create or replace function public.memorial_media_path(p_url text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    (regexp_match(p_url, '/storage/v1/object/(public|sign|authenticated)/memorial-media/([^?#]+)'))[2],
    ''
  );
$$;

-- Itens de uma lista jsonb de mídia: aceita { "url": "..." } ou só "..."
create or replace function public.memorial_media_list_has(p_list jsonb, p_name text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_list is null or jsonb_typeof(p_list) <> 'array' then false
    else exists (
      select 1
      from jsonb_array_elements(p_list) as item
      where public.memorial_media_path(
        case jsonb_typeof(item)
          when 'object' then item ->> 'url'
          when 'string' then item #>> '{}'
          else null
        end
      ) = p_name
    )
  end;
$$;

-- ============================================================
-- Quem pode VER (baixar / gerar link temporário de) um arquivo do bucket.
--
-- Os arquivos ficam em memorial-media/<id_de_quem_enviou>/<subpasta>/<arquivo>.
-- Pode ver:
--   1) quem enviou o arquivo (a pasta é dele) — necessário logo após o
--      upload, antes do memorial/publicação existir;
--   2) quem pode ver um memorial cuja foto, capa ou galeria usa o arquivo;
--   3) quem pode ver o memorial de uma publicação (memorial_posts) que usa o arquivo;
--   4) quem pode ver o memorial de uma homenagem (tributes.image) que usa o arquivo.
--
-- Importante: nos casos 2 a 4 a linha que usa o arquivo precisa ser do MESMO
-- dono da pasta (created_by / author_id). Sem isso, alguém poderia criar um
-- memorial público próprio apontando para a foto privada de outra pessoa e,
-- assim, "destrancar" a foto.
--
-- SECURITY DEFINER: precisa ler memoriais/publicações sem esbarrar na RLS;
-- só devolve true/false e sempre usa auth.uid() de quem chamou.
-- ============================================================
create or replace function public.can_view_media_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with f as (
    select split_part(p_name, '/', 1) as owner_folder
  )
  select
    -- 1) dono da pasta
    (auth.uid() is not null and (select owner_folder from f) = auth.uid()::text)
    -- 2) foto, capa ou galeria de um memorial
    or exists (
      select 1 from public.memorials m
      where m.created_by::text = (select owner_folder from f)
        and (
          public.memorial_media_path(m.photo) = p_name
          or public.memorial_media_path(m.cover) = p_name
          or public.memorial_media_list_has(m.gallery, p_name)
        )
        and public.can_view_memorial_row(m.id, m.created_by, m.access_group)
    )
    -- 3) publicação com foto/vídeo
    or exists (
      select 1 from public.memorial_posts p
      where p.author_id::text = (select owner_folder from f)
        and public.memorial_media_list_has(p.media, p_name)
        and public.can_view_memorial(p.memorial_id)
    )
    -- 4) imagem de homenagem
    or exists (
      select 1 from public.tributes t
      where t.author_id::text = (select owner_folder from f)
        and public.memorial_media_path(t.image) = p_name
        and public.can_view_memorial(t.memorial_id)
    );
$$;

revoke all on function public.can_view_media_object(text) from public;
grant execute on function public.can_view_media_object(text) to anon, authenticated;

-- ============================================================
-- STORAGE: troca a leitura "qualquer pessoa" pela regra acima.
-- Upload/alteração/remoção continuam como na 0002 (só na própria pasta).
-- ============================================================
drop policy if exists "memorial_media_public_read" on storage.objects;
drop policy if exists "memorial_media_read_allowed" on storage.objects;
create policy "memorial_media_read_allowed"
  on storage.objects for select
  using (
    bucket_id = 'memorial-media'
    and public.can_view_media_object(name)
  );

-- ============================================================
-- Índices: a regra procura as linhas pelo dono da pasta
-- (memorials.created_by já tem índice desde a 0001)
-- ============================================================
create index if not exists idx_memorial_posts_author_id on public.memorial_posts(author_id);
create index if not exists idx_tributes_author_id on public.tributes(author_id);

-- ============================================================
-- O bucket NÃO é marcado como privado aqui de propósito.
-- Primeiro publique a versão nova do app (que usa links temporários);
-- depois desligue "Public bucket" no painel (passo a passo no PR).
-- Se preferir fazer por SQL, o comando é:
--   update storage.buckets set public = false where id = 'memorial-media';
-- E para voltar atrás em caso de problema:
--   update storage.buckets set public = true where id = 'memorial-media';
-- ============================================================
