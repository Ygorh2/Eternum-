import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { compressImage, fitWithin, renameForType, shouldCompress } from './imageCompression'

describe('fitWithin', () => {
  it('reduz mantendo a proporção, com o maior lado no limite', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('nunca aumenta uma foto pequena', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })
})

describe('shouldCompress', () => {
  it('comprime fotos comuns, mas não GIF, SVG nem vídeo', () => {
    expect(shouldCompress({ type: 'image/jpeg' })).toBe(true)
    expect(shouldCompress({ type: 'image/png' })).toBe(true)
    expect(shouldCompress({ type: 'image/heic' })).toBe(true)
    expect(shouldCompress({ type: 'image/gif' })).toBe(false)
    expect(shouldCompress({ type: 'image/svg+xml' })).toBe(false)
    expect(shouldCompress({ type: 'video/mp4' })).toBe(false)
  })
})

describe('renameForType', () => {
  it('troca a extensão pelo novo formato', () => {
    expect(renameForType('IMG_0001.HEIC', 'image/webp')).toBe('IMG_0001.webp')
    expect(renameForType('vovó.png', 'image/jpeg')).toBe('vovó.jpg')
    expect(renameForType('sem-extensao', 'image/webp')).toBe('sem-extensao.webp')
  })
})

describe('compressImage', () => {
  // jsdom não desenha imagens: simulamos o decodificador e o canvas
  let drawn: { width: number; height: number } | null
  let outputType: string
  let outputSize: number
  let bitmapOptions: unknown

  beforeEach(() => {
    drawn = null
    outputType = 'image/webp'
    outputSize = 1000
    bitmapOptions = undefined
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async (_file: Blob, opts: unknown) => {
        bitmapOptions = opts
        return { width: 4000, height: 3000, close: vi.fn() }
      }),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
      const canvas = this
      return {
        drawImage: () => {
          drawn = { width: canvas.width, height: canvas.height }
        },
        fillRect: () => {},
      } as any
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb, type) {
      // Navegador sem WebP devolve PNG ao pedir WebP
      const t = type === 'image/webp' ? outputType : (type as string)
      cb(new Blob([new Uint8Array(outputSize)], { type: t }))
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const bigPhoto = () => new File([new Uint8Array(5000)], 'foto.jpg', { type: 'image/jpeg', lastModified: 123 })

  it('reduz para 1600px, gera WebP menor e respeita a rotação da câmera', async () => {
    const out = await compressImage(bigPhoto())
    expect(drawn).toEqual({ width: 1600, height: 1200 })
    expect(bitmapOptions).toEqual({ imageOrientation: 'from-image' })
    expect(out.type).toBe('image/webp')
    expect(out.name).toBe('foto.webp')
    expect(out.size).toBe(1000)
    expect(out.lastModified).toBe(123)
  })

  it('usa JPEG quando o navegador não gera WebP', async () => {
    outputType = 'image/png'
    const out = await compressImage(bigPhoto())
    expect(out.type).toBe('image/jpeg')
    expect(out.name).toBe('foto.jpg')
  })

  it('mantém o original se o resultado não ficar menor', async () => {
    outputSize = 6000
    const original = bigPhoto()
    expect(await compressImage(original)).toBe(original)
  })

  it('mantém o original se não conseguir abrir a imagem', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('formato não suportado'))))
    const original = bigPhoto()
    expect(await compressImage(original)).toBe(original)
  })

  it('não mexe em vídeos nem GIFs', async () => {
    const video = new File(['x'], 'v.mp4', { type: 'video/mp4' })
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })
    expect(await compressImage(video)).toBe(video)
    expect(await compressImage(gif)).toBe(gif)
    expect(createImageBitmap).not.toHaveBeenCalled()
  })
})
