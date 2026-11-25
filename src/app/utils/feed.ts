// Lógica pura do feed paginado (sem Supabase): tipos, junção das fontes e
// transformação das linhas do banco em "posts".
//
// O feed é montado a partir de várias FONTES (memoriais, homenagens e, no
// futuro, fotos com legenda). Cada fonte devolve uma página de linhas já
// ordenadas da mais nova para a mais antiga; aqui juntamos as fontes, pegamos
// as N mais novas e calculamos o cursor da próxima página.
//
// Para plugar um novo tipo de item: crie uma FeedSource em
// src/app/data/feedSources.ts que devolva FeedRow com um `kind` novo e um
// `toPosts` que transforme a linha em FeedPost. O componente Feed não muda.

import { galleryPostKey, memorialPostItemKey, memorialPostKey, tributePostKey } from './postKeys';

export type FeedScope = 'following' | 'explore';
export type FeedTypeFilter = 'all' | 'person' | 'pet';

/** Quem/que o usuário segue — define o que entra na aba "Seguindo". */
export type FollowingScope = {
  /** O próprio usuário + pessoas que ele segue. */
  userIds: string[];
  /** Memoriais que ele segue (botão "Seguir" do memorial). */
  memorialIds: string[];
};

export type FeedQuery = {
  scope: FeedScope;
  type: FeedTypeFilter;
  /** Só itens criados ANTES deste instante (ISO). Sem valor = primeira página. */
  before?: string;
  limit: number;
  /** Obrigatório quando scope = 'following'. */
  following?: FollowingScope;
};

export type FeedMemorialInfo = {
  id: string;
  name: string;
  photo: string;
  type: 'person' | 'pet';
  createdBy?: string;
};

/** Uma linha vinda de uma fonte. `id` precisa ser único dentro da fonte. */
export type FeedRow<T = any> = {
  kind: string;
  id: string;
  createdAt: string;
  data: T;
};

export type FeedPost = {
  id: string;
  /** Chave usada para salvar reações/comentários (igual à da página do memorial). */
  postKey: string;
  sourceType: string;
  memorial: FeedMemorialInfo;
  content: {
    image?: string;
    video?: string;
    videoType?: string;
    message?: string;
    /** Várias fotos/vídeos (carrossel) — publicações. */
    media?: { url: string; type: 'image' | 'video' }[];
  };
  author: {
    id?: string;
    name: string;
    relationship?: string;
  };
  createdAt: string;
};

export type FeedPage = {
  rows: FeedRow[];
  /** Cursor para pedir a próxima página, ou null se acabou. */
  nextCursor: string | null;
};

function time(iso: string) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Ordena do mais novo para o mais antigo; empate decide pelo id (ordem estável). */
export function compareRows(a: FeedRow, b: FeedRow) {
  const diff = time(b.createdAt) - time(a.createdAt);
  if (diff !== 0) return diff;
  const ka = `${a.kind}:${a.id}`;
  const kb = `${b.kind}:${b.id}`;
  return ka < kb ? 1 : ka > kb ? -1 : 0;
}

/**
 * Junta as páginas de cada fonte (cada uma com até `limit` linhas anteriores
 * ao cursor) e devolve as `limit` linhas mais novas no total.
 *
 * Como cada fonte devolveu as suas `limit` mais novas, as `limit` mais novas
 * da união estão garantidamente aqui. O cursor seguinte é a data da última
 * linha devolvida; se nenhuma fonte encheu a página, o feed acabou.
 */
export function mergeFeedPages(pages: FeedRow[][], limit: number): FeedPage {
  const seen = new Set<string>();
  const all: FeedRow[] = [];
  for (const page of pages) {
    for (const row of page) {
      const key = `${row.kind}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(row);
    }
  }
  all.sort(compareRows);

  const anySourceFull = pages.some((p) => p.length >= limit);
  if (all.length <= limit && !anySourceFull) {
    return { rows: all, nextCursor: null };
  }

  let rows = all.slice(0, limit);
  // Não corta no meio de um mesmo instante: o cursor é "estritamente antes",
  // então itens com a mesma data da última linha seriam perdidos.
  const last = rows[rows.length - 1];
  if (last) {
    const cut = time(last.createdAt);
    const sameInstant = all.slice(limit).filter((r) => time(r.createdAt) === cut);
    rows = rows.concat(sameInstant);
  }
  return { rows, nextCursor: last ? last.createdAt : null };
}

/** Acrescenta linhas novas a uma lista já carregada, sem repetir. */
export function appendRows(current: FeedRow[], incoming: FeedRow[]): FeedRow[] {
  const seen = new Set(current.map((r) => `${r.kind}:${r.id}`));
  const added = incoming.filter((r) => !seen.has(`${r.kind}:${r.id}`));
  return added.length ? current.concat(added) : current;
}

// ------------------------------------------------------------------
// Transformação das linhas em posts
// ------------------------------------------------------------------

/** Memorial como vem de api.ts (mapMemorialFromDb). */
type MemorialLike = {
  id: string;
  name: string;
  photo?: string;
  type?: 'person' | 'pet';
  bio?: string;
  createdBy?: string;
  createdAt?: string;
  gallery?: { url: string; type?: string; mimeType?: string }[];
};

/** Homenagem como vem de api.fetchFeedTributesPage (com o memorial embutido). */
type TributeLike = {
  id: string;
  memorialId: string;
  author?: { id?: string; name?: string };
  content?: string;
  type?: string;
  image?: string | null;
  createdAt?: string;
  memorial: FeedMemorialInfo;
};

function memorialInfo(m: MemorialLike): FeedMemorialInfo {
  return {
    id: m.id,
    name: m.name,
    photo: m.photo || '',
    type: m.type || 'person',
    createdBy: m.createdBy,
  };
}

/** Post de criação do memorial + um post por foto/vídeo da galeria. */
export function memorialToPosts(m: MemorialLike, authorName: string): FeedPost[] {
  const info = memorialInfo(m);
  const createdAt = m.createdAt || '';
  const author = { id: m.createdBy, name: authorName };
  const posts: FeedPost[] = [
    {
      id: `memorial-created-${m.id}`,
      postKey: memorialPostKey(m.id),
      sourceType: 'memorial_created',
      memorial: info,
      content: {
        image: m.photo || undefined,
        message: m.bio ? m.bio.slice(0, 200) : undefined,
      },
      author,
      createdAt,
    },
  ];
  (m.gallery || []).forEach((item, i) => {
    if (!item?.url) return;
    const isVideo = item.type === 'video';
    posts.push({
      id: `gallery-${m.id}-${i}`,
      postKey: galleryPostKey(item.url),
      sourceType: 'gallery_image',
      memorial: info,
      content: isVideo ? { video: item.url, videoType: item.mimeType } : { image: item.url },
      author,
      createdAt,
    });
  });
  return posts;
}

export function tributeToPosts(t: TributeLike): FeedPost[] {
  return [
    {
      id: `tribute-${t.id}`,
      postKey: tributePostKey(t.id),
      sourceType: 'tribute',
      memorial: t.memorial,
      content: {
        image: t.image || undefined,
        message: t.content,
      },
      author: {
        id: t.author?.id,
        name: t.author?.name || 'Usuário',
        relationship: t.type,
      },
      createdAt: t.createdAt || '',
    },
  ];
}

/** Publicação com foto/vídeo e legenda (api.fetchFeedMemorialPostsPage). */
type MemorialPostLike = {
  id: string;
  authorId?: string;
  caption?: string;
  media: { url: string; type: 'image' | 'video' }[];
  createdAt: string;
  memorial: FeedMemorialInfo;
};

export function memorialPostToPosts(p: MemorialPostLike, authorName: string): FeedPost[] {
  return [
    {
      id: `post-${p.id}`,
      postKey: memorialPostItemKey(p.id),
      sourceType: 'memorial_post',
      memorial: p.memorial,
      content: {
        media: p.media,
        message: p.caption || undefined,
      },
      author: { id: p.authorId, name: authorName },
      createdAt: p.createdAt,
    },
  ];
}

/** Ids dos memoriais presentes nos posts (para carregar reações/comentários). */
export function memorialIdsOf(posts: FeedPost[]): string[] {
  return Array.from(new Set(posts.map((p) => p.memorial.id)));
}
