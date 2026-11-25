import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostComments } from './PostComments'

const comment = {
  id: 'c1',
  postKey: 'tribute:t1',
  memorialId: 'm1',
  userId: 'u1',
  authorName: 'Ana',
  content: 'Saudades eternas',
  createdAt: '2026-11-25T10:00:00Z',
}

describe('<PostComments />', () => {
  it('mostra os comentários salvos', () => {
    render(<PostComments comments={[comment]} showInput={false} canComment onSubmit={vi.fn()} />)
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Saudades eternas')).toBeInTheDocument()
  })

  it('envia o texto e limpa o campo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PostComments comments={[]} showInput canComment onSubmit={onSubmit} />)
    const input = screen.getByLabelText('Escreva um comentário')
    await userEvent.type(input, '  Descanse em paz  ')
    await userEvent.click(screen.getByLabelText('Enviar comentário'))
    expect(onSubmit).toHaveBeenCalledWith('Descanse em paz')
    expect(input).toHaveValue('')
  })

  it('mostra o erro e mantém o texto se não conseguir salvar', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Falhou'))
    render(<PostComments comments={[]} showInput canComment onSubmit={onSubmit} />)
    const input = screen.getByLabelText('Escreva um comentário')
    await userEvent.type(input, 'Oi{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou')
    expect(input).toHaveValue('Oi')
  })

  it('bloqueia palavras ofensivas sem chamar o servidor', async () => {
    const onSubmit = vi.fn()
    render(<PostComments comments={[]} showInput canComment onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Escreva um comentário'), 'que idiota{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('política de respeito')
  })

  it('visitante vê o aviso em vez do campo', () => {
    render(<PostComments comments={[]} showInput canComment={false} onSubmit={vi.fn()} />)
    expect(screen.queryByLabelText('Escreva um comentário')).not.toBeInTheDocument()
    expect(screen.getByText('Entre com sua conta para comentar.')).toBeInTheDocument()
  })

  describe('apagar comentário', () => {
    it('não mostra o botão para quem não pode apagar', () => {
      render(
        <PostComments comments={[comment]} showInput={false} canComment onSubmit={vi.fn()} onDelete={vi.fn()} canDelete={() => false} />,
      )
      expect(screen.queryByLabelText(/apagar comentário/i)).not.toBeInTheDocument()
    })

    it('pede confirmação e apaga', async () => {
      const onDelete = vi.fn().mockResolvedValue(undefined)
      render(
        <PostComments comments={[comment]} showInput={false} canComment onSubmit={vi.fn()} onDelete={onDelete} canDelete={() => true} />,
      )
      await userEvent.click(screen.getByLabelText('Apagar comentário de Ana'))
      expect(onDelete).not.toHaveBeenCalled()
      await userEvent.click(screen.getByRole('button', { name: 'Apagar' }))
      expect(onDelete).toHaveBeenCalledWith(comment)
    })

    it('cancelar não apaga', async () => {
      const onDelete = vi.fn()
      render(
        <PostComments comments={[comment]} showInput={false} canComment onSubmit={vi.fn()} onDelete={onDelete} canDelete={() => true} />,
      )
      await userEvent.click(screen.getByLabelText('Apagar comentário de Ana'))
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
      expect(onDelete).not.toHaveBeenCalled()
      expect(screen.getByLabelText('Apagar comentário de Ana')).toBeInTheDocument()
    })

    it('mostra o erro se não conseguir apagar', async () => {
      const onDelete = vi.fn().mockRejectedValue(new Error('Sem permissão'))
      render(
        <PostComments comments={[comment]} showInput={false} canComment onSubmit={vi.fn()} onDelete={onDelete} canDelete={() => true} />,
      )
      await userEvent.click(screen.getByLabelText('Apagar comentário de Ana'))
      await userEvent.click(screen.getByRole('button', { name: 'Apagar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão')
      expect(screen.getByText('Saudades eternas')).toBeInTheDocument()
    })
  })
})

describe('<PostComments /> — denunciar', () => {
  it('mostra "Denunciar" só nos comentários que a pessoa pode denunciar', async () => {
    const onReport = vi.fn()
    const mine = { ...comment, id: 'c2', userId: 'me', authorName: 'Eu' }
    render(
      <PostComments
        comments={[comment, mine]}
        showInput={false}
        canComment
        onSubmit={vi.fn()}
        onReport={onReport}
        canReport={(c) => c.userId !== 'me'}
      />
    )
    expect(screen.queryByLabelText('Denunciar comentário de Eu')).not.toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Denunciar comentário de Ana'))
    expect(onReport).toHaveBeenCalledWith(comment)
  })
})
