import { supabase } from '/utils/supabase/client';
import type { FeedQuery, FollowingScope } from '../utils/feed';
import { MAX_CAPTION_LENGTH, MAX_POST_MEDIA } from '../utils/mediaValidation';

// ------------------------------------------------------------------
// Mapeadores: linha do banco (snake_case) <-> objeto usado nas telas
// (camelCase, mesmo formato que os componentes já esperavam)
// ------------------------------------------------------------------

function mapMemorialFromDb(row: any) {
  return {
    id: row.id,
    name: row.name,
    photo: row.photo || '',
    cover: row.cover || '',
    birthDate: row.birth_date,
    deathDate: row.death_date,
    quote: row.quote || '',
    bio: row.bio || '',
    type: row.type,
    accessGroup: row.access_group,
    addToSky: row.add_to_sky,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    gallery: row.gallery || [],
  };
}

function mapTributeFromDb(row: any) {
  return {
    id: row.id,
    memorialId: row.memorial_id,
    author: { id: row.author_id, name: row.author_name },
    content: row.content,
    date: row.created_at ? row.created_at.split('T')[0] : '',
    type: row.type,
    image: row.image,
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('Você precisa estar logado para fazer isso.');
  }
  return data.user.id;
}

// ------------------------------------------------------------------
// Upload de mídia (Supabase Storage)
// ------------------------------------------------------------------

const MEDIA_BUCKET = 'memorial-media';

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/**
 * Envia um arquivo para o bucket "memorial-media", dentro da pasta do
 * usuário logado (obrigatório pela política de storage), e devolve a URL
 * pública para salvar no memorial/tributo.
 */
export async function uploadMedia(file: File, subfolder: string): Promise<string> {
  return (await uploadMediaWithPath(file, subfolder)).url;
}

/** Igual a uploadMedia, mas devolve também o caminho no bucket (para poder apagar depois). */
async function uploadMediaWithPath(file: File, subfolder: string): Promise<{ url: string; path: string }> {
  const userId = await requireUserId();
  const random = Math.random().toString(36).slice(2, 8);
  const path = `${userId}/${subfolder}/${Date.now()}-${random}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Caminho no bucket a partir da URL pública (null se a URL não for do nosso bucket). */
export function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
}

/** Envia vários arquivos (galeria) em paralelo e devolve URL + tipo de cada um. */
export async function uploadManyMedia(
  files: File[],
  subfolder: string
): Promise<{ url: string; type: 'image' | 'video' }[]> {
  return Promise.all(
    files.map(async (file) => ({
      url: await uploadMedia(file, subfolder),
      type: file.type.startsWith('video') ? ('video' as const) : ('image' as const),
    }))
  );
}

// ------------------------------------------------------------------
// Memorials
// ------------------------------------------------------------------

export async function fetchMemorials() {
  const { data, error } = await supabase
    .from('memorials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapMemorialFromDb);
}

export async function createMemorial(input: any) {
  const userId = await requireUserId();

  // NOTA: espera-se que `photo`/`cover`/`gallery` já venham como URLs reais do
  // Supabase Storage (veja uploadMedia/uploadManyMedia) — isso é feito no
  // componente CreateMemorial.tsx antes de chamar esta função, para que o
  // upload aconteça só depois de validar o formulário.
  const { data, error } = await supabase
    .from('memorials')
    .insert({
      name: input.name,
      type: input.type,
      photo: input.photo || null,
      cover: input.cover || null,
      birth_date: input.birthDate || null,
      death_date: input.deathDate || null,
      quote: input.quote || null,
      bio: input.bio || null,
      // Privado por padrão, como a tela de criação promete
      access_group: input.accessGroup || 'family',
      add_to_sky: input.addToSky ?? true,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      created_by: userId,
      gallery: input.gallery || [],
    })
    .select()
    .single();

  if (error) throw error;
  return mapMemorialFromDb(data);
}

/**
 * Atualiza os dados editáveis de um memorial. Só o dono consegue: a policy
 * "memorials_update_own" (auth.uid() = created_by) bloqueia os demais, e
 * filtramos por created_by também aqui para devolver uma mensagem clara.
 * Campos ausentes em `changes` não são alterados.
 */
export async function updateMemorial(id: string, changes: any) {
  const userId = await requireUserId();

  const row: Record<string, any> = {};
  if (changes.name !== undefined) row.name = String(changes.name).trim();
  if (changes.birthDate !== undefined) row.birth_date = changes.birthDate || null;
  if (changes.deathDate !== undefined) row.death_date = changes.deathDate || null;
  if (changes.bio !== undefined) row.bio = changes.bio || null;
  if (changes.quote !== undefined) row.quote = changes.quote || null;
  if (changes.photo !== undefined) row.photo = changes.photo || null;
  if (changes.cover !== undefined) row.cover = changes.cover || null;
  if (changes.accessGroup !== undefined) row.access_group = changes.accessGroup;
  if (changes.addToSky !== undefined) row.add_to_sky = !!changes.addToSky;

  const { data, error } = await supabase
    .from('memorials')
    .update(row)
    .eq('id', id)
    .eq('created_by', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Você não tem permissão para editar este memorial.');
  return mapMemorialFromDb(data);
}

export async function deleteMemorial(id: string) {
  const { error } = await supabase.from('memorials').delete().eq('id', id);
  if (error) throw error;
}

// ------------------------------------------------------------------
// Tributes
// ------------------------------------------------------------------

export async function fetchTributes() {
  const { data, error } = await supabase
    .from('tributes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTributeFromDb);
}

export async function createTribute(input: any) {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('tributes')
    .insert({
      memorial_id: input.memorialId,
      author_id: userId,
      author_name: input.author?.name || null,
      content: input.content,
      type: input.type || 'Saudade',
      image: input.image || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapTributeFromDb(data);
}

// ------------------------------------------------------------------
// Feed paginado (abas "Seguindo" e "Explorar")
//
// Cada função devolve UMA página de uma fonte do feed, da mais nova para a
// mais antiga, com no máximo `limit` linhas criadas antes de `before`.
// A junção das fontes fica em src/app/data/feedSources.ts.
// A privacidade continua 100% na RLS: memoriais privados (e as homenagens
// deles) simplesmente não voltam para quem não tem acesso.
// ------------------------------------------------------------------

/** Quantos ids cabem num filtro `in.(...)` sem deixar a URL grande demais. */
const FEED_ID_CHUNK = 80;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só deixa passar UUIDs (evita montar filtros do PostgREST com texto arbitrário). */
function onlyUuids(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === 'string' && UUID_RE.test(id))));
}

/** Ordena por data desc (id desc no empate) e corta em `limit`. */
function newestFirst<T extends { id: string; created_at: string }>(rows: T[], limit: number): T[] {
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .sort((a, b) => {
      const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return d !== 0 ? d : a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    })
    .slice(0, limit);
}

/** Pessoas (incluindo o próprio usuário) e memoriais que entram na aba "Seguindo". */
export async function fetchFollowingScope(userId: string): Promise<FollowingScope> {
  const [follows, memorialFollows] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', userId),
    supabase.from('memorial_follows').select('memorial_id').eq('user_id', userId),
  ]);
  if (follows.error) throw follows.error;
  // memorial_follows vem da migration 0006; se ela faltar, segue só com pessoas
  if (memorialFollows.error) console.error('Erro ao carregar memoriais seguidos:', memorialFollows.error);
  return {
    userIds: onlyUuids([userId, ...(follows.data || []).map((r: any) => r.following_id)]),
    memorialIds: onlyUuids((memorialFollows.data || []).map((r: any) => r.memorial_id)),
  };
}

export async function fetchFeedMemorialsPage(q: FeedQuery) {
  const base = () => {
    let req = supabase
      .from('memorials')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(q.limit);
    if (q.before) req = req.lt('created_at', q.before);
    if (q.type !== 'all') req = req.eq('type', q.type);
    return req;
  };

  let rows: any[];
  if (q.scope === 'following') {
    const userIds = onlyUuids(q.following?.userIds || []);
    const memorialIds = onlyUuids(q.following?.memorialIds || []);
    const requests = [
      ...chunk(userIds, FEED_ID_CHUNK).map((ids) => base().in('created_by', ids)),
      ...chunk(memorialIds, FEED_ID_CHUNK).map((ids) => base().in('id', ids)),
    ];
    const results = await Promise.all(requests);
    rows = [];
    for (const r of results) {
      if (r.error) throw r.error;
      rows.push(...(r.data || []));
    }
    rows = newestFirst(rows, q.limit);
  } else {
    const { data, error } = await base();
    if (error) throw error;
    rows = data || [];
  }
  return rows.map(mapMemorialFromDb);
}

/** Homenagens com os dados do memorial embutidos (para o cabeçalho do post). */
export async function fetchFeedTributesPage(q: FeedQuery) {
  const base = () => {
    let req = supabase
      .from('tributes')
      .select('*, memorial:memorials!inner(id, name, photo, type, created_by)')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(q.limit);
    if (q.before) req = req.lt('created_at', q.before);
    if (q.type !== 'all') req = req.eq('memorial.type', q.type);
    return req;
  };

  let rows: any[];
  if (q.scope === 'following') {
    const userIds = onlyUuids(q.following?.userIds || []);
    const memorialIds = onlyUuids(q.following?.memorialIds || []);
    const requests = [
      // escritas por mim ou por quem eu sigo
      ...chunk(userIds, FEED_ID_CHUNK).map((ids) => base().in('author_id', ids)),
      // deixadas nos memoriais criados por mim ou por quem eu sigo
      ...chunk(userIds, FEED_ID_CHUNK).map((ids) => base().in('memorial.created_by', ids)),
      // deixadas nos memoriais que eu sigo
      ...chunk(memorialIds, FEED_ID_CHUNK).map((ids) => base().in('memorial_id', ids)),
    ];
    const results = await Promise.all(requests);
    rows = [];
    for (const r of results) {
      if (r.error) throw r.error;
      rows.push(...(r.data || []));
    }
    rows = newestFirst(rows, q.limit);
  } else {
    const { data, error } = await base();
    if (error) throw error;
    rows = data || [];
  }

  return rows.map((row: any) => ({
    ...mapTributeFromDb(row),
    createdAt: row.created_at,
    memorial: {
      id: row.memorial?.id ?? row.memorial_id,
      name: row.memorial?.name || '',
      photo: row.memorial?.photo || '',
      type: row.memorial?.type === 'pet' ? ('pet' as const) : ('person' as const),
      createdBy: row.memorial?.created_by,
    },
  }));
}

// ------------------------------------------------------------------
// Publicações com foto/vídeo e legenda (tabela memorial_posts — migration 0007)
// ------------------------------------------------------------------

export type PostMediaItem = { url: string; type: 'image' | 'video' };

export type MemorialPost = {
  id: string;
  memorialId: string;
  authorId: string;
  authorName: string;
  caption: string;
  media: PostMediaItem[];
  createdAt: string;
};

function mapPostFromDb(row: any, authorName: string): MemorialPost {
  const media = Array.isArray(row.media) ? row.media : [];
  return {
    id: row.id,
    memorialId: row.memorial_id,
    authorId: row.author_id,
    authorName,
    caption: row.caption || '',
    media: media
      .filter((m: any) => m && typeof m.url === 'string')
      .map((m: any) => ({ url: m.url, type: m.type === 'video' ? 'video' : 'image' })),
    createdAt: row.created_at,
  };
}

const POST_COLUMNS = 'id, memorial_id, author_id, caption, media, created_at';

/** Publicações desses memoriais, da mais recente para a mais antiga (a RLS esconde as de memoriais privados). */
export async function fetchMemorialPosts(memorialIds: string[]): Promise<MemorialPost[]> {
  if (memorialIds.length === 0) return [];
  const rows: any[] = [];
  for (const ids of chunk(memorialIds, 100)) {
    const { data, error } = await supabase
      .from('memorial_posts')
      .select(POST_COLUMNS)
      .in('memorial_id', ids)
      .order('created_at', { ascending: false });
    if (error) throw error;
    rows.push(...(data || []));
  }
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  const names = await fetchProfilesByIds(Array.from(new Set(rows.map((r) => r.author_id))));
  return rows.map((row) => mapPostFromDb(row, names[row.author_id] || 'Usuário'));
}

/**
 * Cria uma publicação: envia os arquivos para o Storage e depois salva a linha.
 * Se salvar falhar, apaga os arquivos já enviados para não deixar lixo.
 * Os arquivos devem ter sido validados antes (validateMediaFiles).
 */
export async function createMemorialPost(input: {
  memorialId: string;
  caption: string;
  files: File[];
  authorName: string;
}): Promise<MemorialPost> {
  const userId = await requireUserId();
  const caption = input.caption.trim();
  if (input.files.length === 0) throw new Error('Escolha pelo menos uma foto ou vídeo.');
  if (input.files.length > MAX_POST_MEDIA) {
    throw new Error(`Uma publicação pode ter no máximo ${MAX_POST_MEDIA} arquivos.`);
  }
  if (caption.length > MAX_CAPTION_LENGTH) {
    throw new Error(`A legenda pode ter no máximo ${MAX_CAPTION_LENGTH} caracteres.`);
  }

  const uploadedPaths: string[] = [];
  try {
    const media: PostMediaItem[] = [];
    for (const file of input.files) {
      const { url, path } = await uploadMediaWithPath(file, `posts/${input.memorialId}`);
      uploadedPaths.push(path);
      media.push({ url, type: file.type.startsWith('video/') ? 'video' : 'image' });
    }

    const { data, error } = await supabase
      .from('memorial_posts')
      .insert({
        memorial_id: input.memorialId,
        author_id: userId,
        caption: caption || null,
        media,
      })
      .select(POST_COLUMNS)
      .single();
    if (error) throw error;
    return mapPostFromDb(data, input.authorName);
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths).catch(() => undefined);
    }
    throw err;
  }
}

export async function deleteMemorialPost(post: Pick<MemorialPost, 'id' | 'media' | 'authorId' | 'memorialId'>) {
  const userId = await requireUserId();
  // .select() devolve as linhas apagadas: se a RLS bloquear, volta vazio (sem erro)
  const { data, error } = await supabase.from('memorial_posts').delete().eq('id', post.id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Você não tem permissão para apagar esta publicação.');
  // Apaga os arquivos só quando quem apaga é o próprio autor, e só os da pasta
  // de publicações dele. As URLs vêm da linha (escritas por quem publicou): se o
  // dono do memorial apagasse por elas, alguém poderia apontar para arquivos do
  // dono (foto, capa) e fazê-lo apagá-los sem querer.
  if (post.authorId !== userId) return;
  const allowedPrefix = `${userId}/posts/${post.memorialId}/`;
  const paths = post.media
    .map((m) => storagePathFromPublicUrl(m.url))
    .filter((p): p is string => !!p && p.startsWith(allowedPrefix) && !p.includes('..'));
  if (paths.length > 0) {
    await supabase.storage.from(MEDIA_BUCKET).remove(paths).catch(() => undefined);
  }
}

/** Publicações (memorial_posts, migration 0007) com o memorial embutido. */
/**
 * Tabela ainda não criada (migration não aplicada). Assim o feed continua
 * funcionando com memoriais e homenagens enquanto a 0007 não for rodada.
 */
function isMissingTable(error: any): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') {
    console.warn('Publicações ainda não disponíveis (rode a migration 0007):', error.message);
    return true;
  }
  return false;
}

export async function fetchFeedMemorialPostsPage(q: FeedQuery) {
  const base = () => {
    let req = supabase
      .from('memorial_posts')
      .select(`${POST_COLUMNS}, memorial:memorials!inner(id, name, photo, type, created_by)`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(q.limit);
    if (q.before) req = req.lt('created_at', q.before);
    if (q.type !== 'all') req = req.eq('memorial.type', q.type);
    return req;
  };

  let rows: any[];
  if (q.scope === 'following') {
    const userIds = onlyUuids(q.following?.userIds || []);
    const memorialIds = onlyUuids(q.following?.memorialIds || []);
    const requests = [
      ...chunk(userIds, FEED_ID_CHUNK).map((ids) => base().in('author_id', ids)),
      ...chunk(userIds, FEED_ID_CHUNK).map((ids) => base().in('memorial.created_by', ids)),
      ...chunk(memorialIds, FEED_ID_CHUNK).map((ids) => base().in('memorial_id', ids)),
    ];
    const results = await Promise.all(requests);
    rows = [];
    for (const r of results) {
      if (isMissingTable(r.error)) return [];
      if (r.error) throw r.error;
      rows.push(...(r.data || []));
    }
    rows = newestFirst(rows, q.limit);
  } else {
    const { data, error } = await base();
    if (isMissingTable(error)) return [];
    if (error) throw error;
    rows = data || [];
  }

  return rows.map((row: any) => ({
    // o nome do autor é preenchido no feed (busca de perfis em lote)
    ...mapPostFromDb(row, ''),
    memorial: {
      id: row.memorial?.id ?? row.memorial_id,
      name: row.memorial?.name || '',
      photo: row.memorial?.photo || '',
      type: row.memorial?.type === 'pet' ? ('pet' as const) : ('person' as const),
      createdBy: row.memorial?.created_by,
    },
  }));
}

// ------------------------------------------------------------------
// Candles
// ------------------------------------------------------------------

export async function lightCandle(memorialId: string) {
  const userId = await requireUserId();
  // unique (memorial_id, user_id) garante 1 vela por pessoa por memorial
  const { error } = await supabase
    .from('candles')
    .insert({ memorial_id: memorialId, user_id: userId });
  if (error && error.code !== '23505') throw error; // ignora duplicidade
}

export async function countCandles(memorialId: string) {
  const { count, error } = await supabase
    .from('candles')
    .select('*', { count: 'exact', head: true })
    .eq('memorial_id', memorialId);
  if (error) throw error;
  return count || 0;
}

/** Total de velas do memorial e se o usuário atual já acendeu a dele. */
export async function fetchCandleInfo(memorialId: string, userId?: string) {
  const count = await countCandles(memorialId);
  if (!userId) return { count, litByMe: false };
  const { data, error } = await supabase
    .from('candles')
    .select('memorial_id')
    .eq('memorial_id', memorialId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return { count, litByMe: !!data };
}

// ------------------------------------------------------------------
// Seguir memorial (tabela memorial_follows — migration 0006)
// ------------------------------------------------------------------

export async function fetchMemorialFollowInfo(memorialId: string, userId?: string) {
  const { count, error } = await supabase
    .from('memorial_follows')
    .select('*', { count: 'exact', head: true })
    .eq('memorial_id', memorialId);
  if (error) throw error;
  if (!userId) return { count: count || 0, isFollowing: false };
  const { data, error: mineErr } = await supabase
    .from('memorial_follows')
    .select('memorial_id')
    .eq('memorial_id', memorialId)
    .eq('user_id', userId)
    .maybeSingle();
  if (mineErr) throw mineErr;
  return { count: count || 0, isFollowing: !!data };
}

export async function followMemorial(memorialId: string) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('memorial_follows')
    .insert({ memorial_id: memorialId, user_id: userId });
  if (error && error.code !== '23505') throw error; // ignora "já segue"
}

export async function unfollowMemorial(memorialId: string) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('memorial_follows')
    .delete()
    .eq('memorial_id', memorialId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ------------------------------------------------------------------
// Reações e comentários dos posts (migration 0006)
// ------------------------------------------------------------------

export type ReactionType = 'amen' | 'love';

export type PostComment = {
  id: string;
  postKey: string;
  memorialId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type PostReactionSummary = {
  amen: number;
  love: number;
  mine: { amen: boolean; love: boolean };
};

export type PostInteractions = {
  reactions: Record<string, PostReactionSummary>;
  comments: Record<string, PostComment[]>;
};

/** Mantém a URL do PostgREST curta quando há muitos memoriais. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Reações (com as do usuário atual marcadas) e comentários dos posts desses memoriais. */
export async function fetchPostInteractions(
  memorialIds: string[],
  currentUserId?: string
): Promise<PostInteractions> {
  const result: PostInteractions = { reactions: {}, comments: {} };
  if (memorialIds.length === 0) return result;

  const reactionRows: any[] = [];
  const commentRows: any[] = [];
  for (const ids of chunk(memorialIds, 100)) {
    const [reactions, comments] = await Promise.all([
      supabase.from('post_reactions').select('post_key, reaction, user_id').in('memorial_id', ids),
      supabase
        .from('post_comments')
        .select('id, post_key, memorial_id, user_id, content, created_at')
        .in('memorial_id', ids)
        .order('created_at', { ascending: true }),
    ]);
    if (reactions.error) throw reactions.error;
    if (comments.error) throw comments.error;
    reactionRows.push(...(reactions.data || []));
    commentRows.push(...(comments.data || []));
  }

  for (const row of reactionRows) {
    const summary = (result.reactions[row.post_key] ??= {
      amen: 0,
      love: 0,
      mine: { amen: false, love: false },
    });
    const type = row.reaction as ReactionType;
    if (type !== 'amen' && type !== 'love') continue;
    summary[type] += 1;
    if (currentUserId && row.user_id === currentUserId) summary.mine[type] = true;
  }

  const authorIds = Array.from(new Set(commentRows.map((r) => r.user_id)));
  const names = await fetchProfilesByIds(authorIds);
  for (const row of commentRows) {
    (result.comments[row.post_key] ??= []).push(
      mapCommentFromDb(row, names[row.user_id] || 'Usuário')
    );
  }

  return result;
}

function mapCommentFromDb(row: any, authorName: string): PostComment {
  return {
    id: row.id,
    postKey: row.post_key,
    memorialId: row.memorial_id,
    userId: row.user_id,
    authorName,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function addReaction(
  memorialId: string,
  postKey: string,
  reaction: ReactionType,
  tributeId?: string | null
) {
  const userId = await requireUserId();
  const { error } = await supabase.from('post_reactions').insert({
    memorial_id: memorialId,
    tribute_id: tributeId || null,
    post_key: postKey,
    user_id: userId,
    reaction,
  });
  if (error && error.code !== '23505') throw error; // já reagiu
}

export async function removeReaction(postKey: string, reaction: ReactionType) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_key', postKey)
    .eq('user_id', userId)
    .eq('reaction', reaction);
  if (error) throw error;
}

export const MAX_COMMENT_LENGTH = 1000;

export async function addComment(
  memorialId: string,
  postKey: string,
  content: string,
  authorName: string,
  tributeId?: string | null
): Promise<PostComment> {
  const userId = await requireUserId();
  const text = content.trim();
  if (!text) throw new Error('Escreva um comentário.');
  if (text.length > MAX_COMMENT_LENGTH) {
    throw new Error(`O comentário pode ter no máximo ${MAX_COMMENT_LENGTH} caracteres.`);
  }
  const { data, error } = await supabase
    .from('post_comments')
    .insert({
      memorial_id: memorialId,
      tribute_id: tributeId || null,
      post_key: postKey,
      user_id: userId,
      content: text,
    })
    .select('id, post_key, memorial_id, user_id, content, created_at')
    .single();
  if (error) throw error;
  return mapCommentFromDb(data, authorName);
}

/**
 * Apaga um comentário. A policy "post_comments_delete_own_or_owner" (0006)
 * só deixa apagar o autor do comentário ou o dono do memorial. Se o RLS
 * bloquear, o Postgres não dá erro: só não apaga nada — por isso conferimos.
 */
export async function deleteComment(commentId: string) {
  await requireUserId();
  const { data, error } = await supabase.from('post_comments').delete().eq('id', commentId).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Você não tem permissão para apagar este comentário (ou ele já foi apagado).');
  }
}

// ------------------------------------------------------------------
// Invites (convites para a família)
// ------------------------------------------------------------------

function mapInviteFromDb(row: any) {
  return {
    id: row.id,
    code: row.code,
    email: row.email || undefined,
    status: row.status,
    createdAt: row.created_at,
    invitedBy: row.invited_by,
  };
}

function generateInviteCode() {
  return `MEM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function fetchInvites() {
  // RLS já restringe às linhas do próprio usuário (invited_by = auth.uid())
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapInviteFromDb);
}

export async function createInvite(email?: string) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('invites')
    .insert({
      invited_by: userId,
      email: email || null,
      code: generateInviteCode(),
    })
    .select()
    .single();
  if (error) throw error;
  return mapInviteFromDb(data);
}

/**
 * Prévia pública e segura de um convite (mostra quem convidou, sem expor a
 * tabela `invites` inteira — o convidado não é o dono da linha, então a RLS
 * normal não deixaria ele ler isso diretamente).
 */
export async function getInvitePreview(code: string) {
  const { data, error } = await supabase.rpc('get_invite_preview', { p_code: code });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Convite não encontrado.');
  return {
    code: row.code as string,
    status: row.status as string,
    inviterId: row.inviter_id as string,
    inviterName: row.inviter_name as string,
  };
}

/**
 * Aceita um convite pelo código. Roda no banco via função segura que: valida
 * o código, marca como aceito e faz as duas pessoas passarem a se seguir
 * mutuamente (é assim que a "conexão de família" vira algo visível no app —
 * via o sistema de seguir usuários).
 */
export async function acceptInvite(code: string) {
  const { data, error } = await supabase.rpc('accept_invite', { p_code: code });
  if (error) throw error;
  return data;
}

// ------------------------------------------------------------------
// Estatísticas do perfil (números reais, não mockados)
// ------------------------------------------------------------------

export async function fetchProfileStats(userId: string) {
  const [
    { count: memorialsCount, error: mErr },
    { count: tributesCount, error: tErr },
    { count: candlesCount, error: cErr },
    { count: followersCount, error: frErr },
    { count: followingCount, error: fgErr },
  ] = await Promise.all([
    supabase.from('memorials').select('*', { count: 'exact', head: true }).eq('created_by', userId),
    supabase.from('tributes').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('candles').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  if (mErr) throw mErr;
  if (tErr) throw tErr;
  if (cErr) throw cErr;
  if (frErr) throw frErr;
  if (fgErr) throw fgErr;

  return {
    memorialsCount: memorialsCount || 0,
    tributesCount: tributesCount || 0,
    candlesCount: candlesCount || 0,
    followersCount: followersCount || 0,
    followingCount: followingCount || 0,
  };
}

// ------------------------------------------------------------------
// Profiles públicos (nome/username de outros usuários)
// ------------------------------------------------------------------

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return mapProfileFromDb(data);
}

function mapProfileFromDb(row: any) {
  return {
    id: row.id,
    displayName: row.display_name || row.username || 'Usuário',
    username: row.username || undefined,
    avatarUrl: row.avatar_url || undefined,
  };
}

/** Mapa id -> nome de exibição, para mostrar o autor real dos memoriais no feed. */
export async function fetchProfilesByIds(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach((row: any) => {
    map[row.id] = row.display_name || row.username || 'Usuário';
  });
  return map;
}

/** Busca pessoas pelo nome ou username (exclui o próprio usuário). */
export async function searchProfiles(query: string) {
  const userId = await requireUserId();
  let request = supabase.from('profiles').select('*').neq('id', userId).limit(20);
  if (query.trim()) {
    request = request.or(`display_name.ilike.%${query}%,username.ilike.%${query}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return (data || []).map(mapProfileFromDb);
}

// ------------------------------------------------------------------
// Follows (seguir outros usuários)
// ------------------------------------------------------------------

export async function isFollowingUser(targetUserId: string): Promise<boolean> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id') // follows não tem coluna "id" (PK composta)
    .eq('follower_id', userId)
    .eq('following_id', targetUserId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** IDs de quem o usuário atual já segue (para marcar botões "Seguindo" numa lista). */
export async function fetchFollowingIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
  if (error) throw error;
  return new Set((data || []).map((r: any) => r.following_id));
}

/**
 * Busca os perfis de uma lista de ids, mantendo a ordem dos ids.
 * As FKs de follows apontam para auth.users (não para profiles), por isso
 * não dá para fazer o "embed" follows -> profiles do PostgREST; buscamos em
 * duas etapas. Ids sem perfil criado são ignorados.
 */
async function fetchProfilesInOrder(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) throw error;
  const byId = new Map((data || []).map((row: any) => [row.id, row]));
  return ids.filter((id) => byId.has(id)).map((id) => mapProfileFromDb(byId.get(id)));
}

export async function fetchFollowers(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);
  if (error) throw error;
  return fetchProfilesInOrder((data || []).map((r: any) => r.follower_id));
}

export async function fetchFollowing(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) throw error;
  return fetchProfilesInOrder((data || []).map((r: any) => r.following_id));
}

export async function followUser(targetUserId: string) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: userId, following_id: targetUserId });
  if (error && error.code !== '23505') throw error; // ignora "já segue"
}

export async function unfollowUser(targetUserId: string) {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', userId)
    .eq('following_id', targetUserId);
  if (error) throw error;
}
