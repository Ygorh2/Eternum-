import { supabase } from '/utils/supabase/client';

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
  const userId = await requireUserId();
  const path = `${userId}/${subfolder}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
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
