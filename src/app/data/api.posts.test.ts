import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso: testes não podem chamar o Supabase real
const state = vi.hoisted(() => ({
  uploaded: [] as string[],
  removed: [] as string[][],
  inserted: [] as any[],
  insertError: null as any,
}))

vi.mock('/utils/supabase/client', () => {
  const storageBucket = {
    upload: vi.fn(async (path: string) => {
      state.uploaded.push(path)
      return { error: null }
    }),
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/memorial-media/${path}` },
    }),
    remove: vi.fn(async (paths: string[]) => {
      state.removed.push(paths)
      return { error: null }
    }),
  }
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) },
      storage: { from: () => storageBucket },
      from: () => ({
        insert(row: any) {
          state.inserted.push(row)
          return {
            select: () => ({
              single: async () =>
                state.insertError
                  ? { data: null, error: state.insertError }
                  : { data: { id: 'p1', created_at: '2024-01-01T00:00:00Z', ...row }, error: null },
            }),
          }
        },
      }),
    },
  }
})

import { createMemorialPost, storagePathFromPublicUrl } from './api'

const photo = () => new File(['x'], 'foto 1.jpg', { type: 'image/jpeg' })
const video = () => new File(['x'], 'v.mp4', { type: 'video/mp4' })

describe('createMemorialPost', () => {
  beforeEach(() => {
    state.uploaded = []
    state.removed = []
    state.inserted = []
    state.insertError = null
  })

  it('envia os arquivos para a pasta do usuário e salva legenda + mídia', async () => {
    const post = await createMemorialPost({ memorialId: 'm1', caption: '  Saudade  ', files: [photo(), video()], authorName: 'Eu' })
    expect(state.uploaded).toHaveLength(2)
    expect(state.uploaded.every((p) => p.startsWith('me/posts/m1/'))).toBe(true)
    expect(state.inserted[0]).toMatchObject({ memorial_id: 'm1', author_id: 'me', caption: 'Saudade' })
    expect(post.media.map((m) => m.type)).toEqual(['image', 'video'])
    expect(post.caption).toBe('Saudade')
  })

  it('apaga os arquivos enviados se salvar a publicação falhar', async () => {
    state.insertError = { code: '42501', message: 'new row violates row-level security policy' }
    await expect(
      createMemorialPost({ memorialId: 'm1', caption: '', files: [photo(), photo()], authorName: 'Eu' }),
    ).rejects.toMatchObject({ code: '42501' })
    expect(state.removed).toEqual([state.uploaded])
  })

  it('recusa publicação sem arquivos', async () => {
    await expect(createMemorialPost({ memorialId: 'm1', caption: 'oi', files: [], authorName: 'Eu' })).rejects.toThrow(
      /pelo menos uma/,
    )
    expect(state.uploaded).toEqual([])
  })
})

describe('storagePathFromPublicUrl', () => {
  it('extrai o caminho do bucket', () => {
    expect(
      storagePathFromPublicUrl('https://proj.supabase.co/storage/v1/object/public/memorial-media/me/posts/m1/a%20b.jpg'),
    ).toBe('me/posts/m1/a b.jpg')
    expect(storagePathFromPublicUrl('https://outro-site.com/a.jpg')).toBeNull()
  })
})
