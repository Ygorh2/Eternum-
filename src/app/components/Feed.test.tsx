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
