import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreatePost } from './CreatePost'

beforeAll(() => {
  ;(URL as any).createObjectURL ??= vi.fn(() => 'blob:preview')
  ;(URL as any).revokeObjectURL ??= vi.fn()
})

function pick(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files } })
}

describe('<CreatePost />', () => {
  it('só deixa publicar depois de escolher uma foto ou vídeo', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined)
    render(<CreatePost memorialName="Maria" onCancel={vi.fn()} onPublish={onPublish} />)
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeDisabled()

    const photo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    pick([photo])
    await userEvent.type(screen.getByLabelText('Legenda'), 'Domingo na praia')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(onPublish).toHaveBeenCalledWith('Domingo na praia', [photo])
  })

  it('mostra o erro e permite tentar de novo se o envio falhar', async () => {
    const onPublish = vi.fn().mockRejectedValue(new Error('Sem conexão'))
    render(<CreatePost memorialName="Maria" onCancel={vi.fn()} onPublish={onPublish} />)
    pick([new File(['x'], 'foto.jpg', { type: 'image/jpeg' })])
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText('Sem conexão')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })
})
