import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, userMetadata: null }) }))

import { Feed } from './Feed'
import type { FeedPost } from '../utils/feed'

const post = (id: string, name = 'Maria'): FeedPost => ({
  id,
  postKey: `tribute:${id}`,
  sourceType: 'tribute',
  memorial: { id: 'm1', name, photo: '', type: 'person' },
  content: { message: `Mensagem ${id}` },
  author: { name: 'João' },
  createdAt: '2024-01-01T00:00:00Z',
})

function renderFeed(extra: Record<string, unknown> = {}) {
  const props = {
    memorials: [],
    posts: [post('t1')],
    scope: 'following',
    onScopeChange: vi.fn(),
    typeFilter: 'all',
    onTypeFilterChange: vi.fn(),
    onLoadMore: vi.fn(),
    onSelectMemorial: vi.fn(),
    onCreate: vi.fn(),
    onProfile: vi.fn(),
    onOpenMenu: vi.fn(),
    ...extra,
  }
  render(<Feed {...(props as any)} />)
  return props
}

describe('<Feed /> paginado', () => {
  it('mostra as abas Seguindo e Explorar e troca de aba', async () => {
    const props = renderFeed()
    expect(screen.getByRole('tab', { name: 'Seguindo' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('tab', { name: 'Explorar' }))
    expect(props.onScopeChange).toHaveBeenCalledWith('explore')
  })

  it('visitante não vê a aba Seguindo', () => {
    renderFeed({ canUseFollowing: false, scope: 'explore' })
    expect(screen.queryByRole('tab', { name: 'Seguindo' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Explorar' })).toHaveAttribute('aria-selected', 'true')
  })

  it('"Carregar mais" pede a próxima página quando há mais posts', async () => {
    const props = renderFeed({ hasMore: true })
    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    expect(props.onLoadMore).toHaveBeenCalled()
  })

  it('mostra o fim do feed quando não há mais páginas', () => {
    renderFeed({ hasMore: false })
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument()
    expect(screen.getByText(/chegou ao fim do feed/)).toBeInTheDocument()
  })

  it('aba Seguindo vazia sugere explorar', async () => {
    const props = renderFeed({ posts: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Explorar memoriais' }))
    expect(props.onScopeChange).toHaveBeenCalledWith('explore')
  })

  it('filtro Pets é enviado para quem carrega o feed', async () => {
    const props = renderFeed()
    await userEvent.click(screen.getByRole('button', { name: 'Pets' }))
    expect(props.onTypeFilterChange).toHaveBeenCalledWith('pet')
  })

  it('erro ao carregar mostra "Tentar de novo"', async () => {
    const onRetry = vi.fn()
    renderFeed({ feedError: 'Não foi possível carregar mais posts.', onRetry, hasMore: true })
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('mostra o carregamento da primeira página', () => {
    renderFeed({ posts: [], loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Carregando o feed')
    expect(screen.queryByText('Nenhum post ainda')).not.toBeInTheDocument()
  })
})

describe('<Feed /> publicações', () => {
  it('mostra a publicação com foto e legenda do memorial', () => {
    renderFeed({
      posts: [
        {
          id: 'post-p1',
          postKey: 'post:p1',
          sourceType: 'memorial_post',
          memorial: { id: 'm1', name: 'Maria', photo: '', type: 'person' },
          content: { message: 'Aniversário de 80 anos', media: [{ url: 'https://x/1.jpg', type: 'image' }] },
          author: { name: 'João' },
          createdAt: '2024-05-01T12:00:00Z',
        },
      ],
    })
    expect(screen.getByText('Aniversário de 80 anos')).toBeInTheDocument()
    expect(screen.getByAltText('Aniversário de 80 anos')).toHaveAttribute('src', 'https://x/1.jpg')
    expect(screen.getByText('João')).toBeInTheDocument()
  })
})

describe('<Feed /> sininho de notificações', () => {
  it('mostra o número de não lidas e abre a tela', async () => {
    const onOpenNotifications = vi.fn()
    renderFeed({ unreadNotifications: 3, onOpenNotifications })
    const bell = screen.getByRole('button', { name: 'Notificações: 3 não lidas' })
    expect(bell).toHaveTextContent('3')
    await userEvent.click(bell)
    expect(onOpenNotifications).toHaveBeenCalled()
  })

  it('visitante não vê o sininho', () => {
    renderFeed()
    expect(screen.queryByRole('button', { name: /Notificações/ })).not.toBeInTheDocument()
  })
})
