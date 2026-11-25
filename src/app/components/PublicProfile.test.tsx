import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../data/api', () => ({
  fetchProfile: vi.fn(async () => ({ displayName: 'Ana', username: 'ana' })),
  fetchProfileStats: vi.fn(async () => ({ tributesCount: 0, candlesCount: 0, followersCount: 2, followingCount: 1 })),
  isFollowingUser: vi.fn(async () => false),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}))

import { PublicProfile } from './PublicProfile'

const post = {
  id: 'p1',
  memorialId: 'm1',
  authorId: 'ana',
  authorName: '',
  caption: 'Aniversário do vovô',
  media: [{ url: 'https://x/1.jpg', type: 'image' as const }],
  createdAt: '2024-01-01T00:00:00Z',
}

describe('<PublicProfile /> grade de fotos', () => {
  it('mostra as publicações em grade e abre a escolhida', async () => {
    const onOpenPost = vi.fn()
    render(
      <PublicProfile
        userId="ana"
        currentUserId="eu"
        memorials={[]}
        onBack={vi.fn()}
        onSelectMemorial={vi.fn()}
        posts={[post]}
        onOpenPost={onOpenPost}
      />,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir publicação: Aniversário do vovô' }))
    expect(onOpenPost).toHaveBeenCalledWith('p1')
  })

  it('sem publicações, mostra aviso', async () => {
    render(
      <PublicProfile userId="ana" currentUserId="eu" memorials={[]} onBack={vi.fn()} onSelectMemorial={vi.fn()} onOpenPost={vi.fn()} />,
    )
    expect(await screen.findByText('Nenhuma publicação ainda.')).toBeInTheDocument()
  })
})
