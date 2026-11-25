import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./api', () => ({
  fetchFeedMemorialsPage: vi.fn(),
  fetchFeedTributesPage: vi.fn(),
  fetchFeedMemorialPostsPage: vi.fn(),
}))

import * as api from './api'
import { authorIdsOf, fetchFeedPage, rowsToPosts, type FeedSource } from './feedSources'

const memorial = (id: string, createdAt: string) => ({ id, name: `Memorial ${id}`, type: 'person', createdBy: 'u1', createdAt, gallery: [] })
const tribute = (id: string, createdAt: string) => ({
  id,
  memorialId: 'm1',
  author: { id: 'u2', name: 'João' },
  content: 'Saudade',
  createdAt,
  memorial: { id: 'm1', name: 'Memorial m1', photo: '', type: 'person' },
})

beforeEach(() => vi.clearAllMocks())

describe('fetchFeedPage', () => {
  it('pede a mesma consulta a todas as fontes e junta em ordem', async () => {
    vi.mocked(api.fetchFeedMemorialsPage).mockResolvedValue([memorial('m1', '2024-01-01T00:00:00Z')] as any)
    vi.mocked(api.fetchFeedTributesPage).mockResolvedValue([tribute('t1', '2024-01-02T00:00:00Z')] as any)
    vi.mocked(api.fetchFeedMemorialPostsPage).mockResolvedValue([
      {
        id: 'p1',
        authorId: 'u3',
        caption: 'Legenda',
        media: [{ url: 'https://x/1.jpg', type: 'image' }],
        createdAt: '2024-01-03T00:00:00Z',
        memorial: { id: 'm1', name: 'Memorial m1', photo: '', type: 'person' },
      },
    ] as any)
    const q = { scope: 'explore' as const, type: 'all' as const, limit: 10 }
    const page = await fetchFeedPage(q)
    expect(api.fetchFeedMemorialsPage).toHaveBeenCalledWith(q)
    expect(api.fetchFeedTributesPage).toHaveBeenCalledWith(q)
    expect(api.fetchFeedMemorialPostsPage).toHaveBeenCalledWith(q)
    expect(page.rows.map((r) => r.id)).toEqual(['p1', 't1', 'm1'])
    expect(page.nextCursor).toBeNull()

    const names: Record<string, string> = { u1: 'Ana', u3: 'Bia' }
    const posts = rowsToPosts(page.rows, { authorName: (id) => (id ? names[id] : undefined) })
    expect(posts.map((p) => p.sourceType)).toEqual(['memorial_post', 'tribute', 'memorial_created'])
    expect(posts[0]).toMatchObject({ postKey: 'post:p1', author: { name: 'Bia' }, content: { message: 'Legenda' } })
    expect(posts[2].author.name).toBe('Ana')
    expect(authorIdsOf(page.rows).sort()).toEqual(['u1', 'u3'])
  })

  it('aceita um novo tipo de item plugado como fonte', async () => {
    const photoSource: FeedSource = {
      kind: 'photo',
      fetchPage: async () => [{ kind: 'photo', id: 'p1', createdAt: '2024-01-03T00:00:00Z', data: { url: 'https://x/p.jpg' } }],
      toPosts: (row) => [
        {
          id: `photo-${row.id}`,
          postKey: `photo:${row.id}`,
          sourceType: 'photo_post',
          memorial: { id: 'm1', name: 'Maria', photo: '', type: 'person' },
          content: { image: row.data.url },
          author: { name: 'Ana' },
          createdAt: row.createdAt,
        },
      ],
    }
    const page = await fetchFeedPage({ scope: 'explore', type: 'all', limit: 10 }, [photoSource])
    const posts = rowsToPosts(page.rows, { authorName: () => undefined }, [photoSource])
    expect(posts[0].content.image).toBe('https://x/p.jpg')
  })
})
