import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemorialDetail } from './MemorialDetail'

const memorial = {
  id: 'm1',
  name: 'Maria',
  photo: '',
  cover: '',
  birthDate: '1950-01-01',
  deathDate: '2020-01-01',
  gallery: [],
  createdAt: '2024-01-01T00:00:00Z',
}
const tributes = [
  { id: 't1', memorialId: 'm1', author: { id: 'u2', name: 'João' }, content: 'Saudade', date: '2024-02-01' },
]

function renderDetail(extra: Record<string, unknown> = {}) {
  const props = {
    memorial,
    tributes,
    onBack: vi.fn(),
    onViewLivingMemory: vi.fn(),
    onWriteTribute: vi.fn(),
    onToggleReaction: vi.fn(),
    onAddComment: vi.fn().mockResolvedValue(undefined),
    onLightCandle: vi.fn(),
    onToggleFollow: vi.fn(),
    canInteract: true,
    ...extra,
  }
  render(<MemorialDetail {...(props as any)} />)
  return props
}

describe('<MemorialDetail /> interações', () => {
  it('mostra o número real de seguidores (não mais 142 fixo)', () => {
    renderDetail({ follow: { count: 3, isFollowing: true } })
    expect(screen.queryByText('142')).not.toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Seguindo/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('Seguir chama onToggleFollow', async () => {
    const props = renderDetail()
    await userEvent.click(screen.getByRole('button', { name: /Seguir/ }))
    expect(props.onToggleFollow).toHaveBeenCalled()
  })

  it('mostra os contadores de reação salvos e envia a reação com a chave da homenagem', async () => {
    const props = renderDetail({
      interactions: {
        reactions: { 'tribute:t1': { amen: 2, love: 5, mine: { amen: false, love: true } } },
        comments: {},
      },
    })
    const love = screen.getByRole('button', { name: /Amor/ })
    expect(love).toHaveTextContent('5')
    expect(love).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /Amém/ }))
    expect(props.onToggleReaction).toHaveBeenCalledWith('m1', 'tribute:t1', 'amen')
  })

  it('comentário é enviado para o post certo', async () => {
    const props = renderDetail()
    await userEvent.click(screen.getByRole('button', { name: 'Comentar' }))
    await userEvent.type(screen.getByLabelText('Escreva um comentário'), 'Que saudade{Enter}')
    expect(props.onAddComment).toHaveBeenCalledWith('m1', 'tribute:t1', 'Que saudade')
  })

  it('vela: botão acende uma vez e fica desativado depois', async () => {
    const props = renderDetail({ candles: { count: 7, litByMe: false } })
    await userEvent.click(screen.getByRole('button', { name: 'Acender vela' }))
    expect(props.onLightCandle).toHaveBeenCalled()
  })

  it('vela já acesa: botão desativado', () => {
    renderDetail({ candles: { count: 7, litByMe: true } })
    expect(screen.getByRole('button', { name: 'Você já acendeu uma vela' })).toBeDisabled()
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})

describe('<MemorialDetail /> publicações com foto e legenda', () => {
  const post = {
    id: 'p1',
    memorialId: 'm1',
    authorId: 'u2',
    authorName: 'João',
    caption: 'Natal de 1998',
    media: [
      { url: 'https://x/1.jpg', type: 'image' as const },
      { url: 'https://x/2.jpg', type: 'image' as const },
    ],
    createdAt: '2024-03-01T12:00:00Z',
  }

  it('mostra a publicação com legenda e carrossel, e reage com a chave post:<id>', async () => {
    const props = renderDetail({ posts: [post] })
    await userEvent.click(screen.getByRole('button', { name: 'Ver em lista' }))
    expect(screen.getByText('Natal de 1998')).toBeInTheDocument()
    expect(screen.getByAltText('Natal de 1998 (1 de 2)')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /Amém/ })[0])
    expect(props.onToggleReaction).toHaveBeenCalledWith('m1', 'post:p1', 'amen')
  })

  it('botão "Publicar foto" aparece só para quem pode publicar', async () => {
    const onCreatePost = vi.fn()
    renderDetail({ onCreatePost })
    await userEvent.click(screen.getByRole('button', { name: /Publicar foto/ }))
    expect(onCreatePost).toHaveBeenCalled()
  })

  it('sem onCreatePost (visitante), não mostra o botão', () => {
    renderDetail()
    expect(screen.queryByRole('button', { name: /Publicar foto/ })).not.toBeInTheDocument()
  })

  it('quem não é autor nem dono não vê "Apagar"', () => {
    renderDetail({ posts: [post], currentUserId: 'outra-pessoa', onDeletePost: vi.fn(), focusPostId: 'p1' })
    expect(screen.queryByRole('button', { name: 'Apagar publicação' })).not.toBeInTheDocument()
  })

  it('autor apaga depois de confirmar', async () => {
    const onDeletePost = vi.fn()
    renderDetail({ posts: [post], currentUserId: 'u2', onDeletePost, focusPostId: 'p1' })
    await userEvent.click(screen.getByRole('button', { name: 'Apagar publicação' }))
    expect(onDeletePost).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }))
    expect(onDeletePost).toHaveBeenCalledWith('p1')
  })

  it('dono do memorial também pode apagar (moderação)', () => {
    renderDetail({
      memorial: { ...memorial, createdBy: 'dono' },
      posts: [post],
      currentUserId: 'dono',
      onDeletePost: vi.fn(),
      focusPostId: 'p1',
    })
    expect(screen.getByRole('button', { name: 'Apagar publicação' })).toBeInTheDocument()
  })
})

describe('<MemorialDetail /> grade de fotos', () => {
  const post = {
    id: 'p1',
    memorialId: 'm1',
    authorId: 'u2',
    authorName: 'João',
    caption: 'Natal de 1998',
    media: [
      { url: 'https://x/1.jpg', type: 'image' as const },
      { url: 'https://x/2.jpg', type: 'image' as const },
    ],
    createdAt: '2024-03-01T12:00:00Z',
  }
  const videoPost = {
    ...post,
    id: 'p2',
    caption: '',
    media: [{ url: 'https://x/v.mp4', type: 'video' as const }],
    createdAt: '2024-04-01T12:00:00Z',
  }

  it('com fotos, abre em grade de 3 colunas e mostra só as publicações com mídia', () => {
    renderDetail({ posts: [post, videoPost] })
    expect(screen.getByRole('button', { name: 'Ver em grade' })).toHaveAttribute('aria-pressed', 'true')
    const grid = screen.getByRole('list', { name: 'Publicações em grade' })
    expect(grid).toHaveClass('grid-cols-3')
    expect(screen.getByRole('button', { name: 'Abrir publicação: Natal de 1998' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir publicação de João' })).toBeInTheDocument()
    // a homenagem só de texto não vira quadrado, mas tem atalho para a lista
    expect(screen.queryByText('"Saudade"')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver 1 homenagem escrita' })).toBeInTheDocument()
  })

  it('tocar num quadrado abre a lista e rola até a publicação', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderDetail({ posts: [post, videoPost] })
    await userEvent.click(screen.getByRole('button', { name: 'Abrir publicação: Natal de 1998' }))
    expect(screen.getByRole('button', { name: 'Ver em lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Natal de 1998')).toBeInTheDocument()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toHaveTextContent('Natal de 1998')
  })

  it('vindo do perfil (focusPostId), abre direto na lista', () => {
    renderDetail({ posts: [post], focusPostId: 'p1' })
    expect(screen.getByRole('button', { name: 'Ver em lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Natal de 1998')).toBeInTheDocument()
  })

  it('sem fotos, continua mostrando a lista de homenagens', () => {
    renderDetail()
    expect(screen.getByRole('button', { name: 'Ver em lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('list', { name: 'Publicações em grade' })).not.toBeInTheDocument()
  })
})
