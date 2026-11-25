import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso: testes não podem chamar o Supabase real
const state = vi.hoisted(() => ({
  uploaded: [] as string[],
  uploadedFiles: [] as File[],
  uploadedTypes: [] as (string | undefined)[],
  removed: [] as string[][],
  inserted: [] as any[],
  insertError: null as any,
}))

vi.mock('/utils/supabase/client', () => {
  const storageBucket = {
    upload: vi.fn(async (path: string, file: File, opts?: { contentType?: string }) => {
      state.uploaded.push(path)
      state.uploadedFiles.push(file)
      state.uploadedTypes.push(opts?.contentType)
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
        delete: () => ({
          eq: () => ({ select: async () => ({ data: [{ id: 'p1' }], error: null }) }),
        }),
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

// Compressão falsa: por padrão devolve o próprio arquivo
const compress = vi.hoisted(() => ({ fn: vi.fn(async (f: File) => f) }))
vi.mock('../utils/imageCompression', () => ({ compressImage: (f: File) => compress.fn(f) }))

import { createMemorialPost, deleteMemorialPost, storagePathFromPublicUrl } from './api'

const photo = () => new File(['x'], 'foto 1.jpg', { type: 'image/jpeg' })
const video = () => new File(['x'], 'v.mp4', { type: 'video/mp4' })

describe('createMemorialPost', () => {
  beforeEach(() => {
    state.uploaded = []
    state.uploadedFiles = []
    state.uploadedTypes = []
    compress.fn.mockReset()
    compress.fn.mockImplementation(async (f: File) => f)
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

  it('comprime as fotos antes de enviar e usa o arquivo comprimido', async () => {
    const small = new File(['y'], 'foto_1.webp', { type: 'image/webp' })
    compress.fn.mockImplementation(async (f: File) => (f.type.startsWith('image/') ? small : f))
    const v = video()
    const post = await createMemorialPost({ memorialId: 'm1', caption: '', files: [photo(), v], authorName: 'Eu' })
    expect(compress.fn).toHaveBeenCalledTimes(2)
    expect(state.uploadedFiles).toEqual([small, v])
    expect(state.uploadedTypes).toEqual(['image/webp', 'video/mp4'])
    expect(state.uploaded[0]).toMatch(/foto_1\.webp$/)
    expect(post.media.map((m) => m.type)).toEqual(['image', 'video'])
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

describe('deleteMemorialPost', () => {
  const base = 'https://proj.supabase.co/storage/v1/object/public/memorial-media/'
  beforeEach(() => {
    state.removed = []
  })

  it('autor apaga também os arquivos da própria pasta de publicações', async () => {
    await deleteMemorialPost({
      id: 'p1',
      memorialId: 'm1',
      authorId: 'me',
      media: [
        { url: `${base}me/posts/m1/a.jpg`, type: 'image' },
        { url: `${base}me/memorials/capa.jpg`, type: 'image' },
      ],
    })
    expect(state.removed).toEqual([['me/posts/m1/a.jpg']])
  })

  it('dono do memorial apagando publicação de outra pessoa NÃO apaga arquivos', async () => {
    await deleteMemorialPost({
      id: 'p1',
      memorialId: 'm1',
      authorId: 'atacante',
      media: [{ url: `${base}me/memorials/capa.jpg`, type: 'image' }],
    })
    expect(state.removed).toEqual([])
  })
})
