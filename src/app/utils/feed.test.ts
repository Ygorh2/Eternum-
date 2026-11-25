import { describe, it, expect } from 'vitest'
import { appendRows, memorialToPosts, mergeFeedPages, tributeToPosts, type FeedRow } from './feed'

const row = (kind: string, id: string, createdAt: string): FeedRow => ({ kind, id, createdAt, data: {} })

describe('mergeFeedPages', () => {
  it('junta as fontes do mais novo para o mais antigo e corta no limite', () => {
    const memorials = [row('memorial', 'm3', '2024-03-03T00:00:00Z'), row('memorial', 'm1', '2024-03-01T00:00:00Z')]
    const tributes = [row('tribute', 't2', '2024-03-02T00:00:00Z'), row('tribute', 't0', '2024-02-28T00:00:00Z')]
    const page = mergeFeedPages([memorials, tributes], 2)
    expect(page.rows.map((r) => r.id)).toEqual(['m3', 't2'])
    expect(page.nextCursor).toBe('2024-03-02T00:00:00Z')
  })

  it('sem fonte cheia e com menos itens que o limite, o feed acabou', () => {
    const page = mergeFeedPages([[row('memorial', 'm1', '2024-01-01T00:00:00Z')], []], 10)
    expect(page.rows).toHaveLength(1)
    expect(page.nextCursor).toBeNull()
  })

  it('se uma fonte encheu a página, ainda pode haver mais', () => {
    const full = [row('memorial', 'a', '2024-01-02T00:00:00Z'), row('memorial', 'b', '2024-01-01T00:00:00Z')]
    const page = mergeFeedPages([full, []], 2)
    expect(page.rows).toHaveLength(2)
    expect(page.nextCursor).toBe('2024-01-01T00:00:00Z')
  })

  it('não perde itens do mesmo instante que ficariam fora da página', () => {
    const t = '2024-01-01T00:00:00Z'
    const page = mergeFeedPages([[row('memorial', 'a', t)], [row('tribute', 'b', t)]], 1)
    expect(page.rows.map((r) => r.id).sort()).toEqual(['a', 'b'])
    expect(page.nextCursor).toBe(t)
  })

  it('remove duplicados', () => {
    const r = row('tribute', 't1', '2024-01-01T00:00:00Z')
    expect(mergeFeedPages([[r], [r]], 10).rows).toHaveLength(1)
  })
})

describe('appendRows', () => {
  it('acrescenta sem repetir', () => {
    const a = row('memorial', 'm1', '2024-01-02T00:00:00Z')
    const b = row('memorial', 'm2', '2024-01-01T00:00:00Z')
    expect(appendRows([a], [a, b]).map((r) => r.id)).toEqual(['m1', 'm2'])
  })
})

describe('posts', () => {
  it('memorial vira post de criação + um post por mídia da galeria', () => {
    const posts = memorialToPosts(
      {
        id: 'm1',
        name: 'Maria',
        type: 'person',
        createdBy: 'u1',
        createdAt: '2024-01-01T00:00:00Z',
        gallery: [{ url: 'https://x/a.jpg', type: 'image' }, { url: 'https://x/b.mp4', type: 'video' }],
      },
      'Ana'
    )
    expect(posts.map((p) => p.postKey)).toEqual(['memorial:m1', 'gallery:https://x/a.jpg', 'gallery:https://x/b.mp4'])
    expect(posts[2].content.video).toBe('https://x/b.mp4')
    expect(posts[0].author.name).toBe('Ana')
  })

  it('homenagem usa o memorial embutido no cabeçalho', () => {
    const [post] = tributeToPosts({
      id: 't1',
      memorialId: 'm1',
      author: { id: 'u2', name: 'João' },
      content: 'Saudade',
      type: 'Saudade',
      createdAt: '2024-01-01T00:00:00Z',
      memorial: { id: 'm1', name: 'Maria', photo: '', type: 'person' },
    })
    expect(post.postKey).toBe('tribute:t1')
    expect(post.memorial.name).toBe('Maria')
    expect(post.author.name).toBe('João')
  })
})
