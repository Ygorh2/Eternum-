import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostGrid, gridItemsFromPosts } from './PostGrid'

const posts = [
  { id: 'a', caption: 'Praia', media: [{ url: 'https://x/a.jpg', type: 'image' as const }, { url: 'https://x/b.jpg', type: 'image' as const }] },
  { id: 'b', caption: '', media: [{ url: 'https://x/v.mp4', type: 'video' as const }] },
  { id: 'c', caption: 'sem mídia', media: [] },
]

describe('<PostGrid />', () => {
  it('mostra um quadrado por publicação com mídia e abre ao tocar', async () => {
    const onSelect = vi.fn()
    render(<PostGrid items={gridItemsFromPosts(posts)} onSelect={onSelect} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir publicação: Praia' }))
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('mostra texto quando não há publicações', () => {
    render(<PostGrid items={[]} onSelect={vi.fn()} emptyText="Nada aqui." />)
    expect(screen.getByText('Nada aqui.')).toBeInTheDocument()
  })

  it('"Carregar mais" só aparece quando há mais páginas', async () => {
    const onLoadMore = vi.fn()
    const { rerender } = render(<PostGrid items={gridItemsFromPosts(posts)} onSelect={vi.fn()} onLoadMore={onLoadMore} />)
    expect(screen.queryByRole('button', { name: /Carregar mais/ })).not.toBeInTheDocument()
    rerender(<PostGrid items={gridItemsFromPosts(posts)} onSelect={vi.fn()} onLoadMore={onLoadMore} hasMore />)
    await userEvent.click(screen.getByRole('button', { name: /Carregar mais/ }))
    expect(onLoadMore).toHaveBeenCalled()
  })
})
