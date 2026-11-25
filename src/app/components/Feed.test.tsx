import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me' }, userMetadata: {} }),
}))

import { Feed } from './Feed'

const memorials = [
  { id: 'm1', name: 'Maria', photo: '', type: 'person', createdBy: 'me', createdAt: '2024-01-01T00:00:00Z', gallery: [] },
]

describe('<Feed /> publicações', () => {
  it('mostra a publicação com foto e legenda do memorial', () => {
    render(
      <Feed
        memorials={memorials}
        tributes={[]}
        posts={[
          {
            id: 'p1',
            memorialId: 'm1',
            authorId: 'u2',
            authorName: 'João',
            caption: 'Aniversário de 80 anos',
            media: [{ url: 'https://x/1.jpg', type: 'image' }],
            createdAt: '2024-05-01T12:00:00Z',
          },
        ]}
        onSelectMemorial={vi.fn()}
        onCreate={vi.fn()}
        onProfile={vi.fn()}
        onOpenMenu={vi.fn()}
      />,
    )
    expect(screen.getByText('Aniversário de 80 anos')).toBeInTheDocument()
    expect(screen.getByAltText('Aniversário de 80 anos')).toHaveAttribute('src', 'https://x/1.jpg')
    expect(screen.getByText('João')).toBeInTheDocument()
  })

  it('ignora publicação de memorial que não está no feed', () => {
    render(
      <Feed
        memorials={memorials}
        tributes={[]}
        posts={[
          {
            id: 'p2',
            memorialId: 'outro',
            authorId: 'u2',
            authorName: 'João',
            caption: 'Não deveria aparecer',
            media: [{ url: 'https://x/2.jpg', type: 'image' }],
            createdAt: '2024-05-01T12:00:00Z',
          },
        ]}
        onSelectMemorial={vi.fn()}
        onCreate={vi.fn()}
        onProfile={vi.fn()}
        onOpenMenu={vi.fn()}
      />,
    )
    expect(screen.queryByText('Não deveria aparecer')).not.toBeInTheDocument()
  })
})
