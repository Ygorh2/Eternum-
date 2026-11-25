import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase falso: testes não podem chamar o Supabase real
const PUB = 'https://proj.supabase.co/storage/v1/object/public/memorial-media/'
const state = vi.hoisted(() => ({
  rows: [] as any[],
  signCalls: [] as string[][],
  signFails: false,
  denied: new Set<string>(),
  updatedRow: null as any,
  sessionUser: 'u1' as string | null,
}))

vi.mock('/utils/supabase/client', () => {
  const bucket = {
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/memorial-media/${path}` },
    }),
    createSignedUrls: vi.fn(async (paths: string[]) => {
      state.signCalls.push(paths)
      if (state.signFails) return { data: null, error: new Error('falhou') }
      return {
        data: paths.map((path) =>
          state.denied.has(path)
            ? { path, signedUrl: null, error: 'Either the object does not exist or you do not have access' }
            : {
                path,
                signedUrl: `https://proj.supabase.co/storage/v1/object/sign/memorial-media/${path}?token=t`,
                error: null,
              },
        ),
        error: null,
      }
    }),
  }
  const builder: any = {
    select: () => builder,
    order: () => Promise.resolve({ data: state.rows, error: null }),
    update: (row: any) => ((state.updatedRow = row), builder),
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: { id: 'm1', created_by: 'u1', ...state.updatedRow }, error: null }),
  }
  return {
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
        getSession: async () => ({
          data: { session: state.sessionUser ? { user: { id: state.sessionUser } } : null },
        }),
      },
      storage: { from: () => bucket },
      from: () => builder,
    },
  }
})

import { fetchMemorials, updateMemorial } from './api'
import { clearSignedUrlCache } from '../utils/mediaUrls'

const memorialRow = (id: string, extra: any = {}) => ({
  id,
  name: 'Maria',
  created_by: 'u1',
  access_group: 'family',
  photo: `${PUB}u1/profile/${id}.jpg`,
  cover: 'https://images.unsplash.com/capa',
  gallery: [{ url: `${PUB}u1/gallery/${id}.jpg`, type: 'image' }],
  ...extra,
})

describe('links temporários das fotos', () => {
  beforeEach(() => {
    clearSignedUrlCache()
    state.rows = []
    state.signCalls = []
    state.signFails = false
    state.denied = new Set()
    state.updatedRow = null
    state.sessionUser = 'u1'
  })

  it('troca foto e galeria do bucket por links assinados, sem mexer em links externos', async () => {
    state.rows = [memorialRow('m1')]
    const [m] = await fetchMemorials()
    expect(m.photo).toBe('https://proj.supabase.co/storage/v1/object/sign/memorial-media/u1/profile/m1.jpg?token=t')
    expect(m.gallery[0].url).toContain('/object/sign/memorial-media/u1/gallery/m1.jpg')
    expect(m.cover).toBe('https://images.unsplash.com/capa')
    expect(state.signCalls).toEqual([['u1/profile/m1.jpg', 'u1/gallery/m1.jpg']])
  })

  it('usa o cache na segunda vez (mesmo link para o navegador)', async () => {
    state.rows = [memorialRow('m1')]
    const [a] = await fetchMemorials()
    const [b] = await fetchMemorials()
    expect(b.photo).toBe(a.photo)
    expect(state.signCalls).toHaveLength(1)
  })

  it('não reaproveita links de outra conta', async () => {
    state.rows = [memorialRow('m1')]
    await fetchMemorials()
    state.sessionUser = null
    await fetchMemorials()
    expect(state.signCalls).toHaveLength(2)
  })

  it('se o Supabase recusar um arquivo, mantém o link original', async () => {
    state.rows = [memorialRow('m1')]
    state.denied = new Set(['u1/profile/m1.jpg'])
    const [m] = await fetchMemorials()
    expect(m.photo).toBe(`${PUB}u1/profile/m1.jpg`)
    expect(m.gallery[0].url).toContain('/object/sign/')
  })

  it('se gerar os links falhar, o app continua com os links originais', async () => {
    state.rows = [memorialRow('m1')]
    state.signFails = true
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const [m] = await fetchMemorials()
    expect(m.photo).toBe(`${PUB}u1/profile/m1.jpg`)
  })

  it('nunca grava link temporário no banco ao editar', async () => {
    await updateMemorial('m1', {
      photo: 'https://proj.supabase.co/storage/v1/object/sign/memorial-media/u1/profile/nova.jpg?token=t',
    })
    expect(state.updatedRow.photo).toBe(`${PUB}u1/profile/nova.jpg`)
  })
})
