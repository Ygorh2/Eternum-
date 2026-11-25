-- Etapa: feed paginado (abas "Seguindo" e "Explorar")
-- Rode este arquivo inteiro no SQL Editor do Supabase, depois das anteriores
-- (inclusive a 0007_publicacoes_memorial.sql).
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- Só cria ÍNDICES. Não muda tabelas, dados nem policies (a RLS continua igual:
-- memoriais privados e as homenagens deles só aparecem para quem tem acesso).
--
-- O feed agora pede 10 itens por vez, do mais novo para o mais antigo
-- ("order by created_at desc limit 10" + "created_at < cursor"). Sem estes
-- índices o banco teria que ler e ordenar a tabela inteira a cada página.
-- O app funciona mesmo antes de rodar este arquivo; só fica mais lento
-- quando houver muitos memoriais.

-- Aba "Explorar": tudo, do mais novo para o mais antigo
create index if not exists idx_memorials_created_at
  on public.memorials (created_at desc, id desc);
create index if not exists idx_tributes_created_at
  on public.tributes (created_at desc, id desc);

-- Aba "Seguindo": memoriais das pessoas que eu sigo
create index if not exists idx_memorials_created_by_created_at
  on public.memorials (created_by, created_at desc);

-- Aba "Seguindo": homenagens escritas por quem eu sigo
create index if not exists idx_tributes_author_created_at
  on public.tributes (author_id, created_at desc);

-- Aba "Seguindo": homenagens nos memoriais que eu sigo (ou de quem eu sigo)
create index if not exists idx_tributes_memorial_created_at
  on public.tributes (memorial_id, created_at desc);

-- Publicações com foto/vídeo (tabela criada na 0007 — rode a 0007 antes desta).
-- A 0007 já criou (memorial_id, created_at desc); faltam estes dois:
create index if not exists idx_memorial_posts_created_at
  on public.memorial_posts (created_at desc, id desc);
create index if not exists idx_memorial_posts_author_created_at
  on public.memorial_posts (author_id, created_at desc);
