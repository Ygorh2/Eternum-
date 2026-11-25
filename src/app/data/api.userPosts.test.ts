import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso: testes não podem chamar o Supabase real
const state = vi.hoisted(() => ({
  calls: [] as [string, ...any[]][],
  result: { data: [] as any[], error: null as any },
}))

vi.mock('/utils/supabase/client', () => {
  const query: any = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'lt']) {
    query[m] = (...args: any[]) => {
      state.calls.push([m, ...args])
      return query
    }
  }
  query.then = (resolve: any, reject: any) => Promise.resolve(state.result).then(resolve, reject)
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: null } }) },
      storage: {
        from: () => ({
          createSignedUrls: async (paths: string[]) => ({
            data: paths.map((path) => ({ path, signedUrl: `https://assinado/${path}?token=t`, error: null })),
            error: null,
          }),
        }),
      },
      from: (table: string) => {
        state.calls.push(['from', table])
        return query
      },
    },
  }
})

import { fetchUserPostsPage } from './api'

const USER = '11111111-1111-4111-8111-111111111111'
const row = {
  id: 'p1',
  memorial_id: 'm1',
  author_id: USER,
  caption: 'Oi',
  media: [{ url: 'https://proj.supabase.co/storage/v1/object/public/memorial-media/u/posts/m1/a.jpg', type: 'image' }],
  created_at: '2024-01-01T00:00:00Z',
}

describe('fetchUserPostsPage', () => {
  beforeEach(() => {
    state.calls = []
    state.result = { data: [row], error: null }
  })

  it('busca só as publicações da pessoa, mais recentes primeiro, e assina os links', async () => {
    const posts = await fetchUserPostsPage(USER)
    expect(state.calls).toContainEqual(['from', 'memorial_posts'])
    expect(state.calls).toContainEqual(['eq', 'author_id', USER])
    expect(state.calls).toContainEqual(['order', 'created_at', { ascending: false }])
    expect(state.calls.some(([m]) => m === 'lt')).toBe(false)
    expect(posts[0]).toMatchObject({ id: 'p1', memorialId: 'm1', caption: 'Oi' })
    expect(posts[0].media[0].url).toBe('https://assinado/u/posts/m1/a.jpg?token=t')
  })

  it('pagina pelo created_at da última publicação', async () => {
    await fetchUserPostsPage(USER, '2024-01-01T00:00:00Z')
    expect(state.calls).toContainEqual(['lt', 'created_at', '2024-01-01T00:00:00Z'])
  })

  it('id inválido não consulta o banco', async () => {
    expect(await fetchUserPostsPage('guest')).toEqual([])
    expect(state.calls).toEqual([])
  })

  it('sem a tabela (migration 0007 não aplicada), devolve lista vazia', async () => {
    state.result = { data: null as any, error: { code: '42P01', message: 'relation does not exist' } }
    expect(await fetchUserPostsPage(USER)).toEqual([])
  })
})
