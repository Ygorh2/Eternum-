import { describe, it, expect } from 'vitest'
import { validateMediaFiles, mediaKindOf } from './mediaValidation'

const MB = 1024 * 1024
const f = (name: string, type: string, sizeMB = 1) => ({ name, type, size: sizeMB * MB })

describe('validateMediaFiles', () => {
  it('aceita fotos e vídeos dentro do limite', () => {
    const { valid, rejected } = validateMediaFiles([f('a.jpg', 'image/jpeg'), f('b.mp4', 'video/mp4', 20)])
    expect(valid.map((x) => x.name)).toEqual(['a.jpg', 'b.mp4'])
    expect(rejected).toEqual([])
  })

  it('um arquivo inválido não descarta os válidos', () => {
    const { valid, rejected } = validateMediaFiles([
      f('a.jpg', 'image/jpeg'),
      f('doc.pdf', 'application/pdf'),
      f('c.png', 'image/png'),
    ])
    expect(valid.map((x) => x.name)).toEqual(['a.jpg', 'c.png'])
    expect(rejected).toHaveLength(1)
    expect(rejected[0].name).toBe('doc.pdf')
    expect(rejected[0].reason).toMatch(/formato/)
  })

  it('recusa foto acima de 10 MB e vídeo acima de 50 MB', () => {
    const { valid, rejected } = validateMediaFiles([
      f('grande.jpg', 'image/jpeg', 11),
      f('longo.mp4', 'video/mp4', 51),
      f('ok.mp4', 'video/mp4', 49),
    ])
    expect(valid.map((x) => x.name)).toEqual(['ok.mp4'])
    expect(rejected.map((r) => r.reason)).toEqual([
      expect.stringMatching(/10 MB/),
      expect.stringMatching(/50 MB/),
    ])
  })

  it('respeita o tipo aceito', () => {
    const { valid, rejected } = validateMediaFiles([f('a.jpg', 'image/jpeg'), f('b.mp4', 'video/mp4')], {
      accept: 'image',
    })
    expect(valid.map((x) => x.name)).toEqual(['a.jpg'])
    expect(rejected[0].reason).toMatch(/só fotos/)
  })

  it('aceita só o que cabe e avisa sobre o resto', () => {
    const { valid, rejected } = validateMediaFiles(
      [f('1.jpg', 'image/jpeg'), f('2.jpg', 'image/jpeg'), f('3.jpg', 'image/jpeg')],
      { remainingSlots: 2 }
    )
    expect(valid).toHaveLength(2)
    expect(rejected).toEqual([{ name: '3.jpg', reason: 'limite de arquivos atingido' }])
  })
})

describe('mediaKindOf', () => {
  it('identifica imagem, vídeo e outros', () => {
    expect(mediaKindOf({ type: 'image/heic' })).toBe('image')
    expect(mediaKindOf({ type: 'video/quicktime' })).toBe('video')
    expect(mediaKindOf({ type: '' })).toBeNull()
  })
})
