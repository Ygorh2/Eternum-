import { describe, it, expect, beforeEach } from 'vitest'
import {
  SIGNED_URL_TTL_SECONDS,
  clearSignedUrlCache,
  getCachedSignedUrl,
  mediaPathFromUrl,
  setCachedSignedUrl,
  toStoredMediaUrl,
} from './mediaUrls'

const PUB = 'https://proj.supabase.co/storage/v1/object/public/memorial-media/'
const SIGN = 'https://proj.supabase.co/storage/v1/object/sign/memorial-media/'
const publicUrlFor = (path: string) => `${PUB}${path}`

describe('mediaPathFromUrl', () => {
  it('lê o caminho de links públicos e assinados', () => {
    expect(mediaPathFromUrl(`${PUB}u1/profile/a.jpg`)).toBe('u1/profile/a.jpg')
    expect(mediaPathFromUrl(`${SIGN}u1/profile/a.jpg?token=abc`)).toBe('u1/profile/a.jpg')
    expect(mediaPathFromUrl(`${PUB}u1/a%20b.jpg`)).toBe('u1/a b.jpg')
  })

  it('ignora links de fora do bucket', () => {
    expect(mediaPathFromUrl('https://images.unsplash.com/photo-1')).toBeNull()
    expect(mediaPathFromUrl('https://proj.supabase.co/storage/v1/object/public/outro-bucket/a.jpg')).toBeNull()
    expect(mediaPathFromUrl('')).toBeNull()
    expect(mediaPathFromUrl(undefined)).toBeNull()
  })
})

describe('toStoredMediaUrl', () => {
  it('converte link assinado de volta para o link estável', () => {
    expect(toStoredMediaUrl(`${SIGN}u1/cover/c.jpg?token=xyz`, publicUrlFor)).toBe(`${PUB}u1/cover/c.jpg`)
  })

  it('mantém links públicos, externos e vazios', () => {
    expect(toStoredMediaUrl(`${PUB}u1/cover/c.jpg`, publicUrlFor)).toBe(`${PUB}u1/cover/c.jpg`)
    expect(toStoredMediaUrl('https://exemplo.com/a.jpg', publicUrlFor)).toBe('https://exemplo.com/a.jpg')
    expect(toStoredMediaUrl('', publicUrlFor)).toBe('')
    expect(toStoredMediaUrl(null, publicUrlFor)).toBeNull()
  })
})

describe('cache de links temporários', () => {
  beforeEach(() => clearSignedUrlCache())

  it('não reaproveita o link de outra pessoa logada', () => {
    setCachedSignedUrl('userA', 'a/p.jpg', 'https://signed/1', 0)
    expect(getCachedSignedUrl('userA', 'a/p.jpg', 1000)).toBe('https://signed/1')
    expect(getCachedSignedUrl('anon', 'a/p.jpg', 1000)).toBeNull()
  })

  it('descarta links perto de expirar', () => {
    setCachedSignedUrl('userA', 'a/p.jpg', 'https://signed/1', 0)
    const quaseNoFim = SIGNED_URL_TTL_SECONDS * 1000 - 10 * 60 * 1000
    expect(getCachedSignedUrl('userA', 'a/p.jpg', quaseNoFim)).toBeNull()
  })
})
