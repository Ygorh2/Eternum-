// Fontes do feed paginado. Cada fonte busca uma página (via api.ts) e sabe
// transformar suas linhas em posts. Para um novo tipo de item no feed (ex.:
// fotos com legenda), basta acrescentar uma fonte em FEED_SOURCES.

import * as api from './api';
import {
  mergeFeedPages,
  memorialToPosts,
  memorialPostToPosts,
  tributeToPosts,
  type FeedPage,
  type FeedPost,
  type FeedQuery,
  type FeedRow,
} from '../utils/feed';

export type FeedPostContext = {
  /** Nome de exibição de um usuário (autor do memorial), se já carregado. */
  authorName: (userId?: string) => string | undefined;
};

export type FeedSource = {
  kind: string;
  fetchPage: (q: FeedQuery) => Promise<FeedRow[]>;
  toPosts: (row: FeedRow, ctx: FeedPostContext) => FeedPost[];
  /** Ids de usuários cujo nome precisa ser carregado para montar o post. */
  authorIds?: (row: FeedRow) => string[];
};

const memorialsSource: FeedSource = {
  kind: 'memorial',
  fetchPage: async (q) =>
    (await api.fetchFeedMemorialsPage(q)).map((m: any) => ({
      kind: 'memorial',
      id: m.id,
      createdAt: m.createdAt,
      data: m,
    })),
  toPosts: (row, ctx) => memorialToPosts(row.data, ctx.authorName(row.data.createdBy) || 'Administrador'),
  authorIds: (row) => (row.data.createdBy ? [row.data.createdBy] : []),
};

const tributesSource: FeedSource = {
  kind: 'tribute',
  fetchPage: async (q) =>
    (await api.fetchFeedTributesPage(q)).map((t: any) => ({
      kind: 'tribute',
      id: t.id,
      createdAt: t.createdAt,
      data: t,
    })),
  toPosts: (row) => tributeToPosts(row.data),
};

/** Publicações com foto/vídeo e legenda (memorial_posts). */
const memorialPostsSource: FeedSource = {
  kind: 'memorial_post',
  fetchPage: async (q) =>
    (await api.fetchFeedMemorialPostsPage(q)).map((p: any) => ({
      kind: 'memorial_post',
      id: p.id,
      createdAt: p.createdAt,
      data: p,
    })),
  toPosts: (row, ctx) => memorialPostToPosts(row.data, ctx.authorName(row.data.authorId) || 'Usuário'),
  authorIds: (row) => (row.data.authorId ? [row.data.authorId] : []),
};

export const FEED_SOURCES: FeedSource[] = [memorialsSource, tributesSource, memorialPostsSource];

/** Busca uma página do feed juntando todas as fontes. */
export async function fetchFeedPage(q: FeedQuery, sources: FeedSource[] = FEED_SOURCES): Promise<FeedPage> {
  const pages = await Promise.all(sources.map((s) => s.fetchPage(q)));
  return mergeFeedPages(pages, q.limit);
}

/** Transforma as linhas carregadas em posts, na ordem do feed. */
export function rowsToPosts(rows: FeedRow[], ctx: FeedPostContext, sources: FeedSource[] = FEED_SOURCES): FeedPost[] {
  const byKind = new Map(sources.map((s) => [s.kind, s]));
  const posts: FeedPost[] = [];
  for (const row of rows) {
    const source = byKind.get(row.kind);
    if (source) posts.push(...source.toPosts(row, ctx));
  }
  return posts;
}

/** Ids de autores que ainda precisam ter o nome carregado. */
export function authorIdsOf(rows: FeedRow[], sources: FeedSource[] = FEED_SOURCES): string[] {
  const byKind = new Map(sources.map((s) => [s.kind, s]));
  const ids = new Set<string>();
  for (const row of rows) byKind.get(row.kind)?.authorIds?.(row).forEach((id) => ids.add(id));
  return Array.from(ids);
}
