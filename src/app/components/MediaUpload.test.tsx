import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MediaUpload } from './MediaUpload'

const MB = 1024 * 1024

function makeFile(name: string, type: string, sizeMB = 1) {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: sizeMB * MB })
  return file
}

function pick(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files } })
}

beforeAll(() => {
  // jsdom não implementa URL.createObjectURL
  ;(URL as any).createObjectURL ??= vi.fn(() => 'blob:preview')
  ;(URL as any).revokeObjectURL ??= vi.fn()
})

describe('<MediaUpload />', () => {
  it('mantém as fotos válidas quando um dos arquivos é inválido', () => {
    const onMediaChange = vi.fn()
    render(<MediaUpload onMediaChange={onMediaChange} accept="image" />)

    pick([makeFile('a.jpg', 'image/jpeg'), makeFile('b.mp4', 'video/mp4'), makeFile('c.png', 'image/png')])

    expect(onMediaChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: 'a.jpg' }),
      expect.objectContaining({ name: 'c.png' }),
    ])
    expect(screen.getByRole('alert')).toHaveTextContent('b.mp4')
  })

  it('recusa arquivo grande demais e avisa o motivo', () => {
    const onMediaChange = vi.fn()
    render(<MediaUpload onMediaChange={onMediaChange} maxImageSizeMB={5} />)

    pick([makeFile('enorme.jpg', 'image/jpeg', 6), makeFile('ok.jpg', 'image/jpeg', 1)])

    expect(onMediaChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'ok.jpg' })])
    expect(screen.getByRole('alert')).toHaveTextContent(/enorme\.jpg.*5 MB/)
  })

  it('aceita até o máximo e avisa sobre o excedente (sem alert do navegador)', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const onMediaChange = vi.fn()
    render(<MediaUpload onMediaChange={onMediaChange} maxFiles={2} />)

    pick([makeFile('1.jpg', 'image/jpeg'), makeFile('2.jpg', 'image/jpeg'), makeFile('3.jpg', 'image/jpeg')])

    expect(alertSpy).not.toHaveBeenCalled()
    expect(onMediaChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ name: '1.jpg' }),
      expect.objectContaining({ name: '2.jpg' }),
    ])
    expect(screen.getByRole('alert')).toHaveTextContent('3.jpg')
  })

  it('remove um arquivo escolhido', () => {
    const onMediaChange = vi.fn()
    render(<MediaUpload onMediaChange={onMediaChange} />)
    pick([makeFile('1.jpg', 'image/jpeg'), makeFile('2.jpg', 'image/jpeg')])

    fireEvent.click(screen.getAllByRole('button', { name: /Remover/ })[0])

    expect(onMediaChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: '2.jpg' })])
  })
})
