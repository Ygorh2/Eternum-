import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

// Testes não podem chamar o Supabase real
vi.mock('./data/api', () => ({
  fetchPostInteractions: vi.fn().mockResolvedValue({ reactions: {}, comments: {} }),
  fetchProfilesByIds: vi.fn().mockResolvedValue({ u1: 'Ana' }),
  fetchFollowingScope: vi.fn().mockResolvedValue({ userIds: ['me'], memorialIds: [] }),
  fetchFeedMemorialsPage: vi.fn(),
  fetchFeedTributesPage: vi.fn(),
}))

let appContext: any
vi.mock('./Layout', () => ({ useApp: () => appContext }))
vi.mock('./contexts/AuthContext', () => ({ useAuth: () => ({ user: null, userMetadata: null }) }))

import * as api from './data/api'
import { ConnectedFeed } from './ConnectedComponents'

const memorial = (n: number) => ({
  id: `m${n}`,
  name: `Memorial ${n}`,
  type: 'person',
  createdBy: 'u1',
  // m1 é o mais novo
  createdAt: new Date(Date.UTC(2024, 0, 30 - n)).toISOString(),
  gallery: [],
})

function renderFeed() {
  return render(
    <MemoryRouter>
      <ConnectedFeed />
    </MemoryRouter>,
  )
}

describe('<ConnectedFeed /> paginado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appContext = { memorials: [], user: { id: 'me', name: 'Eu', isGuest: false }, setIsMenuOpen: vi.fn() }
    // 15 memoriais no banco; a api devolve só os pedidos (limit + cursor)
    const all = Array.from({ length: 15 }, (_, i) => memorial(i + 1))
    vi.mocked(api.fetchFeedMemorialsPage).mockImplementation(async (q: any) =>
      all.filter((m) => !q.before || m.createdAt < q.before).slice(0, q.limit) as any,
    )
    vi.mocked(api.fetchFeedTributesPage).mockResolvedValue([])
  })

  it('carrega 10 por vez e busca a próxima página só quando pedida', async () => {
    renderFeed()
    expect(await screen.findByText('Memorial 1')).toBeInTheDocument()
    expect(screen.getByText('Memorial 10')).toBeInTheDocument()
    expect(screen.queryByText('Memorial 11')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Carregar mais' }))
    expect(await screen.findByText('Memorial 15')).toBeInTheDocument()
    expect(screen.getByText(/chegou ao fim do feed/)).toBeInTheDocument()
    const second = vi.mocked(api.fetchFeedMemorialsPage).mock.calls[1][0]
    expect(second.before).toBe(memorial(10).createdAt)
  })

  it('começa na aba Seguindo com quem o usuário segue, e Explorar não filtra', async () => {
    renderFeed()
    await screen.findByText('Memorial 1')
    expect(api.fetchFollowingScope).toHaveBeenCalledWith('me')
    expect(vi.mocked(api.fetchFeedMemorialsPage).mock.calls[0][0]).toMatchObject({
      scope: 'following',
      following: { userIds: ['me'], memorialIds: [] },
    })

    await userEvent.click(screen.getByRole('tab', { name: 'Explorar' }))
    await waitFor(() =>
      expect(vi.mocked(api.fetchFeedMemorialsPage).mock.lastCall?.[0]).toMatchObject({ scope: 'explore' }),
    )
  })

  it('visitante vai direto para Explorar', async () => {
    appContext.user = { id: 'guest', isGuest: true }
    renderFeed()
    await screen.findByText('Memorial 1')
    expect(api.fetchFollowingScope).not.toHaveBeenCalled()
    expect(vi.mocked(api.fetchFeedMemorialsPage).mock.calls[0][0].scope).toBe('explore')
  })

  it('mostra o nome real do autor do memorial', async () => {
    renderFeed()
    await screen.findByText('Memorial 1')
    await waitFor(() => expect(api.fetchProfilesByIds).toHaveBeenCalledWith(['u1']))
  })
})
